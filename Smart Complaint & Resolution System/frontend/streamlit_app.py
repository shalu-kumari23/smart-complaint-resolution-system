import streamlit as st
import requests
import json
import os
from datetime import datetime
from typing import Any

# ── CONFIG ──────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="ResolveAI",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded",
)

try:
    API_BASE = st.secrets.get("API_BASE", "http://localhost:8000")
except Exception:
    API_BASE = "http://localhost:8000"

# ── HELPERS ──────────────────────────────────────────────────────────────────
def api(method, path, token=None, **kwargs):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        r = getattr(requests, method)(f"{API_BASE}{path}", headers=headers, timeout=10, **kwargs)
        return r
    except requests.exceptions.ConnectionError:
        st.error("❌ Cannot connect to backend. Is FastAPI running?")
        return None

def get_token():
    return st.session_state.get("token")

def get_role():
    return st.session_state.get("role")

def logout():
    for k in ["token", "role", "user", "page"]:
        st.session_state.pop(k, None)
    st.rerun()

def status_badge(status):
    colors = {
        "open": "🔴", "in_progress": "🟡", "resolved": "🟢",
        "closed": "⚫", "pending": "🟠"
    }
    return colors.get(status.lower(), "⚪") + f" {status.upper()}"

def priority_badge(p):
    colors = {"high": "🔴", "medium": "🟡", "low": "🟢"}
    return colors.get(str(p).lower(), "⚪") + f" {str(p).upper()}"

