from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from routers import auth, resources, favorites, history, admin, upload, calculator
from database import engine, Base

app = FastAPI(title="谈单助手 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(resources.router)
app.include_router(favorites.router)
app.include_router(history.router)
app.include_router(admin.router)
app.include_router(upload.router)
app.include_router(calculator.router)

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def on_startup():
    """自动创建表并初始化默认数据（PostgreSQL 兼容）"""
    Base.metadata.create_all(bind=engine)
    # 兼容老数据库：补齐新加列
    try:
        from sqlalchemy import text
        from database import engine as _engine
        with _engine.connect() as conn:
            for ddl in [
                "ALTER TABLE resources ADD COLUMN IF NOT EXISTS supabase_url TEXT",
                "CREATE TABLE IF NOT EXISTS calculator_config (key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TIMESTAMP, updated_by INTEGER)"
            ]:
                try: conn.execute(text(ddl)); conn.commit()
                except Exception as e: print(f"DDL skip: {ddl} — {e}")
    except Exception as e:
        print(f"⚠️ Schema migration 失败: {e}")
    try:
        from sqlalchemy.orm import Session
        from models import User
        from auth_utils import get_password_hash
        from database import SessionLocal
        db: Session = SessionLocal()
        if not db.query(User).filter(User.username == "testuser").first():
            db.add(User(username="testuser", hashed_password=get_password_hash("123456"), role="admin", is_active=True))
            db.commit()
            print("🔧 已创建默认管理员 testuser/123456")
        db.close()
    except Exception as e:
        print(f"⚠️ 初始化默认用户失败: {e}")

# 静态文件服务（同时兼容本地和 Render 部署）
BASE_DIR = Path(__file__).parent.parent
static_dir = BASE_DIR / "static"
if not static_dir.exists():
    static_dir = BASE_DIR / "frontend" / "dist"

if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

    # SPA fallback: 非 /api/* 路径返回 index.html
    from fastapi.responses import FileResponse
    from fastapi import Request
    from fastapi.responses import JSONResponse

    @app.exception_handler(404)
    async def spa_fallback(request: Request, exc):
        path = request.url.path
        if path.startswith("/api/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        index_file = static_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
else:
    print("⚠️ 静态文件目录不存在")
