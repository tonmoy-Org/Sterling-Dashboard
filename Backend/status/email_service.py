import os
import resend

def _configure_resend():
    """Set the Resend API key from environment."""
    api_key = os.getenv('RESEND_API_KEY')
    if not api_key:
        print("⚠️ RESEND_API_KEY is not set.")
        return False
    resend.api_key = api_key
    return True

def _get_emails():
    """Get from and to emails."""
    from_email = os.getenv('RESEND_FROM_EMAIL', 'Sterling Dashboard <onboarding@resend.dev>')
    to_emails = [
        email.strip() for email in os.getenv('ALERT_EMAIL_RECIPIENTS', '').split(',') if email.strip()
    ]
    return from_email, to_emails

def send_outage_email(service_name, error_message=None):
    """Send an email when a service goes offline."""
    if not _configure_resend(): return
    from_email, to_emails = _get_emails()
    if not to_emails:
        print("⚠️ No alert recipients configured.")
        return
    
    subject = f"🔴 Service Down (Outage): {service_name}"
    html = f"""
    <h2>⚠️ Service Down Alert</h2>
    <p><strong>Service:</strong> {service_name}</p>
    <p><strong>Status:</strong> OUTAGE</p>
    <p><strong>Details:</strong> {error_message or 'The service is currently unreachable or failing.'}</p>
    """
    
    try:
        resend.Emails.send({
            "from": from_email,
            "to": to_emails,
            "subject": subject,
            "html": html,
        })
        print(f"📧 Outage email sent for {service_name}")
    except Exception as e:
        print(f"⚠️ Failed to send outage email: {e}")

def send_recovery_email(service_name, downtime_seconds):
    """Send an email when a service completely Recovers."""
    if not _configure_resend(): return
    from_email, to_emails = _get_emails()
    if not to_emails: return
    
    minutes = round(downtime_seconds / 60, 1)
    
    subject = f"🟢 Service Recovered: {service_name}"
    html = f"""
    <h2>✅ Service Recovered</h2>
    <p><strong>Service:</strong> {service_name}</p>
    <p><strong>Status:</strong> OPERATIONAL</p>
    <p><strong>Total Downtime:</strong> {minutes} minutes.</p>
    """
    
    try:
        resend.Emails.send({
            "from": from_email,
            "to": to_emails,
            "subject": subject,
            "html": html,
        })
        print(f"📧 Recovery email sent for {service_name}")
    except Exception as e:
        print(f"⚠️ Failed to send recovery email: {e}")