# ── CUSTOM CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
[data-testid="stSidebar"] { background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); }
[data-testid="stSidebar"] * { color: #e0e0e0 !important; }
.hero { background: linear-gradient(135deg, #0f3460 0%, #533483 50%, #e94560 100%);
        padding: 3rem 2rem; border-radius: 16px; text-align: center; margin-bottom: 2rem; }
.hero h1 { color: white !important; font-size: 3rem; margin: 0; }
.hero p  { color: rgba(255,255,255,0.85) !important; font-size: 1.2rem; }
.card    { background: #f8f9fa; border-radius: 12px; padding: 1.5rem;
           border-left: 4px solid #0f3460; margin: 0.5rem 0; }
.metric-card { background: #1a1a2e !important; border-radius: 12px; padding: 1rem;
               box-shadow: 0 4px 12px rgba(0,0,0,0.2); text-align: center; 
               color: #e0e0e0 !important; border: 1px solid rgba(255,255,255,0.1); }
.metric-card strong, .metric-card b { color: white !important; }
.metric-card small { color: #ccc !important; }
.tag { display:inline-block; padding: 2px 8px; border-radius:12px;
       font-size:0.75rem; font-weight:600; margin:2px; }
</style>
""", unsafe_allow_html=True)

# ── SESSION DEFAULTS ──────────────────────────────────────────────────────────
if "page" not in st.session_state:
    st.session_state.page = "home"

# ══════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ══════════════════════════════════════════════════════════════════════════════
with st.sidebar:
    st.markdown("## ⚖️ ResolveAI")
    st.markdown("---")
    if get_token():
        st.markdown(f"👤 **{st.session_state.get('user','User')}**")
        st.markdown(f"🏷️ Role: `{get_role()}`")
        st.markdown("---")
        if get_role() == "user":
            pages = {"🏠 Dashboard": "citizen_dash",
                     "📝 Submit Complaint": "submit",
                     "📋 My Complaints": "my_complaints",
                     "🔔 Notifications": "notifications"}
        elif get_role() == "department":
            pages = {"🏠 Dashboard": "dept_dash",
                     "📋 Assigned Complaints": "dept_complaints",
                     "✅ Update Status": "update_status"}
        else:  # admin
            pages = {"🏠 Dashboard": "admin_dash",
                     "👥 Manage Users": "users",
                     "🏢 Departments": "departments",
                     "📊 All Complaints": "all_complaints",
                     "📈 Analytics": "analytics"}
        for label, pg in pages.items():
            if st.button(label, key=f"nav_{pg}", use_container_width=True):
                st.session_state.page = pg
                st.rerun()
        st.markdown("---")
        if st.button("🚪 Logout", use_container_width=True):
            logout()
    else:
        nav_items = {"🏠 Home": "home", "ℹ️ About": "about",
                     "🔑 Login": "login", "📝 Register": "register"}
        for label, pg in nav_items.items():
            if st.button(label, key=f"nav_{pg}", use_container_width=True):
                st.session_state.page = pg
                st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: HOME
# ══════════════════════════════════════════════════════════════════════════════
def page_home():
    st.markdown("""
    <div class="hero">
      <h1>⚖️ ResolveAI</h1>
      <p>AI-Powered Grievance Management · From Complaints to Resolution</p>
    </div>
    """, unsafe_allow_html=True)

    c1, c2, c3, c4 = st.columns(4)
    for col, icon, title, desc in [
        (c1, "🤖", "AI Prioritization", "ML-driven urgency detection"),
        (c2, "🔍", "Duplicate Detection", "Avoid redundant complaints"),
        (c3, "📊", "Live Dashboards", "Real-time tracking"),
        (c4, "🔐", "Role-Based Access", "Citizen · Dept · Admin"),
    ]:
        with col:
            st.markdown(f"""
            <div class="metric-card">
              <div style="font-size:2rem">{icon}</div>
              <strong>{title}</strong><br>
              <small>{desc}</small>
            </div>""", unsafe_allow_html=True)

    st.markdown("---")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown("### 👤 Citizens")
        st.write("Submit & track grievances, get real-time updates.")
        if st.button("Login as Citizen", use_container_width=True):
            st.session_state.page = "login"; st.rerun()
    with col2:
        st.markdown("### 🏢 Departments")
        st.write("Manage assigned complaints and update resolutions.")
        if st.button("Login as Department", use_container_width=True):
            st.session_state.page = "login"; st.rerun()
    with col3:
        st.markdown("### 🛡️ Admin")
        st.write("Full system oversight, analytics and user management.")
        if st.button("Login as Admin", use_container_width=True):
            st.session_state.page = "login"; st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: ABOUT
# ══════════════════════════════════════════════════════════════════════════════
def page_about():
    st.title("ℹ️ About ResolveAI")
    st.markdown("""
    <div class="hero">
      <h1>⚖️ ResolveAI</h1>
      <p>From Complaints to Resolution — Powered by AI</p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    ### 🚀 What is ResolveAI?

    **ResolveAI** is an AI-powered grievance management platform designed to transform how complaints
    are handled — from submission to resolution.

    In many systems today, grievances are often **delayed, misrouted, or duplicated**, leading to
    inefficiencies and frustration. ResolveAI addresses these challenges by combining **intelligent
    automation** with structured workflows.

    Our platform enables users to submit complaints seamlessly while ensuring they are directed to
    the appropriate department. Behind the scenes, machine learning models analyze each grievance
    to **detect urgency, identify duplicates, and assist in prioritization**.

    For departments and administrators, ResolveAI provides a unified dashboard to track, manage,
    and resolve complaints efficiently. Real-time updates and notifications ensure transparency
    and accountability at every stage.
    """)

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("""
        ### 🌍 Our Vision
        To build a **smarter, faster, and more transparent** grievance redressal system that
        enhances trust between citizens and institutions.
        """)
    with col2:
        st.markdown("""
        ### ⚙️ What Makes Us Different
        - 🤖 AI-driven prioritization & duplicate detection
        - 🔐 Role-based dashboards (Citizen · Dept · Admin)
        - 🔔 Real-time tracking and notifications
        - 🏗️ Scalable, production-ready architecture
        """)

    st.markdown("---")
    st.markdown("### 🛠️ Tech Stack")
    c1, c2, c3, c4, c5 = st.columns(5)
    for col, tech, icon in [
        (c1, "FastAPI", "⚡"), (c2, "MongoDB", "🍃"), (c3, "Streamlit", "🎈"),
        (c4, "Docker", "🐳"), (c5, "ML/NLP", "🧠")
    ]:
        with col:
            st.markdown(f"<div class='metric-card'><b>{icon}</b><br>{tech}</div>",
                        unsafe_allow_html=True)

    st.markdown("""
    ---
    > *ResolveAI is more than just a platform — it's a step toward efficient governance powered by intelligent systems.*
    """)

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: LOGIN
# ══════════════════════════════════════════════════════════════════════════════
def page_login():
    st.title("🔑 Login to ResolveAI")
    col, _ = st.columns([1.2, 1])
    with col:
        role = st.selectbox("Login as", ["citizen", "department", "admin"])
        email = st.text_input("Email / Username")
        password = st.text_input("Password", type="password")

        if st.button("🔑 Login", use_container_width=True, type="primary"):
            if not email or not password:
                st.warning("Fill all fields.")
                return
            
            # Map role to correct endpoint
            if role == "admin":
                r = api("post", "/admin/login",
                        json={"mail_id": email if "@" in email else f"{email}@resolve.ai",
                              "user_id": email, "password": password})
            elif role == "department":
                r = api("post", "/department/login",
                        json={"identifier": email, "password": password})
            else: # citizen
                r = api("post", "/users/login",
                        json={"identifier": email, "password": password})

            if r and r.status_code == 200:
                data = r.json()
                st.session_state.token = data.get("access_token")
                
                # Backend returns nested 'user', 'officer', or 'admin'
                if role == "admin":
                    st.session_state.role = "admin"
                    st.session_state.user = data.get("admin", {}).get("user_id", email)
                elif role == "department":
                    st.session_state.role = "department"
                    st.session_state.user = data.get("officer", {}).get("full_name", email)
                else: # user/citizen
                    st.session_state.role = "user"
                    st.session_state.user = data.get("user", {}).get("full_name", email)
                
                # Redirect to dashboard
                if st.session_state.role == "user":
                    st.session_state.page = "citizen_dash"
                else:
                    st.session_state.page = f"{st.session_state.role}_dash"
                    
                st.success("✅ Logged in!")
                st.rerun()
            elif r:
                st.error(f"❌ {r.json().get('detail', 'Login failed')}")

        st.markdown("---")
        if st.button("📝 Register instead"):
            st.session_state.page = "register"; st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: REGISTER
# ══════════════════════════════════════════════════════════════════════════════
def page_register():
    st.title("📝 Register as Citizen")
    col, _ = st.columns([1.2, 1])
    with col:
        with st.form("register_form"):
            name     = st.text_input("Full Name", key="reg_name")
            username = st.text_input("Username", key="reg_user")
            email    = st.text_input("Email", key="reg_email")
            password = st.text_input("Password", type="password", key="reg_pass")
            confirm  = st.text_input("Confirm Password", type="password", key="reg_conf")
            
            col1, col2 = st.columns(2)
            age = col1.number_input("Age", min_value=1, max_value=120, value=18, key="reg_age")
            consent = col2.checkbox("Guardian Consent (if < 18)", key="reg_consent")
            
            st.subheader("📍 Address")
            pin = st.text_input("Pin Code", key="reg_pin")
            city = st.text_input("City", key="reg_city")
            state = st.text_input("State", key="reg_state")
            county = st.text_input("County / Area", key="reg_county")

            submitted = st.form_submit_button("✅ Register", use_container_width=True, type="primary")

        if submitted:
            # Strip all inputs
            fields = {
                "Full Name": name.strip(),
                "Username": username.strip(),
                "Email": email.strip(),
                "Password": password.strip(),
                "Pin Code": pin.strip(),
                "City": city.strip(),
                "State": state.strip(),
                "County / Area": county.strip()
            }
            
            # Check for missing fields
            missing = [label for label, val in fields.items() if not val]
            if missing:
                st.error(f"⚠️ Please fill in: {', '.join(missing)}"); return
            
            # Custom validation: No spaces in username
            if " " in fields["Username"]:
                st.error("❌ Username cannot contain spaces."); return

            # Basic Email Pattern Check
            if "@" not in fields["Email"] or "." not in fields["Email"]:
                st.error("❌ Please enter a valid email address (e.g., name@example.com)"); return
                
            if fields["Password"] != confirm.strip():
                st.error("❌ Passwords don't match."); return
                
            payload = {
                "full_name": fields["Full Name"],
                "username": fields["Username"],
                "email": fields["Email"],
                "password": fields["Password"],
                "age": age,
                "guardian_consent": consent,
                "address": {
                    "pin_code": fields["Pin Code"],
                    "city": fields["City"],
                    "state": fields["State"],
                    "county": fields["County / Area"]
                }
            }
            r = api("post", "/users/create", json=payload)
            if r and r.status_code in (200, 201):
                st.success("✅ Registered! Please login.")
                st.session_state.page = "login"; st.rerun()
            elif r:
                st.error(r.json().get("detail", "Registration failed"))

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: CITIZEN DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
def page_citizen_dash():
    st.title(f"🏠 Welcome, {st.session_state.get('user','Citizen')}!")
    token = get_token()

    r = api("get", "/complaints/list", token=token)
    if r and r.status_code == 200:
        complaints = r.json()
        total = len(complaints)
        open_count = sum(1 for c in complaints if c.get("status") == "open")
        in_progress = sum(1 for c in complaints if c.get("status") == "in_progress")
        resolved = sum(1 for c in complaints if c.get("status") == "resolved")

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("📋 Total", total)
        c2.metric("🔴 Open",  open_count)
        c3.metric("🟡 In Progress", in_progress)
        c4.metric("🟢 Resolved", resolved)
    else:
        st.info("Dashboard stats unavailable. Submit your first complaint!")
        c1, c2, c3, c4 = st.columns(4)
        for c, label in zip([c1,c2,c3,c4],
                            ["📋 Total","🔴 Open","🟡 In Progress","🟢 Resolved"]):
            c.metric(label, "—")

    st.markdown("---")
    col1, col2 = st.columns(2)
    with col1:
        if st.button("📝 Submit New Complaint", use_container_width=True, type="primary"):
            st.session_state.page = "submit"; st.rerun()
    with col2:
        if st.button("📋 View My Complaints", use_container_width=True):
            st.session_state.page = "my_complaints"; st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: SUBMIT COMPLAINT
# ══════════════════════════════════════════════════════════════════════════════
def page_submit():
    st.title("📝 Submit a Complaint")
    token = get_token()

    # Fetch departments for dropdown
    depts = []
    r = api("get", "/departments", token=token)
    if r and r.status_code == 200:
        depts = [d.get("name", d.get("_id", "")) for d in r.json()]
    if not depts:
        depts = ["Water Supply", "Electricity", "Roads", "Sanitation",
                 "Healthcare", "Education", "Other"]

    with st.form("complaint_form"):
        title    = st.text_input("Complaint Title *")
        category = st.selectbox("Category / Department", depts)
        desc     = st.text_area("Description *", height=150)
        location = st.text_input("Location / Address")
        priority = st.selectbox("Self-assessed Priority", ["Low", "Medium", "High"])
        attached = st.file_uploader("Attach evidence (optional)", type=["jpg","png","pdf"])
        submitted = st.form_submit_button("🚀 Submit Complaint", type="primary")

    if submitted:
        if not title or not desc:
            st.warning("Title and description are required.")
            return
        payload = {"text": f"{title} {desc}", "user_selected_department": category}
        r = api("post", "/complaints/create", token=token, json=payload)
        if r and r.status_code in (200, 201):
            data = r.json()
            st.success(f"✅ Complaint submitted! ID: `{data.get('complaint_id', 'N/A')}`")
            ai_priority = data.get("ai_priority")
            if ai_priority:
                st.info(f"🤖 AI assessed priority: **{ai_priority}**")
            duplicate = data.get("is_duplicate")
            if duplicate:
                st.warning("⚠️ Similar complaint detected. Flagged for review.")
        elif r:
            st.error(r.json().get("detail", "Submission failed."))

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: MY COMPLAINTS
# ══════════════════════════════════════════════════════════════════════════════
def page_my_complaints():
    st.title("📋 My Complaints")
    token = get_token()

    col1, col2, col3 = st.columns(3)
    status_filter = col1.selectbox("Filter by Status",
        ["All","open","in_progress","resolved","closed"])
    sort_by = col2.selectbox("Sort by", ["created_at","priority","status"])
    limit   = col3.selectbox("Show", [10, 25, 50])

    params: dict[str, Any] = {"limit": limit, "sort_by": sort_by}
    if status_filter != "All":
        params["status"] = status_filter

    r = api("get", "/complaints/list", token=token, params=params)
    if r and r.status_code == 200:
        complaints = r.json()
        if not complaints:
            st.info("No complaints found.")
            return
        for c in complaints:
            with st.expander(f"{status_badge(c.get('status','open'))}  {c.get('text','Untitled')[:50]}...  —  {c.get('created_at','')[:10]}"):
                col1, col2 = st.columns(2)
                col1.write(f"**ID:** `{c.get('id','')}`")
                col2.write(f"**Dept:** {c.get('department','N/A')}")
                st.write(f"**Complaint:** {c.get('text','')}")
                if c.get("action_taken"):
                    st.success(f"✅ Action taken: {c['action_taken']}")
                # Track button
                if st.button(f"🔍 Track complaint", key=f"track_{c.get('id')}"):
                    cid = c.get("id")
                    tr = api("get", f"/complaints/{cid}/track", token=token)
                    if tr and tr.status_code == 200:
                        st.json(tr.json())
    elif r:
        st.error("Failed to fetch complaints.")

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════
def page_notifications():
    st.title("🔔 Notifications")
    st.info("Notifications feature coming soon!")

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: DEPARTMENT DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
def page_dept_dash():
    st.title(f"🏢 Department Dashboard")
    token = get_token()

    r = api("get", "/department/complaints", token=token)
    if r and r.status_code == 200:
        complaints = r.json()
        assigned = len(complaints)
        pending = sum(1 for c in complaints if c.get("status") == "pending")
        in_progress = sum(1 for c in complaints if c.get("status") == "in_progress")
        resolved = sum(1 for c in complaints if c.get("status") == "resolved")

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("📋 Assigned", assigned)
        c2.metric("⏳ Pending",  pending)
        c3.metric("🔄 In Progress", in_progress)
        c4.metric("✅ Resolved", resolved)
    else:
        st.info("Department stats unavailable.")

    st.markdown("---")
    col1, col2 = st.columns(2)
    with col1:
        if st.button("📋 View Assigned Complaints", use_container_width=True, type="primary"):
            st.session_state.page = "dept_complaints"; st.rerun()
    with col2:
        if st.button("✅ Update Complaint Status", use_container_width=True):
            st.session_state.page = "update_status"; st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: DEPT COMPLAINTS
# ══════════════════════════════════════════════════════════════════════════════
def page_dept_complaints():
    st.title("📋 Assigned Complaints")
    token = get_token()

    col1, col2 = st.columns(2)
    status_filter = col1.selectbox("Status", ["All","open","in_progress","pending"])
    priority_filter = col2.selectbox("Priority", ["All","high","medium","low"])

    params: dict[str, Any] = {}
    if status_filter != "All": params["status"] = status_filter
    if priority_filter != "All": params["priority"] = priority_filter

    r = api("get", "/department/complaints", token=token, params=params)
    if r and r.status_code == 200:
        complaints = r.json()
        if not complaints:
            st.info("No complaints assigned.")
            return
        for c in complaints:
            with st.expander(f"{priority_badge(c.get('priority','low'))}  {c.get('title','Untitled')}  |  {status_badge(c.get('status','open'))}"):
                col1, col2 = st.columns(2)
                col1.write(f"**Citizen:** {c.get('citizen_name','N/A')}")
                col2.write(f"**Created:** {str(c.get('created_at',''))[:10]}")
                st.write(f"**Description:** {c.get('description','')}")
                if c.get("ai_priority"):
                    st.info(f"🤖 AI Priority: **{c['ai_priority']}**")
                # Quick status update
                new_status = st.selectbox("Update status",
                    ["open","in_progress","resolved","closed"],
                    key=f"sts_{c.get('id')}")
                resolution = st.text_input("Resolution note", key=f"res_{c.get('id')}")
                if st.button("💾 Save", key=f"save_{c.get('id')}"):
                    ur = api("put", f"/department/update/{c.get('id')}", token=token,
                             json={"status": new_status, "action_taken": resolution})
                    if ur and ur.status_code == 200:
                        st.success("Updated!"); st.rerun()
                    elif ur:
                        st.error(ur.json().get("detail","Update failed"))
    elif r:
        st.error("Failed to fetch complaints.")

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: UPDATE STATUS (dept)
# ══════════════════════════════════════════════════════════════════════════════
def page_update_status():
    st.title("✅ Update Complaint Status")
    token = get_token()

    with st.form("update_form"):
        cid        = st.text_input("Complaint ID *")
        new_status = st.selectbox("New Status",
                        ["open","in_progress","resolved","closed"])
        resolution = st.text_area("Resolution / Remarks")
        submitted  = st.form_submit_button("💾 Update", type="primary")

    if submitted:
        if not cid:
            st.warning("Enter complaint ID.")
            return
        r = api("put", f"/department/update/{cid}", token=token,
                json={"status": new_status, "action_taken": resolution})
        if r and r.status_code == 200:
            st.success("✅ Status updated successfully!")
        elif r:
            st.error(r.json().get("detail", "Update failed."))

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: ADMIN DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
def page_admin_dash():
    st.title("🛡️ Admin Dashboard")
    token = get_token()

    st.info("Admin dashboard statistics are currently unavailable.")

    st.markdown("---")
    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("📊 All Complaints", use_container_width=True, type="primary"):
            st.session_state.page = "all_complaints"; st.rerun()
    with col2:
        if st.button("👥 Manage Users", use_container_width=True):
            st.session_state.page = "users"; st.rerun()
    with col3:
        if st.button("🏢 Departments", use_container_width=True):
            st.session_state.page = "departments"; st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: ALL COMPLAINTS (admin)
# ══════════════════════════════════════════════════════════════════════════════
def page_all_complaints():
    st.title("📊 All Complaints")
    token = get_token()

    col1, col2, col3, col4 = st.columns(4)
    sf = col1.selectbox("Status", ["All","open","in_progress","resolved","closed"])
    pf = col2.selectbox("Priority", ["All","high","medium","low"])
    df = col3.text_input("Department filter")
    lm = col4.selectbox("Limit", [25, 50, 100])

    params: dict[str, Any] = {"limit": lm}
    if sf != "All": params["status"] = sf
    if pf != "All": params["priority"] = pf
    if df: params["department"] = df

    r = api("get", "/admin/complaints", token=token, params=params)
    if r and r.status_code == 200:
        complaints = r.json()
        st.markdown(f"**{len(complaints)} complaints found**")
        for c in complaints:
            with st.expander(f"{status_badge(c.get('status','open'))}  {c.get('title','Untitled')}  |  {priority_badge(c.get('priority','low'))}  |  {c.get('department','N/A')}"):
                col1, col2, col3 = st.columns(3)
                col1.write(f"**ID:** `{c.get('id','')}`")
                col2.write(f"**Citizen:** {c.get('citizen_name','N/A')}")
                col3.write(f"**Date:** {str(c.get('created_at',''))[:10]}")
                st.write(f"**Description:** {c.get('description','')}")
                # Admin: reassign dept
                new_dept = st.text_input("Reassign to department", key=f"dept_{c.get('id')}")
                if st.button("🔄 Reassign", key=f"reassign_{c.get('id')}"):
                    rr = api("put", f"/admin/complaints/{c.get('id')}/assign", token=token,
                             json={"department": new_dept})
                    if rr and rr.status_code == 200:
                        st.success("Reassigned!"); st.rerun()
                # Admin: delete
                if st.button("🗑️ Delete", key=f"del_{c.get('id')}"):
                    dr = api("delete", f"/admin/complaints/{c.get('id')}", token=token)
                    if dr and dr.status_code == 200:
                        st.success("Deleted!"); st.rerun()
    elif r:
        st.error("Failed to fetch complaints.")

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: MANAGE USERS (admin)
# ══════════════════════════════════════════════════════════════════════════════
def page_users():
    st.title("👥 Manage Department Officers")
    token = get_token()

    r = api("get", "/admin/officers", token=token)
    if r and r.status_code == 200:
        data = r.json()
        depts = data.get("departments", [])
        for d in depts:
            st.subheader(f"🏢 {d.get('department')} ({d.get('officer_count')} officers)")
            for u in d.get("officers", []):
                with st.expander(f"👤 {u.get('full_name','N/A')}  |  {u.get('email','')}  |  `{u.get('username','')}`"):
                    col1, col2 = st.columns(2)
                    col1.write(f"**Username:** `{u.get('username','')}`")
                    col2.write(f"**Joined:** {str(u.get('created_at',''))[:10]}")
    elif r:
        st.error("Failed to load officers.")

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: DEPARTMENTS (admin)
# ══════════════════════════════════════════════════════════════════════════════
def page_departments():
    st.title("🏢 Departments")
    token = get_token()

    # List departments
    r = api("get", "/admin/departments", token=token)
    if r and r.status_code == 200:
        depts = r.json()
        for d in depts:
            with st.expander(f"🏢 {d.get('name','N/A')}"):
                col1, col2 = st.columns(2)
                col1.write(f"**ID:** `{d.get('id','')}`")
                col2.write(f"**Total complaints:** {d.get('complaint_count',0)}")

    # Create department
    st.markdown("---")
    st.subheader("➕ Add New Department")
    with st.form("add_dept"):
        dname = st.text_input("Department Name")
        demail = st.text_input("Department Email")
        dpass  = st.text_input("Department Password", type="password")
        if st.form_submit_button("➕ Create", type="primary"):
            cr = api("post", "/admin/departments", token=token,
                     json={"name": dname, "email": demail, "password": dpass})
            if cr and cr.status_code in (200, 201):
                st.success("✅ Department created!"); st.rerun()
            elif cr:
                st.error(cr.json().get("detail", "Failed"))

# ══════════════════════════════════════════════════════════════════════════════
# PAGE: ANALYTICS (admin)
# ══════════════════════════════════════════════════════════════════════════════
def page_analytics():
    st.title("📈 Analytics")
    token = get_token()

    r = api("get", "/admin/analytics", token=token)
    if r and r.status_code == 200:
        d = r.json()
        st.subheader("Complaints by Status")
        status_data = d.get("by_status", {})
        if status_data:
            import pandas as pd
            st.bar_chart(pd.DataFrame.from_dict(
                status_data, orient="index", columns=["count"]))

        st.subheader("Complaints by Department")
        dept_data = d.get("by_department", {})
        if dept_data:
            import pandas as pd
            st.bar_chart(pd.DataFrame.from_dict(
                dept_data, orient="index", columns=["count"]))

        st.subheader("Priority Distribution")
        prio_data = d.get("by_priority", {})
        if prio_data:
            import pandas as pd
            df = pd.DataFrame.from_dict(prio_data, orient="index", columns=["count"])
            st.bar_chart(df)

        col1, col2, col3 = st.columns(3)
        col1.metric("📊 Avg Resolution Time", d.get("avg_resolution_hours","—"), "hours")
        col2.metric("🔁 Duplicate Rate", d.get("duplicate_rate","—"), "%")
        col3.metric("🤖 AI Accuracy", d.get("ai_accuracy","—"), "%")
    else:
        st.info("Analytics data unavailable. Connect backend to see charts.")
        # Placeholder
        import pandas as pd
        import numpy as np
        st.subheader("Sample Data (Placeholder)")
        st.bar_chart(pd.DataFrame({
            "Complaints": [12, 8, 23, 5, 15, 9, 18]
        }, index=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]))

# ══════════════════════════════════════════════════════════════════════════════
# ROUTER
# ══════════════════════════════════════════════════════════════════════════════
page = st.session_state.get("page", "home")

# Guard: redirect if not authenticated
protected = {
    "user":       ["citizen_dash","submit","my_complaints","notifications"],
    "department": ["dept_dash","dept_complaints","update_status"],
    "admin":      ["admin_dash","all_complaints","users","departments","analytics"],
}
needs_auth = [p for pages in protected.values() for p in pages]
if page in needs_auth and not get_token():
    st.warning("🔒 Please login first.")
    st.session_state.page = "login"
    page = "login"

# Role guard
if get_token():
    role = get_role()
    if isinstance(role, str) and page in needs_auth:
        allowed = protected.get(role, [])
        if page not in allowed:
            st.error(f"⛔ Access denied for role `{role}`.")
            st.session_state.page = "citizen_dash" if role == "user" else f"{role}_dash"
            st.rerun()

PAGE_MAP = {
    "home":           page_home,
    "about":          page_about,
    "login":          page_login,
    "register":       page_register,
    "citizen_dash":   page_citizen_dash,
    "submit":         page_submit,
    "my_complaints":  page_my_complaints,
    "notifications":  page_notifications,
    "dept_dash":      page_dept_dash,
    "dept_complaints":page_dept_complaints,
    "update_status":  page_update_status,
    "admin_dash":     page_admin_dash,
    "all_complaints": page_all_complaints,
    "users":          page_users,
    "departments":    page_departments,
    "analytics":      page_analytics,
}

fn = PAGE_MAP.get(page, page_home)
fn()

# Footer
st.markdown("---")
st.markdown(
    "<p style='text-align:center;color:#888;font-size:0.8rem;'>"
    "⚖️ ResolveAI · AI-Powered Grievance Management · Built with FastAPI + Streamlit"
    "</p>",
    unsafe_allow_html=True
)
