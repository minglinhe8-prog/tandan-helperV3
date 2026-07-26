from database import engine, Base
from models import User, Resource, Favorite, History, SearchHistory

def init_database():
    print("创建数据库表...")
    Base.metadata.create_all(bind=engine)
    print("表创建成功！")

if __name__ == "__main__":
    init_database()
