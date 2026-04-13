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
    """
    service, created = ServiceStatus.objects.get_or_create(service_name=service_name)

    now = timezone.now()
    
    # Status Transition Check
    if not is_operational and service.is_operational:
        # Went offline
        service.is_operational = False
        service.outage_started_at = now
        send_outage_email(service_name, error_message)
    elif is_operational and not service.is_operational:
        # Came back online
        service.is_operational = True
        
        # Calculate downtime and add it
        downtime = 0
        if service.outage_started_at:
            downtime = (now - service.outage_started_at).total_seconds()
            service.total_downtime_seconds += downtime
            
        service.outage_started_at = None
        send_recovery_email(service_name, downtime)
        
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

    # 3. Check Scraper Freshness for all scrapers
    try:
        scraper_names = ScraperExecutionLog.objects.values_list('scraper_name', flat=True).distinct()
        for scraper_name in scraper_names:
            last_run = ScraperExecutionLog.objects.filter(scraper_name=scraper_name).order_by('-executed_at').first()
            
            # Format service name for display (e.g., 'dispatcher-booked-scraper' -> 'Dispatcher Booked Scraper')
            display_name = scraper_name.replace('-', ' ').title()
            
            if last_run:
                # If last run was error, or if it ran more than 24 hours ago, it's downtime
                hours_since = (timezone.now() - last_run.executed_at).total_seconds() / 3600
                
                if last_run.status == 'error':
                    check_service(display_name, False, f"Scraper execution failed: {last_run.error_message}")
                elif hours_since > 24:
                    check_service(display_name, False, f"Scraper has not run successfully in {round(hours_since)} hours.")
                else:
                    check_service(display_name, True)
            else:
                check_service(display_name, False, "No scraper execution logs found yet.")
    except Exception as e:
        check_service("Scraper Health Check", False, f"Could not check scrapers: {e}")
        
    print("--- Health Check Complete ---\n")
