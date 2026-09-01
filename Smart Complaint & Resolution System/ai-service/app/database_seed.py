from datetime import datetime, timezone
from pymongo.database import Database
from .security import hash_password
from .models.users import user_model

DEFAULT_DEPARTMENTS = [
    {"name": "Water Supply", "description": "Drinking water supply, pipeline leaks, and purification concerns.", "state": "Maharashtra", "city": "Mumbai"},
    {"name": "Electricity", "description": "Power outages, faulty meters, dangerous wiring, and billing issues.", "state": "Maharashtra", "city": "Mumbai"},
    {"name": "Roads", "description": "Potholes, pavement damages, highway maintenance, and construction work.", "state": "Maharashtra", "city": "Mumbai"},
    {"name": "Sanitation", "description": "Garbage disposal, sewage leakage, street cleaning, and hygiene complaints.", "state": "Maharashtra", "city": "Mumbai"},
    {"name": "Healthcare", "description": "Public clinics, hospital sanitation, outbreaks, and health support.", "state": "Maharashtra", "city": "Mumbai"},
    {"name": "Education", "description": "School infrastructure, teacher/student issues, fees, and syllabus queries.", "state": "Maharashtra", "city": "Mumbai"},
    {"name": "Other", "description": "General civic issues and unclassified complaints.", "state": "Maharashtra", "city": "Mumbai"}
]

DEFAULT_OFFICERS = [
    {"username": "water_officer", "email": "water@resolve.ai", "full_name": "Water Officer", "department": "Water Supply"},
    {"username": "power_officer", "email": "power@resolve.ai", "full_name": "Electricity Officer", "department": "Electricity"},
    {"username": "roads_officer", "email": "roads@resolve.ai", "full_name": "Roads Officer", "department": "Roads"},
    {"username": "clean_officer", "email": "clean@resolve.ai", "full_name": "Sanitation Officer", "department": "Sanitation"},
    {"username": "health_officer", "email": "health@resolve.ai", "full_name": "Healthcare Officer", "department": "Healthcare"},
    {"username": "school_officer", "email": "school@resolve.ai", "full_name": "Education Officer", "department": "Education"},
    {"username": "other_officer", "email": "other@resolve.ai", "full_name": "Fallback Officer", "department": "Other"}
]

def seed_database(db: Database):
    """Seed the database with initial admin, departments, and department officers."""
    print("🌱 Starting Database Seeding...")
    now = datetime.now(timezone.utc)

    # 1. Seed Admin
    existing_admin = db["admins"].find_one({})
    if not existing_admin:
        admin_data = {
            "mail_id": "admin@resolve.ai",
            "user_id": "admin",
            "password": hash_password("adminpassword"),
            "created_at": now,
            "updated_at": now
        }
        db["admins"].insert_one(admin_data)
        print("✅ Default admin created: admin@resolve.ai / adminpassword")
    else:
        print("ℹ️ Admin already exists.")

    # 2. Seed Departments
    for dept in DEFAULT_DEPARTMENTS:
        existing_dept = db["departments"].find_one({"name": dept["name"]})
        if not existing_dept:
            dept_record = {
                "name": dept["name"],
                "description": dept["description"],
                "state": dept["state"],
                "city": dept["city"],
                "created_at": now,
                "updated_at": now
            }
            db["departments"].insert_one(dept_record)
            print(f"✅ Department created: {dept['name']}")
        else:
            # Keep description updated
            db["departments"].update_one(
                {"name": dept["name"]},
                {"$set": {"description": dept["description"]}}
            )

    # 3. Seed Department Officers
    for officer in DEFAULT_OFFICERS:
        existing_officer = db["users"].find_one({"username": officer["username"]})
        if not existing_officer:
            officer_payload = {
                "full_name": officer["full_name"],
                "username": officer["username"],
                "email": officer["email"],
                "password": hash_password("officerpassword"),
                "department": officer["department"],
                "role": "department",
                "is_active": True,
                "age": 35,
                "guardian_consent": False,
                "address": {
                    "pin_code": "400001",
                    "county": "Fort",
                    "state": "Maharashtra",
                    "city": "Mumbai"
                },
                "created_at": now
            }
            db["users"].insert_one(officer_payload)
            print(f"✅ Department officer created: {officer['username']} ({officer['department']}) / officerpassword")
        else:
            # Make sure role and department are aligned
            db["users"].update_one(
                {"username": officer["username"]},
                {"$set": {"role": "department", "department": officer["department"]}}
            )
            
    print("🌱 Database Seeding Completed successfully!")
