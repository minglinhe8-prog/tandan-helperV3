from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from database import get_db
from models import Resource, History, User
from schemas import ResourceOut
from auth_utils import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("/", response_model=List[ResourceOut])
def list_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取当前用户的浏览历史（最近20条）"""
    histories = db.query(History).filter(
        History.user_id == current_user.id
    ).order_by(History.viewed_at.desc()).limit(20).all()
    resource_ids = [h.resource_id for h in histories]
    if not resource_ids:
        return []
    resources = db.query(Resource).filter(Resource.id.in_(resource_ids)).all()
    id_to_resource = {r.id: r for r in resources}
    return [id_to_resource[rid] for rid in resource_ids if rid in id_to_resource]

@router.post("/{resource_id}")
def add_history(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """记录浏览（若已存在则更新时间）"""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="资源不存在")
    existing = db.query(History).filter(
        History.user_id == current_user.id,
        History.resource_id == resource_id
    ).first()
    if existing:
        existing.viewed_at = datetime.now(timezone.utc)
    else:
        history = History(user_id=current_user.id, resource_id=resource_id)
        db.add(history)
    db.commit()
    return {"message": "记录成功"}

@router.delete("/")
def clear_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """清空当前用户的浏览历史"""
    db.query(History).filter(History.user_id == current_user.id).delete()
    db.commit()
    return {"message": "已清空"}
