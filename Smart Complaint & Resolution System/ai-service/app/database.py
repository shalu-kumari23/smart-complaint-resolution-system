from pymongo import MongoClient
from .config import settings

client = None
db = None

def get_database():
    global client, db

    if db is None:
        try:
            client = MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
            db = client[settings.MONGO_DB_NAME]
            # Try to ping the database to verify it's active
            client.admin.command('ping')
            
            # Create indexes safely
            db["complaints"].create_index("category")
            db["complaints"].create_index("status")
            db["complaints"].create_index("priority")
            db["complaints"].create_index("createdAt")
        except Exception as e:
            print("⚠️ Warning: Could not connect to MongoDB from AI Service:", str(e))
            db = None
            client = None

    return db
