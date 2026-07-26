from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, resources, favorites, history, admin, upload

app = FastAPI(title="谈单助手 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router)
app.include_router(resources.router)
app.include_router(favorites.router)
app.include_router(history.router)
app.include_router(admin.router)
app.include_router(upload.router)

@app.get("/")
def root():
    return {"message": "谈单助手 API 已运行"}

@app.get("/api/health")
def health():
    return {"status": "ok"}
