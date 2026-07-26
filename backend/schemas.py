from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class UserCreate(BaseModel):
    username: str
    password: str
    role: Optional[str] = "consultant"


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


# 资源相关响应模型
class ResourceOut(BaseModel):
    id: int
    name: str
    path: str
    category: str
    grade: Optional[str] = None
    subject: Optional[str] = None
    course_type: Optional[str] = None
    semester: Optional[str] = None
    teacher: Optional[str] = None
    file_size: Optional[float] = None
    mime_type: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ResourceListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[ResourceOut]


# 收藏相关
class FavoriteCreate(BaseModel):
    resource_id: int


class FavoriteOut(BaseModel):
    id: int
    user_id: int
    resource_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
