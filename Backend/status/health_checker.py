"""
Health Checker Service
Runs scheduled checks against monitored services and records results.
Currently focused on the Dispatcher Booked feature for testing.
"""

import time
from datetime import timedelta
from django.utils import timezone
from django.db import connection

from status.models import Service, HealthCheck, Incident
from status.email_service import send_downtime_alert, send_recovery_alert


def run_health_checks():
    """
    Execute health checks for all active services.
    Called by the scheduler every N minutes.
    """
    print("\n" + "=" * 50)
    print("HEALTH CHECK — STARTED")
    print("=" * 50)

    active_services = Service.objects.filter(is_active=True)

    if not active_services.exists():
        print("No active services to check.")
        return

    for service in active_services:
        try:
            _check_service(service)
        except Exception as e:
            print(f"Error checking {service.name}: {e}")
            _record_check(service, 'unhealthy', error_message=str(e))

    print("\nHEALTH CHECK — COMPLETE")
    print("=" * 50 + "\n")


def _check_service(service):
    """
    Route a service to its appropriate checker based on category and slug.
    """
    checkers = {
        'dispatcher-booked-scraper': _check_dispatcher_booked_scraper,
        'dispatcher-booked-api': _check_dispatcher_booked_api,
        'database': _check_database,
    }

    checker = checkers.get(service.slug)
    if checker:
        checker(service)
    else:
        # Default: skip unknown services gracefully
        print(f"⚠️  No checker implemented for: {service.name} (slug: {service.slug})")


# ─────────────────────────────────────────────────────────────
# Individual Service Checkers
# ─────────────────────────────────────────────────────────────

def _check_dispatcher_booked_scraper(service):
    """
    Check if the Dispatcher Booked scraper is working correctly.

    Uses a two-layer approach:
      Layer 1 — ScraperExecutionLog: Did the last execution succeed or error?
               This catches real-time errors (login failures, extraction bugs, etc.)
      Layer 2 — Data freshness: Is the data in the DB recent?
               This catches silent failures (scraper stopped running entirely)
    """
    from dispatcher_booked.models import DispatcherBooked
    from status.models import ScraperExecutionLog

    start = time.time()
    try:
        # ── Layer 1: Check last execution log ──
        last_execution = ScraperExecutionLog.objects.filter(
            scraper_name='dispatcher-booked-scraper'
        ).first()  # latest by default ordering (-executed_at)

        if last_execution:
            # How old is the last execution?
            exec_age_minutes = (timezone.now() - last_execution.executed_at).total_seconds() / 60

            # If the last execution was an ERROR → immediately flag as unhealthy
            if last_execution.status == 'error':
                elapsed = int((time.time() - start) * 1000)
                _record_check(
                    service, 'unhealthy',
                    response_time_ms=elapsed,
                    error_message=f"Last scraper execution FAILED: {last_execution.error_message or 'Unknown error'}",
                    details={
                        "check_layer": "execution_log",
                        "last_execution_status": last_execution.status,
                        "last_execution_at": last_execution.executed_at.isoformat(),
                        "execution_age_minutes": round(exec_age_minutes, 1),
                        "execution_time_seconds": last_execution.execution_time_seconds,
                        "execution_details": last_execution.details,
                    }
                )
                return

            # Last execution succeeded — check how long ago it ran
            if exec_age_minutes > service.outage_threshold_minutes:
                # Scraper hasn't run in a while → something is wrong
                elapsed = int((time.time() - start) * 1000)
                _record_check(
                    service, 'unhealthy',
                    response_time_ms=elapsed,
                    error_message=f"Scraper has not run in {int(exec_age_minutes)} minutes (threshold: {service.outage_threshold_minutes} min).",
                    details={
                        "check_layer": "execution_staleness",
                        "last_execution_status": last_execution.status,
                        "last_execution_at": last_execution.executed_at.isoformat(),
                        "execution_age_minutes": round(exec_age_minutes, 1),
                    }
                )
                return
            elif exec_age_minutes > service.freshness_threshold_minutes:
                elapsed = int((time.time() - start) * 1000)
                _record_check(
                    service, 'degraded',
                    response_time_ms=elapsed,
                    error_message=f"Scraper last ran {int(exec_age_minutes)} minutes ago (threshold: {service.freshness_threshold_minutes} min).",
                    details={
                        "check_layer": "execution_staleness",
                        "last_execution_status": last_execution.status,
                        "last_execution_at": last_execution.executed_at.isoformat(),
                        "execution_age_minutes": round(exec_age_minutes, 1),
                    }
                )
                return

        # ── Layer 2: Data freshness check (fallback) ──
        latest = DispatcherBooked.objects.filter(is_deleted=False).order_by('-id').first()

        if not latest:
            elapsed = int((time.time() - start) * 1000)
            _record_check(
                service, 'unhealthy',
                response_time_ms=elapsed,
                error_message="No dispatcher booked records found in database.",
                details={"check_layer": "data_freshness", "last_record": None}
            )
            return

        # Compare latest record date to today
        from datetime import date
        today = date.today()
        days_diff = (today - latest.date).days
        elapsed = int((time.time() - start) * 1000)

        if days_diff == 0:
            _record_check(
                service, 'healthy',
                response_time_ms=elapsed,
                details={
                    "check_layer": "data_freshness" if not last_execution else "execution_log + data_freshness",
                    "last_record_id": latest.id,
                    "last_record_date": str(latest.date),
                    "days_stale": days_diff,
                    "last_execution_at": last_execution.executed_at.isoformat() if last_execution else None,
                    "last_execution_status": last_execution.status if last_execution else None,
                }
            )
        elif days_diff <= 1:
            _record_check(
                service, 'degraded',
                response_time_ms=elapsed,
                error_message=f"Scraper data is {days_diff} day(s) old.",
                details={
                    "check_layer": "data_freshness",
                    "last_record_id": latest.id,
                    "last_record_date": str(latest.date),
                    "days_stale": days_diff,
                }
            )
        else:
            _record_check(
                service, 'unhealthy',
                response_time_ms=elapsed,
                error_message=f"Scraper data is {days_diff} days old. Last record: {latest.date}.",
                details={
                    "check_layer": "data_freshness",
                    "last_record_id": latest.id,
                    "last_record_date": str(latest.date),
                    "days_stale": days_diff,
                }
            )

    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        _record_check(
            service, 'unhealthy',
            response_time_ms=elapsed,
            error_message=f"Failed to check dispatcher booked scraper: {str(e)}"
        )


