from pymongo import MongoClient

from .config import settings

client = None
db = None


def get_database():
    global client, db

    if db is None:
        client = MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)
        db = client[settings.MONGO_DB_NAME]
        db["admins"].create_index("mail_id", unique=True)
        db["admins"].create_index("user_id", unique=True)
        db["users"].create_index("email", unique=True)
        db["users"].create_index("username", unique=True)
        db["departments"].create_index("name", unique=True)

    return db
