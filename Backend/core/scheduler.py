# core/scheduler.py

from apscheduler.schedulers.background import BackgroundScheduler
from automation.main import start_scraping
from dotenv import load_dotenv
import os


load_dotenv()

def start():
    scheduler = BackgroundScheduler()
    
    scheduler.add_job(start_scraping, 'interval', minutes=int(os.getenv('interval_minutes', 10)))
    
    # Health check scheduler — runs every HEALTH_CHECK_INTERVAL minutes (default: 5)
    from status.health_checker import run_health_checks
    health_check_interval = float(os.getenv('HEALTH_CHECK_INTERVAL', 5))
    scheduler.add_job(
        run_health_checks,
        'interval',
        minutes=health_check_interval,
        id='health_checker',
        name='System Health Checker',
    )
    
    scheduler.start()