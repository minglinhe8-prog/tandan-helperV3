from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Resource, Favorite, User
from schemas import ResourceOut
from auth_utils import get_current_user

router = APIRouter(prefix="/api/favorites", tags=["favorites"])

@router.get("/", response_model=List[ResourceOut])
def list_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取当前用户的所有收藏资源"""
    favs = db.query(Favorite).filter(Favorite.user_id == current_user.id).all()
    resource_ids = [fav.resource_id for fav in favs]
    if not resource_ids:
        return []
    resources = db.query(Resource).filter(Resource.id.in_(resource_ids)).all()
    # 保持顺序一致
    id_to_resource = {r.id: r for r in resources}
    return [id_to_resource[rid] for rid in resource_ids if rid in id_to_resource]

@router.post("/{resource_id}", status_code=201)
def add_favorite(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """收藏一个资源"""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="资源不存在")
    existing = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.resource_id == resource_id
    ).first()
    if existing:
        return {"message": "已收藏"}
    fav = Favorite(user_id=current_user.id, resource_id=resource_id)
    db.add(fav)
    db.commit()
    return {"message": "收藏成功"}

@router.delete("/{resource_id}")
def remove_favorite(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取消收藏"""
    fav = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.resource_id == resource_id
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="未收藏该资源")
    db.delete(fav)
    db.commit()
    return {"message": "已取消收藏"}
