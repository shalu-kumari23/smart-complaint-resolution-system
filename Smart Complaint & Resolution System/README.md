# AI-Powered Smart Complaint & Resolution System

An intelligent municipal/corporate grievance management platform. Citizens file complaints, and an AI service automatically runs natural language categorization, priority scaling, sentiment analysis, resolution ETA predictions, duplicate checks (via scikit-learn cosine text embeddings), and drafts response emails. Officials resolve issues, and administrators oversee metrics, map overlays, audit logs, and routing overrides.

---

## 👥 User Roles & Portals

1. **Citizen User**:
   - Register, login, and profile tracking.
   - Submit complaints with automated location-based mapping.
   - View complaint lifecycle timelines.
   - Read automated AI analysis (urgency scores, resolution dates, recommended drafts).
   - View notification alerts and submit 1-5 star reviews with comments after resolution.

2. **Department Officer**:
   - Queue tracking for tickets matching their specific department (Roads, Electricity, Water, Sanitation, Drainage).
   - In-place filters for statuses (Assigned, In Progress, Resolved).
   - Details view to log progress notes and attach completion assets.
   - Update statuses to transition tickets to `IN_PROGRESS` or `RESOLVED`.

3. **Super Administrator**:
   - Global metrics dashboard (Open vs. Resolved ticket numbers, Average SLA times).
   - Recharts visual logs (monthly trends, priority distributions, category splits).
   - React Leaflet dynamic map overlays with color-coded complaint category markers.
   - Trigger manual department overrides, select officers, and retry failed AI evaluations.
   - Register new municipal departments and view the system-wide Audit activity trail.

---

## 🏗️ Monorepo Architecture

```
smart-complaint-resolution/
│
├── frontend/                 # React.js + Vite Web Application
│   ├── src/
│   │   ├── components/       # Shared layout components
│   │   ├── context/          # Auth context state and localStorage sync
│   │   ├── pages/            # Landing, Login, User/Officer/Admin Portals
│   │   ├── services/         # Axios backend api client
│   │   ├── App.jsx           # Protected routes and navigation tree
│   │   ├── index.css         # Styling, custom colors and glassmorphism classes
│   │   └── main.jsx          # DOM rendering entrypoint
│   ├── package.json
│   └── .env.example
│
├── backend/                  # Node.js + Express.js Main API Server
│   ├── config/               # Mongoose DB connections helper
│   ├── middleware/           # Role-based JWT verification layers
│   ├── models/               # MongoDB models (User, Complaint, AuditLog, etc.)
│   ├── routes/               # API endpoints (auth, complaints, departments, admin)
│   ├── services/             # Axios connector client to Python AI FastAPI
│   ├── utils/                # Seeding scripts for realistic data setups
│   ├── tests/                # Jest + Supertest backend integration tests
│   ├── server.js             # Express bootstrapping
│   ├── package.json
│   └── .env.example
│
├── ai-service/               # Python FastAPI AI Analytics Service
│   ├── app/
│   │   ├── ml/               # Text parsing & TF-IDF Cosine duplicate detectors
│   │   ├── llm/              # Gemini summarizer & local rule summaries
│   │   ├── main.py           # FastAPI routes (/health, /analyze, /classify, etc.)
│   │   ├── config.py         # Settings verification
│   │   └── database.py       # Safe MongoDB connection index builders
│   ├── requirements.txt
│   └── .env.example
│
└── README.md
```

---

## ⚡ Tech Stack

- **Frontend**: React (v18), Vite, React Router DOM, Axios, Bootstrap 5, Recharts, React Leaflet, Lucide icons.
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, BcryptJS, CORS, Helmet, Express Rate Limit.
- **AI Service**: Python 3.10+, FastAPI, Pydantic, Scikit-Learn, Pymongo, Gemini API.

---

## 🚀 Installation & Running the System

You will need **three terminals** to run the services concurrently. Make sure MongoDB is running locally at `mongodb://localhost:27017`.

### Terminal 1: Backend Server (Node.js)
```bash
cd backend
npm install
# Seed the database first with Admin, Officers, and 30+ complaints
node utils/seed.js
# Start development server on Port 5000
npm run dev
```

### Terminal 2: AI Service (Python FastAPI)
```bash
cd ai-service
# Create virtual environment
python -m venv venv
# Activate virtual environment (Windows)
.\venv\Scripts\activate
# Install requirements
pip install -r requirements.txt
# Start FastAPI server on Port 8000
uvicorn app.main:app --reload --port 8000
```

### Terminal 3: Frontend Web App (React)
```bash
cd frontend
npm install
# Start Vite development server on Port 5173
npm run dev
```

---

## 🛡️ Test Credentials

Login using the following predefined accounts on the `/login` route:

- **Super Admin**:
  - Email: `admin@civic.gov`
  - Password: `admin123`
- **Department Officers**:
  - Roads Officer: `roads_officer@civic.gov` (Password: `officer123`)
  - Electricity Officer: `elec_officer@civic.gov` (Password: `officer123`)
  - Water Officer: `water_officer@civic.gov` (Password: `officer123`)
  - Sanitation Officer: `san_officer@civic.gov` (Password: `officer123`)
  - Drainage Officer: `drain_officer@civic.gov` (Password: `officer123`)
- **Citizen Users**:
  - User 1: `user1@gmail.com` (Password: `user123`)
  - User 2: `user2@gmail.com` (Password: `user123`)

---

## 📖 API Endpoints

### Node.js Backend API (Port 5000)
- `POST /api/auth/register` - Create citizen/officer accounts.
- `POST /api/auth/login` - Authenticate accounts and obtain JWT.
- `GET /api/auth/me` - Profile context verification.
- `POST /api/complaints` - File complaint (routes text through FastAPI AI).
- `GET /api/complaints/my` - Citizen's complaint dashboard list.
- `GET /api/complaints/officer` - Officer's department queue list.
- `GET /api/complaints/:id` - Detailed ticket tracking.
- `PUT /api/complaints/:id/status` - Officer progress & resolution logs.
- `PUT /api/complaints/:id/assign` - Admin department manual override routing.
- `PUT /api/complaints/:id/retry-ai` - Re-evaluate complaint using AI.
- `POST /api/complaints/:id/feedback` - User rating reviews.
- `DELETE /api/complaints/:id` - Inappropriate content moderation.
- `GET /api/admin/dashboard` - Recharts aggregates & KPI cards.
- `GET /api/admin/audit-logs` - System-wide audit trails.

### FastAPI AI Service API (Port 8000)
- `GET /health` - API connectivity check.
- `POST /classify` - Auto-department categorizations.
- `POST /priority` - Priority mappings and scores.
- `POST /sentiment` - Sentiment values and urgency grades.
- `POST /duplicate-check` - TF-IDF cosine matching check.
- `POST /resolution-prediction` - Hours to complete estimation.
- `POST /analyze` - Consolidates all AI steps into one payload.
