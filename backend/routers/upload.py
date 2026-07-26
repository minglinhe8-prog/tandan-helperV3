from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import shutil
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List
from database import get_db
from models import Resource, User
from auth_utils import get_current_admin_user

router = APIRouter(prefix="/api/upload", tags=["upload"])

BASE_DIR = Path("I:/desk/tandan-helper-master")
COURSE_DATA_DIR = BASE_DIR / "course_data"

CATEGORY_MAP = {
    "课表": "课表", "课程大纲": "课程大纲", "老师介绍": "老师介绍",
    "政策": "政策", "优惠价格": "优惠价格",
}

SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".pdf", ".ppt", ".pptx", ".xlsx", ".xls"}


def extract_metadata(filename: str, category: str) -> dict:
    meta = {"grade": None, "subject": None, "course_type": None, "semester": None, "teacher": None}

    grades = ["初一", "初二", "初三"]
    for g in grades:
        if g in filename:
            meta["grade"] = g
            break

    subjects = ["博文", "双语", "托管", "实验P", "实验C"]
    for s in subjects:
        if s in filename:
            meta["subject"] = s
            break

    types = ["线上", "线下"]
    for t in types:
        if t in filename:
            meta["course_type"] = t
            break

    semesters = ["暑秋", "寒春"]
    for sem in semesters:
        if sem in filename:
            meta["semester"] = sem
            break

    if category == "老师介绍":
        parts = filename.split("_")
        if len(parts) >= 2:
            teacher_name = parts[1].replace("简介", "").replace(".pdf", "").replace(".png", "").replace(".jpg", "").strip()
            if teacher_name:
                meta["teacher"] = teacher_name

    return meta


def save_and_record(file_obj, filename: str, category: str, meta: dict, db: Session, subdir: str = "") -> dict:
    target_dir = COURSE_DATA_DIR / CATEGORY_MAP[category]
    if subdir:
        target_dir = target_dir / subdir
    target_dir.mkdir(parents=True, exist_ok=True)

    target_path = target_dir / filename
    orig_name = filename
    if target_path.exists():
        name, ext2 = os.path.splitext(filename)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{name}_{timestamp}{ext2}"
        target_path = target_dir / filename

    with target_path.open("wb") as buf:
        shutil.copyfileobj(file_obj, buf)

    rel_path = target_path.relative_to(BASE_DIR).as_posix()
    size_kb = target_path.stat().st_size / 1024
    ext = Path(filename).suffix.lower()

    new = Resource(
        name=orig_name, path=rel_path, category=category,
        grade=meta.get("grade"), subject=meta.get("subject"),
        course_type=meta.get("course_type"), semester=meta.get("semester"),
        teacher=meta.get("teacher"), file_size=size_kb, mime_type=ext,
    )
    db.add(new)
    db.commit()
    db.refresh(new)
    return {"id": new.id, "saved_as": filename, "path": rel_path}


def build_subdir(course_type: str = "", grade: str = "", subject: str = "", semester: str = "") -> str:
    """构建子目录路径，跳过空值"""
    parts = [p for p in [course_type, grade, subject, semester] if p]
    return "/".join(parts) if parts else ""


def _do_upload_file(file: UploadFile, category: str, subdir: str, grade: str, subject: str, course_type: str, semester: str, teacher: str, db: Session):
    ext = Path(file.filename).suffix.lower()  # type: ignore
    if ext not in SUPPORTED_EXTS:
        raise HTTPException(400, f"不支持的类型: {ext}")
    auto = extract_metadata(file.filename, category)  # type: ignore
    meta = {
        "grade": grade or auto["grade"],
        "subject": subject or auto["subject"],
        "course_type": course_type or auto["course_type"],
        "semester": semester or auto["semester"],
        "teacher": teacher or auto["teacher"],
    }
    return save_and_record(file.file, file.filename, category, meta, db, subdir)  # type: ignore


@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    category: str = Form(...),
    grade: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    course_type: Optional[str] = Form(None),
    semester: Optional[str] = Form(None),
    teacher: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    if category not in CATEGORY_MAP:
        raise HTTPException(400, f"不支持的分类: {category}")
    subdir = build_subdir(course_type or "", grade or "", subject or "", semester or "")
    r = _do_upload_file(file, category, subdir, grade or "", subject or "", course_type or "", semester or "", teacher or "", db)
    return {"message": "上传成功", "filename": file.filename, **r, "subdir": subdir or ""}


@router.post("/file-to-dir")
async def upload_file_to_dir(
    file: UploadFile = File(...),
    category: str = Form(...),
    grade: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    course_type: Optional[str] = Form(None),
    semester: Optional[str] = Form(None),
    teacher: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """按目录层级上传：course_data/category/(course_type)/(grade)/(subject)/filename"""
    if category not in CATEGORY_MAP:
        raise HTTPException(400, f"不支持的分类: {category}")
    subdir = build_subdir(course_type or "", grade or "", subject or "", semester or "")
    r = _do_upload_file(file, category, subdir, grade or "", subject or "", course_type or "", semester or "", teacher or "", db)
    return {"message": "上传成功", "filename": file.filename, **r, "subdir": subdir or ""}


@router.post("/files")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    category: str = Form(...),
    grade: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    course_type: Optional[str] = Form(None),
    semester: Optional[str] = Form(None),
    teacher: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    if category not in CATEGORY_MAP:
        raise HTTPException(400, f"不支持的分类: {category}")
    subdir = build_subdir(course_type or "", grade or "", subject or "", semester or "")

    results = []
    for f in files:
        try:
            ext = Path(f.filename).suffix.lower()  # type: ignore
            if ext not in SUPPORTED_EXTS:
                results.append({"filename": f.filename, "status": "error", "message": f"不支持的类型: {ext}"})
                continue
            auto = extract_metadata(f.filename, category)  # type: ignore
            meta = {
                "grade": grade or auto["grade"],
                "subject": subject or auto["subject"],
                "course_type": course_type or auto["course_type"],
                "semester": semester or auto["semester"],
                "teacher": teacher or auto["teacher"],
            }
            r = save_and_record(f.file, f.filename, category, meta, db, subdir)  # type: ignore
            results.append({"filename": f.filename, "status": "success", **r, "metadata": meta, "subdir": subdir})
        except Exception as e:
            results.append({"filename": f.filename, "status": "error", "message": str(e)})

    return {"results": results}
