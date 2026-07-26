import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Resource

# ---------- 路径 ----------
BASE_DIR = Path(__file__).parent.parent  # 项目根目录
COURSE_DATA_DIR = BASE_DIR / "course_data"

# ---------- 常量（与 app.py 保持一致） ----------
GRADE_LIST = ["初一", "初二", "初三"]
SUBJECT_LIST = ["博文", "双语", "托管", "实验P", "实验C"]
COURSE_TYPES = ["线上", "线下"]
SEMESTERS = ["暑秋", "寒春"]

# 文件扩展名（图片、PDF、PPT、Excel）
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".bmp"}
PDF_EXTS = {".pdf"}
PPT_EXTS = {".ppt", ".pptx"}
EXCEL_EXTS = {".xlsx", ".xls"}
ALL_EXTS = IMAGE_EXTS | PDF_EXTS | PPT_EXTS | EXCEL_EXTS

# ---------- 工具函数 ----------
def match_any_keywords(text: str, values: list) -> bool:
    if not values:
        return False
    return any(v in text for v in values if v)

def extract_metadata(file_path: Path, rel_path: Path) -> dict:
    """
    根据文件路径和相对路径，提取分类、年级、科目、课程类型、学期、教师等元数据
    """
    name = file_path.name
    # 从 course_data 子目录开始提取元数据，跳过 'course_data' 前缀
    # 例如 rel_path = ('course_data', '课表', '初一_暑秋_线上_课表.png')
    #     => parts = ('课表', '初一_暑秋_线上_课表.png')
    raw_parts = rel_path.parts
    if raw_parts and raw_parts[0] == "course_data":
        parts = raw_parts[1:]
    else:
        parts = raw_parts

    # 1. 分类：取第一级目录名
    category = parts[0] if len(parts) > 0 else "未知"

    # 2. 年级：从文件名或路径中匹配
    grade = None
    for g in GRADE_LIST:
        if g in name or any(g in part for part in parts):
            grade = g
            break

    # 3. 科目：从文件名或路径中匹配
    subject = None
    for s in SUBJECT_LIST:
        if s in name or any(s in part for part in parts):
            subject = s
            break

    # 4. 课程类型：线上/线下（从路径中匹配，或文件名）
    course_type = None
    for ct in COURSE_TYPES:
        if ct in name or any(ct in part for part in parts):
            course_type = ct
            break

    # 5. 学期：暑秋/寒春
    semester = None
    for sem in SEMESTERS:
        if sem in name:
            semester = sem
            break

    # 6. 教师姓名：仅老师介绍分类，从文件名提取
    teacher = None
    if category == "老师介绍":
        # 取第一个下划线后的部分作为教师名，去除"_简介"后缀
        parts_name = name.split("_")
        if len(parts_name) >= 2:
            teacher = parts_name[1].replace("简介", "").replace(".pdf", "").replace(".png", "").strip()
        if not teacher:
            # 尝试从文件名中提取人名（如 "聂维一老师+..."）
            import re
            match = re.search(r'([\u4e00-\u9fa5]{2,4})老师', name)
            if match:
                teacher = match.group(1)

    # 文件大小（KB）
    size_kb = file_path.stat().st_size / 1024 if file_path.exists() else 0

    # MIME 类型（扩展名）
    mime_type = file_path.suffix.lower()

    return {
        "name": name,
        "path": str(rel_path.as_posix()),          # 用正斜杠统一存储
        "category": category,
        "grade": grade,
        "subject": subject,
        "course_type": course_type,
        "semester": semester,
        "teacher": teacher,
        "file_size": size_kb,
        "mime_type": mime_type,
    }

def scan_and_migrate():
    db: Session = SessionLocal()
    total = 0
    inserted = 0
    updated = 0
    skipped = 0

    # 遍历 course_data 下所有文件
    for root, dirs, files in os.walk(COURSE_DATA_DIR):
        root_path = Path(root)
        for file in files:
            file_path = root_path / file
            # 只处理指定扩展名
            if file_path.suffix.lower() not in ALL_EXTS:
                skipped += 1
                continue

            # 计算相对于项目根目录的路径（用于存储）
            rel_path = file_path.relative_to(BASE_DIR)

            # 提取元数据
            meta = extract_metadata(file_path, rel_path)

            # 检查是否已存在（按 path 唯一）
            existing = db.query(Resource).filter(Resource.path == meta["path"]).first()
            if existing:
                # 更新
                for key, value in meta.items():
                    setattr(existing, key, value)
                existing.updated_at = datetime.now(timezone.utc)
                updated += 1
            else:
                # 新建
                new_resource = Resource(**meta)
                db.add(new_resource)
                inserted += 1

            total += 1

            # 每 50 条提交一次，避免内存积压
            if total % 50 == 0:
                db.commit()
                print(f"已处理 {total} 个文件...")

    # 最后提交
    db.commit()
    print(f"\n✅ 迁移完成！总文件: {total}, 新增: {inserted}, 更新: {updated}, 跳过(非支持格式): {skipped}")

    # 简单验证
    count = db.query(Resource).count()
    print(f"📊 数据库中现有资源总数: {count}")

    db.close()

if __name__ == "__main__":
    if not COURSE_DATA_DIR.exists():
        print(f"❌ 错误：course_data 目录不存在: {COURSE_DATA_DIR}")
        sys.exit(1)
    scan_and_migrate()
