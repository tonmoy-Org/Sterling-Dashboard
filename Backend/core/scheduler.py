# core/scheduler.py
import os
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()

def start():
    from automation.main import start_scraping, start_yelp_review_scraper
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
    
    # Yelp Review Scraper — frequency controlled by YELP_INTERVAL_MINUTES in .env (default 1 day)
    yelp_interval = int(os.getenv('YELP_INTERVAL_MINUTES', 1440))
    scheduler.add_job(
        start_yelp_review_scraper,
        'interval',
        minutes=yelp_interval,
        id='yelp_review_scraper',
        name='Yelp Review Scraper',
    )
    
    scheduler.start()