from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from routers import auth, resources, favorites, history, admin, upload

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

@app.get("/api/health")
def health():
    return {"status": "ok"}

# 静态文件服务（同时兼容本地和 Render 部署）
BASE_DIR = Path(__file__).parent.parent
static_dir = BASE_DIR / "static"
if not static_dir.exists():
    static_dir = BASE_DIR / "frontend" / "dist"

if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
else:
    print("⚠️ 静态文件目录不存在")
