import os
import requests
from django.utils import timezone
from django.db import connection

from status.models import ServiceStatus, ScraperExecutionLog
from status.email_service import send_outage_email, send_recovery_email

def check_service(service_name, is_operational, error_message=None):
    """
    Update the ServiceStatus model based on the check result,
    and trigger emails for downtime and recovery transitions.
    
    Emails are only sent ONCE per outage event:
    - Outage email: sent only when transitioning from operational -> down
    - Recovery email: sent only when transitioning from down -> operational
    """
    service, created = ServiceStatus.objects.get_or_create(service_name=service_name)

    now = timezone.now()
    
    if not is_operational:
        if service.is_operational:
            # Genuine transition: was operational, now going down
            service.is_operational = False
            service.outage_started_at = now
            service.last_outage_notified_at = now
            service.save()
            send_outage_email(service_name, error_message)
        else:
            # Already known to be down — just update the timestamp, NO email
            service.save()
    elif is_operational and not service.is_operational:
        # Recovery: was down, now coming back online
        service.is_operational = True
        
        # Calculate downtime and add it
        downtime = 0
        if service.outage_started_at:
            downtime = (now - service.outage_started_at).total_seconds()
            service.total_downtime_seconds += downtime
            
        service.outage_started_at = None
        service.last_outage_notified_at = None  # Reset so next outage will trigger email
        service.save()
        send_recovery_email(service_name, downtime)
    else:
        # Still operational — just update last_checked_at
        service.save()

def run_health_checks():
    """
    Runs simple health checks for all configured services.
    """
    print("\n--- Running System Health Check ---")
    
    # 1. Check Database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        check_service("Database", True)
    except Exception as e:
        check_service("Database", False, str(e))
        
    # 2. Check API
    api_url = os.getenv('API_URL', 'http://127.0.0.1:8000/api/')
    try:
        # Check an unauthenticated endpoint to avoid 'Unauthorized' log pollution
        response = requests.get(api_url + "health-check/services/", timeout=10)
        
        if response.status_code == 200:
            check_service("API Endpoint", True)
        else:
            check_service("API Endpoint", False, f"API returned HTTP {response.status_code}")
    except Exception as e:
        check_service("API Endpoint", False, f"Could not connect to API: {e}")

    # 3. Check Scraper Freshness
    IMPORTANT_SCRAPERS = [
        'fieldedge-scraper',
        'work-orders-scraper',
        'online-rme-scraper',
        'yelp-review-scraper',
        'review-tracker-scraper',
        'dispatcher-booked-scraper',
        'work-orders-tags-scraper',
        'invoice-proficiency-scraper',
        'work-orders-time-tracking-scraper',
        'fleetmatics-time-tracking-scraper'
    ]

    try:
        # Get all scrapers that have logs
        logged_scrapers = set(ScraperExecutionLog.objects.values_list('scraper_name', flat=True).distinct())
        
        # Combine with important ones to ensure they are always tracked
        scrapers_to_check = logged_scrapers.union(set(IMPORTANT_SCRAPERS))

        for scraper_name in scrapers_to_check:
            last_run = ScraperExecutionLog.objects.filter(scraper_name=scraper_name).order_by('-executed_at').first()
            
            display_name = scraper_name.replace('-', ' ').title()
            
            if last_run:
                hours_since = (timezone.now() - last_run.executed_at).total_seconds() / 3600
                
                if last_run.status == 'error':
                    check_service(display_name, False, f"Scraper execution failed: {last_run.error_message[:200]}")
                elif hours_since > 24:
                    check_service(display_name, False, f"Scraper has not run successfully in {round(hours_since)} hours.")
                else:
                    check_service(display_name, True)
            else:
                check_service(display_name, False, "No scraper execution logs found yet.")
    except Exception as e:
        check_service("Scraper Health Check", False, f"Could not check scrapers: {e}")
        
    print("--- Health Check Complete ---\n")
