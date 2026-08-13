from pathlib import Path
import sys

from pymongo import MongoClient
from pymongo.errors import OperationFailure, PyMongoError

if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[3]))
    from backend.app.config import settings
else:
    from ..config import settings


def test_db_connection():
    try:
        client = MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        db = client[settings.MONGO_DB_NAME]

        print("Connected to DB:", db.name)
        print("Collections:", db.list_collection_names())

    except OperationFailure as e:
        print("DB Authentication Failed:", str(e))
        print("Check the Atlas username/password in backend/.env and confirm that user has access to this cluster.")
    except PyMongoError as e:
        print("DB Connection Failed:", str(e))


if __name__ == "__main__":
    test_db_connection()
