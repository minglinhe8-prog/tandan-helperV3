from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from pathlib import Path
from database import get_db
from models import Resource, User
from schemas import ResourceOut, ResourceListResponse
from auth_utils import get_current_user, decode_access_token

router = APIRouter(prefix="/api/resources", tags=["resources"])

PROJECT_ROOT = Path("I:/desk/tandan-helper-master")


# 支持 token query param 的认证依赖
def auth_optional(
    request: Request,
    db: Session = Depends(get_db)
):
    # 从 query param 或 header 获取 token
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        t = auth[len("Bearer "):]
    else:
        t = request.query_params.get("token", "")
    if not t:
        raise HTTPException(401, "未提供 token")
    payload = decode_access_token(t)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(401, "无效 token")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    return user


@router.get("/", response_model=ResourceListResponse)
def list_resources(
    category: Optional[str] = None,
    grade: Optional[str] = None,
    subject: Optional[str] = None,
    course_type: Optional[str] = None,
    semester: Optional[str] = None,
    teacher: Optional[str] = None,
    keyword: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    按分类独立筛选：
    - 课表: 只受 grade 约束
    - 优惠价格: 只受 grade 约束
    - 老师介绍: 只受 subject + teacher 约束
    - 政策: 不受任何约束（总是全部返回）
    - 课程大纲: 受 grade + subject + course_type + semester 约束
    """
    # 预处理参数
    grades = [g.strip() for g in grade.split(",") if g.strip()] if grade else []
    subjects = [s.strip() for s in subject.split(",") if s.strip()] if subject else []

    # 需要查询的分类列表
    CATEGORIES = ["课表", "优惠价格", "老师介绍", "政策", "课程大纲"]
    target_categories = [category] if category else CATEGORIES

    all_items = []

    for cat in target_categories:
        query = db.query(Resource).filter(Resource.category == cat)

        if cat == "课表" or cat == "优惠价格":
            # 只受年级约束
            if grades:
                query = query.filter(Resource.grade.in_(grades))

        elif cat == "老师介绍":
            # 只受科目 + 教师姓名约束
            if subjects:
                query = query.filter(Resource.subject.in_(subjects))
            if teacher:
                query = query.filter(Resource.teacher.contains(teacher))

        elif cat == "政策":
            # 不受任何约束，全部返回
            pass

        elif cat == "课程大纲":
            # 受年级 + 科目 + 课程类型 + 学期约束
            if grades:
                query = query.filter(Resource.grade.in_(grades))
            if subjects:
                query = query.filter(Resource.subject.in_(subjects))
            if course_type:
                query = query.filter(Resource.course_type == course_type)
            if semester:
                query = query.filter(Resource.semester == semester)

        # 所有分类都支持关键词模糊搜索
        if keyword:
            query = query.filter(Resource.name.contains(keyword))

        all_items.extend(query.all())

    # 排序 + 分页
    all_items.sort(key=lambda r: r.created_at or "1970", reverse=True)
    total = len(all_items)
    start = (page - 1) * size
    items = all_items[start:start + size]

    return {
        "total": total,
        "page": page,
        "size": size,
        "items": items
    }


@router.get("/{resource_id}", response_model=ResourceOut)
def get_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取单个资源详情，需要登录。"""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="资源不存在")
    return resource


# MIME 类型映射
MIME_MAP = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
}


@router.get("/{resource_id}/preview")
def preview_resource(
    resource_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """文件预览：本地优先，否则服务端代理 GitHub Raw。无需登录（Office Online 需要公开 URL）"""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="资源不存在")

    file_path = PROJECT_ROOT / resource.path
    ext = Path(resource.path).suffix.lower()
    media_type = MIME_MAP.get(ext, 'application/octet-stream')

    # 本地文件存在 → 直接返回
    if file_path.exists():
        return FileResponse(path=str(file_path), media_type=media_type,
            headers={"Content-Disposition": "inline", "Cache-Control": "private, max-age=3600"})

    # 不存在 → 服务端代理 GitHub Raw（避免浏览器跨域重定向 blob 丢失）
    GITHUB_RAW = "https://raw.githubusercontent.com/minglinhe8-prog/tandan-helperV3/main"
    import requests as req
    try:
        r = req.get(f"{GITHUB_RAW}/{resource.path}", timeout=15)
        if r.status_code == 200:
            from fastapi.responses import Response
            return Response(content=r.content, media_type=media_type,
                headers={"Content-Disposition": "inline", "Cache-Control": "public, max-age=3600"})
    except Exception as e:
        print(f"GitHub proxy failed: {e}")
    raise HTTPException(status_code=404, detail="文件不存在")