def _check_dispatcher_booked_api(service):
    """
    Check if the Dispatcher Booked API endpoint is responding.
    Makes a test request to the API.
    """
    import requests
    import os

    start = time.time()
    try:
        base_url = os.getenv('API_URL', 'http://127.0.0.1:8003/api/')
        url = f"{base_url}dispatcher-booked/"

        response = requests.get(url, timeout=10)
        elapsed = int((time.time() - start) * 1000)

        # 200 = OK, 401 = auth required (still means API is up)
        if response.status_code in [200, 401]:
            _record_check(
                service, 'healthy',
                response_time_ms=elapsed,
                details={
                    "status_code": response.status_code,
                    "url": url,
                }
            )
        else:
            _record_check(
                service, 'unhealthy',
                response_time_ms=elapsed,
                error_message=f"API returned status {response.status_code}",
                details={
                    "status_code": response.status_code,
                    "url": url,
                    "response_body": response.text[:500],
                }
            )

    except requests.Timeout:
        elapsed = int((time.time() - start) * 1000)
        _record_check(
            service, 'unhealthy',
            response_time_ms=elapsed,
            error_message="API request timed out after 10 seconds."
        )
    except requests.ConnectionError as e:
        elapsed = int((time.time() - start) * 1000)
        _record_check(
            service, 'unhealthy',
            response_time_ms=elapsed,
            error_message=f"Cannot connect to API: {str(e)}"
        )
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        _record_check(
            service, 'unhealthy',
            response_time_ms=elapsed,
            error_message=f"Unexpected error: {str(e)}"
        )


def _check_database(service):
    """
    Check database connectivity with a simple query.
    """
    start = time.time()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()

        elapsed = int((time.time() - start) * 1000)
        _record_check(
            service, 'healthy',
            response_time_ms=elapsed,
            details={"query": "SELECT 1", "database": connection.settings_dict.get('NAME')}
        )

    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        _record_check(
            service, 'unhealthy',
            response_time_ms=elapsed,
            error_message=f"Database connection failed: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────
# Recording & Incident Management
# ─────────────────────────────────────────────────────────────

def _record_check(service, status, response_time_ms=None, error_message=None, details=None):
    """
    Record a health check result and handle status transitions.
    Creates/resolves incidents and sends email alerts as needed.
    """
    # Create the health check record
    check = HealthCheck.objects.create(
        service=service,
        status=status,
        response_time_ms=response_time_ms,
        error_message=error_message,
        details=details,
    )

    # Update the service's last checked timestamp
    service.last_checked_at = check.checked_at

    # Determine the new service-level status
    previous_status = service.current_status
    new_status = _map_check_to_service_status(status)

    print(f"  [{service.name}] {status.upper()} (was: {previous_status}, now: {new_status})"
          + (f" — {error_message}" if error_message else ""))

    # Detect transitions
    was_operational = previous_status == 'operational'
    is_now_down = new_status in ('partial_outage', 'major_outage', 'degraded')
    is_now_operational = new_status == 'operational'
    was_down = previous_status in ('partial_outage', 'major_outage', 'degraded')

    # --- Service went DOWN ---
    if was_operational and is_now_down:
        service.current_status = new_status
        service.save()

        incident = Incident.objects.create(
            service=service,
            title=f"{service.name} is {service.get_current_status_display()}",
            description=error_message,
            severity=_get_severity(new_status),
        )

        # Send downtime email alert
        try:
            send_downtime_alert(service, incident, error_message)
            incident.alert_sent = True
            incident.save()
            print(f"  📧 Downtime alert sent for {service.name}")
        except Exception as e:
            print(f"  ⚠️ Failed to send downtime alert: {e}")

    # --- Service came BACK UP ---
    elif was_down and is_now_operational:
        service.current_status = 'operational'
        service.save()

        # Resolve open incidents
        open_incidents = Incident.objects.filter(
            service=service,
            is_resolved=False
        )
        for incident in open_incidents:
            incident.resolve()

            # Send recovery email
            try:
                send_recovery_alert(service, incident)
                incident.recovery_sent = True
                incident.save()
                print(f"  📧 Recovery alert sent for {service.name}")
            except Exception as e:
                print(f"  ⚠️ Failed to send recovery alert: {e}")

    # --- Status changed but still not operational ---
    elif was_down and is_now_down and previous_status != new_status:
        service.current_status = new_status
        service.save()

    else:
        # No transition, just update timestamp
        service.save()


def _map_check_to_service_status(check_status):
    """Map a HealthCheck status to a Service status."""
    mapping = {
        'healthy': 'operational',
        'degraded': 'degraded',
        'unhealthy': 'major_outage',
    }
    return mapping.get(check_status, 'major_outage')


def _get_severity(service_status):
    """Map service status to incident severity."""
    mapping = {
        'degraded': 'minor',
        'partial_outage': 'major',
        'major_outage': 'critical',
    }
    return mapping.get(service_status, 'major')
