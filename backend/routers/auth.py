from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserLogin, Token, UserOut
from auth_utils import get_password_hash, verify_password, create_access_token, get_current_user as get_current_user_from_auth

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # 检查用户名是否存在
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="用户名已存在")

    hashed_pwd = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        hashed_password=hashed_pwd,
        role=user.role or "consultant"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # 生成 token
    access_token = create_access_token(data={"sub": str(db_user.id), "role": db_user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def get_current_user_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_auth)
):
    return current_user
