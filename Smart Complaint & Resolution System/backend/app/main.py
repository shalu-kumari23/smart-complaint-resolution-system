from pathlib import Path
import sys
from fastapi import FastAPI
from .routers import admin_routes, complaint_routes, dept_routes, user_routes, public_routes

app = FastAPI(title="ResolveAI")


# -------------------------
# ROOT ROUTE (FIRST PAGE)
# -------------------------
@app.get("/")
def home():
    return {"message": "Welcome to ResolveAI 🚀"}


# -------------------------
# ROUTERS
# -------------------------
app.include_router(
    public_routes.router
)

app.include_router(
    complaint_routes.router
)

app.include_router(
    dept_routes.router
)

app.include_router(
    user_routes.router
)

app.include_router(
    admin_routes.router
)
