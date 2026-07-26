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
