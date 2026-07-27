from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="consultant")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    favorites = relationship("Favorite", back_populates="user")
    histories = relationship("History", back_populates="user")
    search_histories = relationship("SearchHistory", back_populates="user")

class Resource(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    path = Column(String, unique=True, nullable=False)
    category = Column(String, nullable=False)
    grade = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    course_type = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    teacher = Column(String, nullable=True)
    file_size = Column(Float, nullable=True)
    mime_type = Column(String, nullable=True)
    supabase_url = Column(String, nullable=True)  # Supabase 公开直链（大文件永久存储）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    favorites = relationship("Favorite", back_populates="resource")
    histories = relationship("History", back_populates="resource")

class Favorite(Base):
    __tablename__ = "favorites"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="favorites")
    resource = relationship("Resource", back_populates="favorites")

class History(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    viewed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="histories")
    resource = relationship("Resource", back_populates="histories")

class SearchHistory(Base):
    __tablename__ = "search_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    keywords = Column(Text, nullable=False)
    searched_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="search_histories")


class CalculatorConfig(Base):
    """价格计算器配置 — 存储 data.json 和 rules.json"""
    __tablename__ = "calculator_config"
    key = Column(String, primary_key=True, index=True)  # 'data' 或 'rules'
    payload = Column(Text, nullable=False)  # JSON 字符串
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
