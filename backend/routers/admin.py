from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
from models import User, Resource
from schemas import UserOut, ResourceOut, UserUpdate
from auth_utils import get_current_admin_user, get_password_hash

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ========== 统计仪表盘 ==========
@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    total_users = db.query(User).count()
    total_resources = db.query(Resource).count()
    category_stats = {}
    for cat in ["课表", "课程大纲", "老师介绍", "政策", "优惠价格"]:
        count = db.query(Resource).filter(Resource.category == cat).count()
        if count > 0:
            category_stats[cat] = count
    return {
        "total_users": total_users,
        "total_resources": total_resources,
        "category_stats": category_stats
    }


# ========== 用户管理 ==========
@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    return db.query(User).all()


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    if update_data.role is not None:
        user.role = update_data.role
    if update_data.is_active is not None:
        user.is_active = update_data.is_active
    if update_data.password:
        user.hashed_password = get_password_hash(update_data.password)
    db.commit()
    return {"message": "用户已更新"}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    if user.id == admin.id:
        raise HTTPException(400, "不能删除自己")
    db.delete(user)
    db.commit()
    return {"message": "用户已删除"}


# ========== 资源管理 ==========
@router.get("/resources", response_model=List[ResourceOut])
def list_all_resources(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    return db.query(Resource).all()


@router.put("/resources/{resource_id}")
def update_resource(
    resource_id: int,
    update_data: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(404, "资源不存在")
    for key, value in update_data.items():
        if hasattr(resource, key) and key != "id":
            setattr(resource, key, value)
    resource.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "资源已更新"}


@router.delete("/resources/{resource_id}")
def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(404, "资源不存在")
    db.delete(resource)
    db.commit()
    return {"message": "资源已删除"}


# ========== 种子数据 ==========
@router.post("/seed")
def seed_resources(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """扫描 course_data/ 目录，将所有文件导入数据库"""
    import os, re
    from pathlib import Path as PyPath

    BASE = PyPath("course_data")
    if not BASE.exists():
        return {"error": "course_data 目录不存在"}

    GRADE_LIST = ["初一", "初二", "初三"]
    SUBJECT_LIST = ["博文", "双语", "托管", "实验P", "实验C"]
    ALL_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".pdf", ".ppt", ".pptx", ".xlsx", ".xls"}

    inserted = 0
    skipped_ext = 0
    skipped_dup = 0

    for root, dirs, files in os.walk(BASE):
        root_path = PyPath(root)
        for fname in files:
            fpath = root_path / fname
            ext = fpath.suffix.lower()
            if ext not in ALL_EXTS:
                skipped_ext += 1
                continue

            rel = fpath.as_posix()
            parts = rel.split("/")[1:]  # skip "course_data"
            category = parts[0] if parts else "未知"

            # 元数据提取
            grade = next((g for g in GRADE_LIST if g in fname or any(g in p for p in parts)), None)
            subject = next((s for s in SUBJECT_LIST if s in fname or any(s in p for p in parts)), None)
            course_type = next((ct for ct in ["线上", "线下"] if ct in fname or any(ct in p for p in parts)), None)
            semester = next((sem for sem in ["暑秋", "寒春"] if sem in fname), None)
            teacher = None
            if category == "老师介绍":
                pn = fname.split("_")
                if len(pn) >= 2:
                    teacher = pn[1].replace("简介", "").replace(".pdf", "").replace(".png", "").replace(".jpg", "").strip()
                if not teacher:
                    m = re.search(r'([\u4e00-\u9fa5]{2,4})老师', fname)
                    if m: teacher = m.group(1)

            size_kb = fpath.stat().st_size / 1024

            existing = db.query(Resource).filter(Resource.path == rel).first()
            if existing:
                skipped_dup += 1
                continue

            db.add(Resource(
                name=fname, path=rel, category=category,
                grade=grade, subject=subject, course_type=course_type,
                semester=semester, teacher=teacher,
                file_size=size_kb, mime_type=ext,
            ))
            inserted += 1

    db.commit()
    return {
        "inserted": inserted,
        "skipped_duplicate": skipped_dup,
        "skipped_unsupported_ext": skipped_ext,
        "total_in_db": db.query(Resource).count(),
    }
