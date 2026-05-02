"""
Sterling Dashboard - Main Entry Point
Orchestrates the execution of all scraping tasks in sequence.
"""

import sys
import os
import time
import asyncio

# Setup Django environment for standalone execution
def setup_django():
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    try:
        django.setup()
    except RuntimeError:
        pass # Already setup

# Ensure UTF-8 encoding for console output (important for emojis in reviews)
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Use a lock file to share status accurately across multiple VPS server workers
LOCK_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scraper.lock')

def track_scraper(func):
    def wrapper(*args, **kwargs):
        # 1. Robust Locking - Prevent multiple simultaneous runs
        # Shared across both Scheduled runs and Manual API triggers
        if os.path.exists(LOCK_FILE):
            try:
                with open(LOCK_FILE, 'r') as f:
                    content = f.read().strip()
                    if content:
                        lock_start_time = float(content)
                        # If lock is less than 45 minutes old, assume it's still valid
                        if time.time() - lock_start_time < 2700: 
                            print(f"--- SCRAPER ALREADY RUNNING (Started {round((time.time() - lock_start_time)/60, 1)} mins ago) ---")
                            return None
            except (ValueError, Exception):
                pass
            
            # If we reach here, lock is either stale or corrupted
            print("--- CLEANING STALE LOCK ---")
            try:
                os.remove(LOCK_FILE)
            except:
                pass

        # 2. Create new lock
        with open(LOCK_FILE, 'w') as f:
            f.write(str(time.time()))
            
        try:
            return func(*args, **kwargs)
        finally:
            try:
                if os.path.exists(LOCK_FILE):
                    os.remove(LOCK_FILE)
            except Exception:
                pass
    return wrapper

async def run_fieldedge_scraper():
    """Execute FieldEdge scraping workflow."""
    from automation.scrapers.fieldedge_scraper import FieldEdgeScraper
    print("=== Starting FieldEdge Scraper ===")
    scraper = None

    try:
        scraper = FieldEdgeScraper()
        data = await scraper.run()

        if data and data.get("workOrders"):
            if scraper.insert_locates(data):
                print("FieldEdge data inserted successfully.")
            else:
                print("Failed to insert FieldEdge data.")
        else:
            print("No FieldEdge data scraped.")

    except Exception as e:
        print(f"Error during FieldEdge execution: {e}")
    finally:
        if scraper:
            del scraper


async def fieldedge_scraper():
    """Wrapper function to execute FieldEdge scraper."""
    await run_fieldedge_scraper()


async def run_work_orders_scraper():
    """Execute WorkOrders scraping workflow."""
    from automation.scrapers.work_orders_scraper import WorkOrdersScraper
    print("\n=== Starting WorkOrders Scraper ===")
    scraper = None

    try:
        scraper = WorkOrdersScraper()
        work_orders_data = await scraper.run()

        if work_orders_data:
            scraper.insert_work_order_today(work_orders_data)
            print("WorkOrders data inserted successfully.")
        else:
            print("No WorkOrders data found today.")

    except Exception as e:
        print(f"Error during WorkOrders execution: {e}")
    finally:
        if scraper:
            try:
                del scraper
            except:
                pass

async def run_work_orders_tags_scraper():
    """Execute WorkOrders Tags scraping workflow."""
    from automation.scrapers.work_orders_tags_scraper import WorkOrdersTagsScraper
    print("\n=== Starting WorkOrders Tags Scraper ===")
    scraper = None

    try:
        scraper = WorkOrdersTagsScraper()
        await scraper.run()
        print("WorkOrders Tags scraping completed.")

    except Exception as e:
        print(f"Error during WorkOrders Tags execution: {e}")
    finally:
        if scraper:
            try:
                del scraper
            except:
                pass


async def run_online_rme_scraper():
    """Execute Online RME scraping workflow."""
    from automation.scrapers.online_rme_scraper import OnlineRMEScraper
    print("\n=== Starting Online RME Scraper ===")
    scraper = None

    try:
        scraper = OnlineRMEScraper()

        # Fetch non-deleted work orders, excluding already-finalized statuses
        work_orders = scraper.api_client.manage_work_orders(
            method_type="GET", params={"is_deleted": "false"}
        )

        work_orders_to_process = [
            wo for wo in work_orders if wo.get("status") not in ["LOCKED", "DELETED"]
        ]

        record_count = len(work_orders_to_process)
        print(f"RME records to process: {record_count}")

        if work_orders_to_process:
            # Single pass: authenticate, search, scrape forms, update DB — all in one
            await scraper.workorder_address_check_and_get_form(work_orders_to_process)
            print("RME data processing completed.")
        else:
            print("No RME records found to update.")

    except Exception as e:
        print(f"Error during Online RME execution: {e}")
    finally:
        if scraper:
            try:
                del scraper
            except:
                pass

async def run_dispatcher_booked_scraper():
    """Execute Dispatcher Booked scraping workflow."""
    from automation.scrapers.dispatcher_booked import DispatcherBookedScraper
    print("\n=== Starting Dispatcher Booked Scraper ===")
    scraper = None

    try:
        scraper = DispatcherBookedScraper()
        await scraper.run()
        print("Dispatcher Booked scraping completed.")

    except Exception as e:
        print(f"Error during Dispatcher Booked execution: {e}")
    finally:
        if scraper:
            try:
                del scraper
            except:
                pass


