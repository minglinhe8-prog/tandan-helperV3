import os
from datetime import timedelta

# JWT 配置
SECRET_KEY = "your-secret-key-change-in-production"  # 生产环境需用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24小时

# 从环境变量读取（可选）
SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
