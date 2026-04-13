"""
Sterling Dashboard - Main Entry Point
Orchestrates the execution of all scraping tasks in sequence.
"""

import sys
import asyncio
from automation.scrapers.fieldedge_scraper import FieldEdgeScraper
from automation.scrapers.work_orders_scraper import WorkOrdersScraper
from automation.scrapers.work_orders_tags_scraper import WorkOrdersTagsScraper
from automation.scrapers.online_rme_scraper import OnlineRMEScraper
from automation.scrapers.dispatcher_booked import DispatcherBookedScraper

async def run_fieldedge_scraper():
    """Execute FieldEdge scraping workflow."""
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


async def run_work_orders_scraper():
    """Execute WorkOrders scraping workflow."""
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


async def main():
    """Main execution flow - runs all scrapers in sequence."""
    await run_fieldedge_scraper()
    await run_work_orders_scraper()
    await run_online_rme_scraper()
    await run_work_orders_tags_scraper()
    await run_dispatcher_booked_scraper()

def start_fieldedge_scraper():
    """Initialize and start the FieldEdge scraping process."""
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - FIELDEDGE INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_fieldedge_scraper())
    except Exception as e:
        print(f"\nCritical error: {e}")

def start_work_orders_scraper():
    """Initialize and start the Work Orders scraping process."""
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

def start_work_orders_and_rme_combined():
    """Initialize and start the combined Work Orders and Online RME scraping process."""
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - WORK ORDERS & ONLINE RME COMBINED INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_work_orders_and_rme_combined())
    except Exception as e:
        print(f"\nCritical error: {e}")

def start_online_rme_scraper():
    """Initialize and start the Online RME scraping process."""
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - ONLINE RME INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_online_rme_scraper())
    except Exception as e:
        print(f"\nCritical error: {e}")

def start_work_orders_tags_scraper():
    """Initialize and start the Work Orders Tags scraping process."""
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - WORK ORDERS TAGS INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_work_orders_tags_scraper())
    except Exception as e:
        print(f"\nCritical error: {e}")

def start_dispatcher_booked_scraper():
    """Initialize and start the Dispatcher Booked scraping process."""
    print("\n" + "=" * 50)
    print("STERLING DASHBOARD SCRAPER - DISPATCHER BOOKED INITIALIZED")
    print("=" * 50 + "\n")
    try:
        asyncio.run(run_dispatcher_booked_scraper())
    except Exception as e:
        print(f"\nCritical error: {e}")


def start_scraping():
    """Initialize and start all scraping processes."""
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
    start_scraping()
