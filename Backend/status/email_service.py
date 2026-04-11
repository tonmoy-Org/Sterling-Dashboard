"""
Email Service — Resend Integration
Sends downtime and recovery alerts using the Resend API.
"""

import os
import resend
from django.utils import timezone


def _configure_resend():
    """Set the Resend API key from environment."""
    api_key = os.getenv('RESEND_API_KEY')
    if not api_key:
        raise ValueError("RESEND_API_KEY is not set in environment variables.")
    resend.api_key = api_key


def send_downtime_alert(service, incident, error_message=None):
    """
    Send a downtime alert email when a service goes down.

    Args:
        service: Service model instance
        incident: Incident model instance
        error_message: Optional detailed error message
    """
    _configure_resend()

    from_email = os.getenv('RESEND_FROM_EMAIL', 'Sterling Dashboard <onboarding@resend.dev>')
    to_emails = [
        email.strip()
        for email in os.getenv('ALERT_EMAIL_RECIPIENTS', '').split(',')
        if email.strip()
    ]

    if not to_emails:
        print("⚠️ No alert recipients configured (ALERT_EMAIL_RECIPIENTS).")
        return

    subject = f"🔴 Service Down: {service.name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f0f13; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f13; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a24; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a3a;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 32px 40px;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                                    ⚠️ Service Alert
                                </h1>
                                <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">
                                    Sterling Dashboard Health Monitor
                                </p>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <div style="background-color: #dc262615; border: 1px solid #dc262640; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                                    <p style="margin: 0 0 4px 0; color: #ef4444; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                        Status
                                    </p>
                                    <p style="margin: 0; color: #fca5a5; font-size: 18px; font-weight: 600;">
                                        {service.get_current_status_display()}
                                    </p>
                                </div>

                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #2a2a3a;">
                                            <span style="color: #6b7280; font-size: 13px;">Service</span><br>
                                            <span style="color: #e5e7eb; font-size: 15px; font-weight: 500;">{service.name}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #2a2a3a;">
                                            <span style="color: #6b7280; font-size: 13px;">Category</span><br>
                                            <span style="color: #e5e7eb; font-size: 15px; font-weight: 500;">{service.get_category_display()}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #2a2a3a;">
                                            <span style="color: #6b7280; font-size: 13px;">Severity</span><br>
                                            <span style="color: #fbbf24; font-size: 15px; font-weight: 500;">{incident.get_severity_display()}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #2a2a3a;">
                                            <span style="color: #6b7280; font-size: 13px;">Detected At</span><br>
                                            <span style="color: #e5e7eb; font-size: 15px; font-weight: 500;">{incident.started_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</span>
                                        </td>
                                    </tr>
                                </table>

                                {"<div style='background-color: #1e1e2e; border-radius: 8px; padding: 16px; margin-bottom: 24px;'><p style='margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;'>Error Details</p><p style='margin: 0; color: #fca5a5; font-size: 14px; font-family: monospace;'>" + error_message + "</p></div>" if error_message else ""}

                                <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
                                    This is an automated alert from Sterling Dashboard Health Monitor.
                                    The team has been notified and is investigating.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 40px; background-color: #12121a; border-top: 1px solid #2a2a3a;">
                                <p style="margin: 0; color: #4b5563; font-size: 12px; text-align: center;">
                                    Sterling Dashboard • System Health Monitor
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    params = {
        "from": from_email,
        "to": to_emails,
        "subject": subject,
        "html": html_content,
    }

    response = resend.Emails.send(params)
    print(f"📧 Downtime alert sent. Resend ID: {response.get('id', 'N/A')}")
    return response


def send_recovery_alert(service, incident):
    """
    Send a recovery notification when a service comes back online.

    Args:
        service: Service model instance
        incident: Incident model instance (now resolved)
    """
    _configure_resend()

    from_email = os.getenv('RESEND_FROM_EMAIL', 'Sterling Dashboard <onboarding@resend.dev>')
    to_emails = [
        email.strip()
        for email in os.getenv('ALERT_EMAIL_RECIPIENTS', '').split(',')
        if email.strip()
    ]

    if not to_emails:
        print("⚠️ No alert recipients configured (ALERT_EMAIL_RECIPIENTS).")
        return

    subject = f"🟢 Service Recovered: {service.name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f0f13; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f13; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a24; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a3a;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 40px;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                                    ✅ Service Recovered
                                </h1>
                                <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">
                                    Sterling Dashboard Health Monitor
                                </p>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <div style="background-color: #05966915; border: 1px solid #05966940; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                                    <p style="margin: 0 0 4px 0; color: #10b981; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                        Status
                                    </p>
                                    <p style="margin: 0; color: #6ee7b7; font-size: 18px; font-weight: 600;">
                                        Operational
                                    </p>
                                </div>

                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #2a2a3a;">
                                            <span style="color: #6b7280; font-size: 13px;">Service</span><br>
                                            <span style="color: #e5e7eb; font-size: 15px; font-weight: 500;">{service.name}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #2a2a3a;">
                                            <span style="color: #6b7280; font-size: 13px;">Incident Started</span><br>
                                            <span style="color: #e5e7eb; font-size: 15px; font-weight: 500;">{incident.started_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #2a2a3a;">
                                            <span style="color: #6b7280; font-size: 13px;">Resolved At</span><br>
                                            <span style="color: #e5e7eb; font-size: 15px; font-weight: 500;">{incident.resolved_at.strftime('%Y-%m-%d %H:%M:%S UTC') if incident.resolved_at else 'N/A'}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #2a2a3a;">
                                            <span style="color: #6b7280; font-size: 13px;">Total Downtime</span><br>
                                            <span style="color: #fbbf24; font-size: 15px; font-weight: 600;">{incident.duration_display}</span>
                                        </td>
                                    </tr>
                                </table>

                                {"<div style='background-color: #1e1e2e; border-radius: 8px; padding: 16px; margin-bottom: 24px;'><p style='margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;'>Original Incident Cause</p><p style='margin: 0; color: #fca5a5; font-size: 14px; font-family: monospace;'>" + incident.description + "</p></div>" if incident.description else ""}

                                <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
                                    The service has been restored and is operating normally.
                                    This is an automated notification from Sterling Dashboard Health Monitor.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 40px; background-color: #12121a; border-top: 1px solid #2a2a3a;">
                                <p style="margin: 0; color: #4b5563; font-size: 12px; text-align: center;">
                                    Sterling Dashboard • System Health Monitor
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    params = {
        "from": from_email,
        "to": to_emails,
        "subject": subject,
        "html": html_content,
    }

    response = resend.Emails.send(params)
    print(f"📧 Recovery alert sent. Resend ID: {response.get('id', 'N/A')}")
    return response
