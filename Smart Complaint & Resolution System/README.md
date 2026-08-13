<div align="center">

<img src="https://img.shields.io/badge/ResolveAI-Complaints%20to%20Resolution-6366f1?style=for-the-badge&logo=sparkles&logoColor=white" alt="ResolveAI Banner" />

# 🛡️ ResolveAI
### *From Complaints to Resolution — Powered by AI*

> An intelligent grievance management platform that transforms how organizations handle complaints — from intelligent intake to automated routing and AI-assisted resolution.

<br/>

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=flat-square&logo=streamlit&logoColor=white)](https://streamlit.io/)
[![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

<br/>

[Features](#-features) • [Architecture](#-architecture) • [Modules](#-modules) • [Quick Start](#-quick-start) • [API Reference](#-api-reference)

</div>

---

## 📌 Overview

**ResolveAI** is a production-grade, AI-powered grievance management system built to streamline the full lifecycle of complaint handling. It replaces manual, error-prone processes with intelligent automation.

### 👥 User Roles & Dashboards
The system features a **unified Streamlit application** with high-contrast, professional UI components and role-based access:

- 👤 **Citizen Dashboard**: Submit complaints with AI-driven priority assessment, track status in real-time, and receive resolution notifications.
- 🏢 **Department Dashboard**: Manage assigned queues, update resolution notes, and track performance metrics.
- 🛡️ **Admin Dashboard**: Full system oversight, department management, user auditing, and advanced analytics.

---

## ✨ Latest Updates (v1.1)

### 🎈 Streamlit Enhancements
- **Enhanced UI/UX**: Custom CSS injection for high-contrast "Dark Mode" metric cards and professional sidebar navigation.
- **Robust Registration**: Implemented `st.form` for atomic user registration with client-side validation (regex for emails, space-checks for usernames).
- **Live Status Updates**: Real-time status badges (Open, In Progress, Resolved) with immediate UI feedback.
- **Improved Connection Handling**: Global API helper with automated error reporting for backend connectivity.

### ⚡ Backend Improvements
- **Expanded API Ecosystem**: Added public `/departments` listing, dedicated `/admin/analytics` endpoints, and robust `/complaints/{id}/track` history.
- **Surgical Updates**: Department officers can now provide resolution notes via atomic `PUT /department/update/{id}` calls.
- **Admin Controls**: New capabilities for complaint reassignment and administrative deletion.
- **Schema Hardening**: Broadened status validation and improved Pydantic models for cross-layer data consistency.

---

## 🏗️ Architecture

```
ResolveAI/
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── routers/       # API endpoints (auth, complaints, admin, dept, public)
│   │   ├── services/      # Core business logic & database interactions
│   │   ├── schemas/       # Pydantic validation models
│   │   ├── models/        # Database document structures
│   │   └── main.py        # Entry point & router registration
│
├── frontend/              # Unified Streamlit application
│   └── streamlit_app.py   # High-performance UI with role-based routing
│
├── ml/                    # Machine Learning module
│   ├── training/          # Model training scripts (urgency, duplicate, routing)
│   ├── inference/         # Prediction logic for live complaints
│   └── evaluation/        # Metrics & performance tracking
│
├── llm/                   # LLM integration module
│   ├── prompts/           # Specialized templates for resolution & summarization
│   └── email_generator.py # Automated notification logic
│
├── infra/                 # Infrastructure & DevOps
│   └── docker-compose.yml # Full-stack orchestration (API + DB + UI)
└── README.md
```

---

## ⚡ Quick Start

### 1. Run with Docker (Recommended)
```bash
cd infra
docker-compose up --build
```
- **Frontend UI**: `http://localhost:8501`
- **FastAPI Docs**: `http://localhost:8000/docs`

### 2. Local Manual Setup
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
pip install -r requirements.txt
streamlit run streamlit_app.py
```

---

## 📖 API Reference (Key Endpoints)

### 🏠 Public
- `GET /departments` — List available departments for registration/submission.

### 🔑 Authentication
- `POST /users/login` — Citizen login.
- `POST /department/login` — Officer login.
- `POST /admin/login` — Administrative login.
- `POST /users/create` — New citizen registration.

### 📋 Complaints
- `POST /complaints/create` — Submit new grievance (Triggers AI analysis).
- `GET /complaints/list` — Personal complaint history.
- `GET /complaints/{id}/track` — Detailed status and history.
- `PUT /department/update/{id}` — Department-level status & resolution update.

### 🛡️ Admin
- `GET /admin/analytics` — Global metrics (Status distribution, resolution times).
- `PUT /admin/complaints/{id}/assign` — Reassign complaint to another department.
- `DELETE /admin/complaints/{id}` — Administrative removal of records.

---

## 🛠️ Tech Stack

- **Frontend**: Streamlit (Custom CSS, Pandas for charts)
- **Backend**: FastAPI (Python 3.10+)
- **Database**: MongoDB (NoSQL)
- **Security**: JWT (OAuth2 Password Bearer)
- **ML/NLP**: Scikit-Learn, MLflow
- **Containerization**: Docker & Docker Compose

---

## 👨‍💻 Author
**Aryan Rahate**
[![GitHub](https://img.shields.io/badge/GitHub-rnrahate-181717?style=flat-square&logo=github)](https://github.com/rnrahate)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-aryan--rahate-0077B5?style=flat-square&logo=linkedin)](https://linkedin.com/in/aryan-rahate)
