import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any

def generate_email_notification(
    to_email: str,
    citizen_name: str,
    complaint_id: str,
    status: str,
    text: str,
    action_taken: str = None,
    smtp_settings: Dict[str, Any] = None
) -> str:
    """
    Generates a professional email notification.
    If SMTP settings are provided and fully configured, sends the email.
    Otherwise, prints/simulates the email body to logs.
    """
    subject_map = {
        "pending": f"Grievance Submitted successfully: #{complaint_id}",
        "open": f"Grievance Status Update: Open (#{complaint_id})",
        "in_progress": f"Grievance Status Update: In Progress (#{complaint_id})",
        "resolved": f"Grievance Resolved: #{complaint_id}",
        "closed": f"Grievance Closed: #{complaint_id}",
        "rejected": f"Grievance Rejected: #{complaint_id}"
    }
    
    subject = subject_map.get(status.lower(), f"Grievance Status Update: #{complaint_id}")
    
    status_msg = {
        "pending": "has been submitted and is currently awaiting AI analysis.",
        "open": "has been processed and is open for investigation.",
        "in_progress": "is currently under active investigation by our department officers.",
        "resolved": f"has been successfully resolved. Action taken: '{action_taken}'",
        "closed": "has been closed.",
        "rejected": f"has been rejected. Reason: '{action_taken or 'Insufficient information'}'"
    }.get(status.lower(), f"status has been updated to {status.upper()}.")
    
    body = f"""Hello {citizen_name},

This is an automated notification from the ResolveAI platform regarding your grievance.

Complaint ID: {complaint_id}
Complaint Description: {text[:150]}...
Current Status: {status.upper()}

Your complaint {status_msg}

You can track real-time progress on your ResolveAI Citizen Dashboard.

Regards,
ResolveAI Support Team
------------------------------------
Powered by AI Grievance Redressal System
"""

    simulated_log = f"""
===================================================
SIMULATED EMAIL NOTIFICATION
To: {to_email}
Subject: {subject}
---------------------------------------------------
{body}
===================================================
"""
    print(simulated_log)

    # Check if SMTP is configured
    if smtp_settings and smtp_settings.get("SMTP_HOST") and smtp_settings.get("SMTP_USER") and smtp_settings.get("SMTP_PASSWORD"):
        try:
            msg = MIMEMultipart()
            msg["From"] = smtp_settings["SMTP_USER"]
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))
            
            with smtplib.SMTP(smtp_settings["SMTP_HOST"], smtp_settings.get("SMTP_PORT", 587)) as server:
                server.starttls()
                server.login(smtp_settings["SMTP_USER"], smtp_settings["SMTP_PASSWORD"])
                server.sendmail(smtp_settings["SMTP_USER"], to_email, msg.as_string())
            print(f"[Email] Real Email sent successfully to {to_email}")
        except Exception as e:
            print(f"[Email] Failed to send real email via SMTP: {str(e)}")

    return body