async def run_review_tracker_scraper():
    """Execute Review Tracker scraping workflow."""
    from automation.scrapers.review_tracker import ReviewTrackerScraper
    print("\n=== Starting Review Tracker Scraper ===")
    scraper = None

    try:
        scraper = ReviewTrackerScraper()
        await scraper.run()
        print("Review Tracker scraping completed.")

    except Exception as e:
        print(f"Error during Review Tracker execution: {e}")
    finally:
        if scraper:
            try:
                del scraper
            except:
                pass


async def run_yelp_review_scraper():
    """Execute Yelp Review scraping workflow."""
    from automation.scrapers.yelp_review_scraper import YelpReviewScraper
    print("\n=== Starting Yelp Review Scraper ===")
    scraper = None

    try:
        scraper = YelpReviewScraper()
        await scraper.run()
        print("Yelp Review scraping completed.")

    except Exception as e:
        print(f"Error during Yelp Review execution: {e}")
    finally:
        if scraper:
            try:
                del scraper
            except:
                pass


async def run_invoice_proficiency_scraper():
    """Execute Invoice Proficiency scraping workflow."""
    from automation.scrapers.invoice_proficiency_scraper import InvoiceProficiencyScraper
    print("\n=== Starting Invoice Proficiency Scraper ===")
    scraper = None

    try:
        scraper = InvoiceProficiencyScraper()
        await scraper.run()
        print("Invoice Proficiency scraping completed.")

    except Exception as e:
        print(f"Error during Invoice Proficiency execution: {e}")
    finally:
        if scraper:
            try:
                del scraper
            except:
                pass


async def main():
    """Main execution flow - runs all scrapers in sequence."""
    await fieldedge_scraper()
    await run_work_orders_scraper()
    await run_online_rme_scraper()
    await run_work_orders_tags_scraper()
    await run_dispatcher_booked_scraper()
    await run_review_tracker_scraper()
    await run_invoice_proficiency_scraper()

@track_scraper
def start_fieldedge_scraper():
    """Initialize and start the FieldEdge scraping process."""
    setup_django()
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - FIELDEDGE INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_fieldedge_scraper())
    except Exception as e:
        print(f"\nCritical error: {e}")

@track_scraper
def start_work_orders_scraper():
    """Initialize and start the Work Orders scraping process."""
    setup_django()
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - WORK ORDERS INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_work_orders_scraper())
    except Exception as e:
        print(f"\nCritical error: {e}")

async def run_work_orders_and_rme_combined():
    """Execute Work Orders and Online RME scrapers in sequence."""
    await run_work_orders_scraper()
    await run_online_rme_scraper()

@track_scraper
def start_work_orders_and_rme_combined():
    """Initialize and start the combined Work Orders and Online RME scraping process."""
    setup_django()
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - WORK ORDERS & ONLINE RME COMBINED INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_work_orders_and_rme_combined())
    except Exception as e:
        print(f"\nCritical error: {e}")

@track_scraper
def start_online_rme_scraper():
    """Initialize and start the Online RME scraping process."""
    setup_django()
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - ONLINE RME INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_online_rme_scraper())
    except Exception as e:
        print(f"\nCritical error: {e}")

@track_scraper
def start_work_orders_tags_scraper():
    """Initialize and start the Work Orders Tags scraping process."""
    setup_django()
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - WORK ORDERS TAGS INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_work_orders_tags_scraper())
    except Exception as e:
        print(f"\nCritical error: {e}")

@track_scraper
def start_dispatcher_booked_scraper():
    """Initialize and start the Dispatcher Booked scraping process."""
    setup_django()
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - DISPATCHER BOOKED INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_dispatcher_booked_scraper())
    except Exception as e:
        print(f"\nCritical error: {e}")

@track_scraper
def start_review_tracker_scraper():
    """Initialize and start the Review Tracker scraping process."""
    setup_django()
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - REVIEW TRACKER INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_review_tracker_scraper())
    except Exception as e:
        print(f"\nCritical error: {e}")


@track_scraper
def start_yelp_review_scraper():
    """Initialize and start the Yelp Review scraping process."""
    setup_django()
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - YELP REVIEW INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_yelp_review_scraper())
    except Exception as e:
        print(f"\nCritical error: {e}")


@track_scraper
def start_invoice_proficiency_scraper():
    """Initialize and start the Invoice Proficiency scraping process."""
    setup_django()
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - INVOICE PROFICIENCY INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_invoice_proficiency_scraper())
    except Exception as e:
        print(f"\nCritical error: {e}")


@track_scraper
def start_scraping():
    """Initialize and start all scraping processes."""
    setup_django()
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - PROCESS INITIALIZED")
    print("=" * 50 + "\n")

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProcess interrupted by user.")
    except Exception as e:
        print(f"\nCritical error: {e}")
    finally:
        print("\n" + "=" * 50)
        print("PROCESS FINISHED")
        print("=" * 50 + "\n")


if __name__ == "__main__":
    setup_django()
    start_scraping()
