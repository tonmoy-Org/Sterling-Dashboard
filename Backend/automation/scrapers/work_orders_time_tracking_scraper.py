"""
Work Orders Time Tracking Scraper
Scrapes work orders and extracts completion time from the Timesheet section.
"""

import copy
import asyncio
import sys
import os
import django
from datetime import datetime
import time as _time
import traceback
import json

# Setup Django environment
def setup_django():
    # Get the project root directory
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if project_root not in sys.path:
        sys.path.append(project_root)
    
    # Set the settings module
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    
    # Initialize Django
    try:
        django.setup()
    except Exception as e:
        print(f"Django setup warning (possibly already setup): {e}")

setup_django()

from time_tracking.models import TimeTracking
from django.utils import timezone
from asgiref.sync import sync_to_async

from automation.scrapers.base_scraper import BaseScraper

class WorkOrdersTimeTrackingScraper(BaseScraper):
    """
    Scraper for work orders that extracts full address and 
    technician completion time from the Timesheet tab.
    """

    def __init__(self):
        """Initialize scraper."""
        super().__init__()

    async def scrape_work_orders_table(self):
        """
        Scrape work orders from the main table.

        Returns:
            dict: Dictionary with rows list and count
        """
        try:
            await self.page.wait_for_selector(
                "tbody.fixed-body tr", state="attached", timeout=60000
            )
        except Exception as e:
            print(f"Error waiting for table rows: {e}")
            return {"rows": []}

        try:
            scraped_data = await self.page.evaluate(
                r"""() => {
                const dataList = [];
                
                try {
                    const rows = document.querySelectorAll('tbody.fixed-body tr');
                    
                    for (let i = 1; i < rows.length; i++) {
                        try {
                            const row = rows[i];
                            const cells = row.querySelectorAll('td');
                            
                            if (cells.length > 0) {
                                const getText = (index) => {
                                    return cells[index] ? cells[index].innerText.replace(/\s+/g, ' ').trim() : "";
                                };
                                
                                const workOrder = {
                                    customer: getText(0),
                                    wo_number: getText(1),
                                    purchase_order: getText(2),
                                    invoice: getText(3),
                                    quote: getText(4),
                                    task_name: getText(5),
                                    status: getText(6),
                                    appointment_date: getText(7),
                                    scheduled_date: getText(8),
                                    technician: getText(9),
                                    completed_date: getText(10)
                                };
                                
                                dataList.push(workOrder);
                            }
                        } catch (rowError) {
                            console.error(`Error parsing row ${i}:`, rowError);
                        }
                    }
                } catch (err) {
                    console.error("Global scraping error:", err);
                }
                
                return { rows: dataList, count: dataList.length };
            }"""
            )

            row_count = len(scraped_data.get("rows", []))
            print(f"Scraped {row_count} work order(s) from table.")
            return scraped_data

        except Exception as e:
            print(f"Error during table scraping: {e}")
            return {"rows": []}

    async def scrape_timesheet_data(self, page):
        """
        Extract Timesheet completion time from the Timesheet Entries table.
        """
        try:
            # Verified selector from config
            selector = self.rules.get("timesheet_tab_selector", '[data-automation-id="workOrderTabsEnum-Timesheet-container"]')
            
            # Wait for it to be attached
            timesheet_card = page.locator(selector).first
            await timesheet_card.wait_for(state="attached", timeout=30000)
            
            # Scroll it into view
            await timesheet_card.scroll_into_view_if_needed()
            await page.wait_for_timeout(1000)

            # Try to click normally, fallback to JS click
            try:
                await timesheet_card.click(timeout=5000)
            except:
                await page.evaluate(f'document.querySelector("{selector}").click()')
            
            print("✅ Clicked Timesheet card.")

            # Wait for the Timesheet Entries table body to appear
            table_body_selector = self.rules.get("timesheet_table_body_selector", '[data-automation-id="table-body"]')
            try:
                await page.wait_for_selector(table_body_selector, timeout=30000)
            except:
                # Fallback: wait for any table that looks like the timesheet entries
                await page.wait_for_selector('table.custom-table', timeout=10000)
            
            # Extract Working and Traveling data
            scraped_details = await page.evaluate(
                r"""(sel) => {
                try {
                    const tbody = document.querySelector(sel);
                    if (!tbody) return null;

                    const all_entries = [];
                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    for (let row of rows) {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 6) {
                            const status = cells[1].innerText.trim();
                            const date = cells[2].innerText.trim();
                            const startTime = cells[3].innerText.trim();
                            const endTime = cells[4].innerText.trim();
                            const duration = cells[5].innerText.trim();
                            
                            all_entries.push({ status, date, startTime, endTime, duration });
                        }
                    }
                    return all_entries;
                } catch (err) {
                    return null;
                }
            }""", table_body_selector
            )
            return scraped_details

        except Exception as e:
            print(f"⚠️ Error extracting timesheet data: {e}")
            return None

    async def scrape_details_from_page(self, page):
        """
        Extract address and timesheet data from work order detail page.

        Args:
            page: Playwright page object

        Returns:
            dict: { full_address, timesheet_data, completed_elapsed_time }
        """
        try:
            # Wait for address elements
            await page.wait_for_selector('label.addressLabel.map-viewer', state="attached", timeout=60000)
            
            # Extract address - verified selectors
            address_data = await page.evaluate(
                r"""() => {
                try {
                    const labels = Array.from(document.querySelectorAll('label.addressLabel.map-viewer'));
                    if (labels.length >= 2) {
                        const addr1 = labels[0].innerText.trim();
                        const addr2 = labels[1].innerText.trim();
                        return `${addr1}, ${addr2}`;
                    } else if (labels.length === 1) {
                        return labels[0].innerText.trim();
                    }
                    
                    // Fallback to automation IDs
                    const a1 = document.querySelector('[data-automation-id="address1"]');
                    const a2 = document.querySelector('[data-automation-id="address2"]');
                    if (a1) {
                        return a2 ? `${a1.innerText.trim()}, ${a2.innerText.trim()}` : a1.innerText.trim();
                    }
                    return null;
                } catch (err) {
                    return null;
                }
            }"""
            )
            
            # Extract coordinates from map link
            coords = await page.evaluate(
                r"""() => {
                try {
                    const mapLink = document.querySelector('a[href*="maps.google.com/maps?ll="]');
                    if (mapLink) {
                        const href = mapLink.getAttribute('href');
                        const match = href.match(/ll=([-.\d]+),([-.\d]+)/);
                        if (match) {
                            return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
                        }
                    }
                    return null;
                } catch (err) {
                    return null;
                }
            }"""
            )

            # Extract Timesheet data (Working and Traveling)
            timesheet_data = await self.scrape_timesheet_data(page)

            # Map the primary completed time for backward compatibility (First Working end time)
            primary_completed_time = None
            if timesheet_data and isinstance(timesheet_data, list):
                working_entries = [e for e in timesheet_data if e.get('status') == 'Working']
                if working_entries:
                    w = working_entries[0]
                    primary_completed_time = f"{w['date']} {w['endTime']}"

            return {
                "full_address": address_data,
                "timesheet_data": timesheet_data,
                "completed_elapsed_time": primary_completed_time,
                "coords": coords
            }

        except Exception as e:
            print(f"Error extracting details: {e}")
            return None

    def save_record(self, data):
        """
        Save a single scraped record to the database.
        """
        import re
        try:
            wo_number = data.get("wo_number")
            full_address = data.get("full_address")
            tech_name_raw = data.get("technician")
            ts_data = data.get("timesheet_data")
            
            if not ts_data:
                print(f"⚠️ No timesheet data for WO {wo_number}, skipping save.")
                return False

            def parse_duration(dur_str):
                if not dur_str: return 0
                match = re.search(r'(\d+)\s*hrs\s*(\d+)', dur_str)
                if match:
                    return int(match.group(1)) * 60 + int(match.group(2))
                match = re.search(r'(\d+)', dur_str)
                return int(match.group(1)) if match else 0

            def parse_time(time_str):
                if not time_str: return None
                try:
                    return datetime.strptime(time_str, "%I:%M %p").time()
                except:
                    return None

            # Parse technician
            tech_name = tech_name_raw
            if tech_name_raw and " - " in tech_name_raw:
                parts = tech_name_raw.split(" - ")
                if len(parts) > 1:
                    tech_name = parts[1].strip()


            # Date (from first available row)
            date_obj = None
            date_str = None
            if ts_data and isinstance(ts_data, list) and len(ts_data) > 0:
                date_str = ts_data[0].get('date')

            if date_str:
                try:
                    date_obj = datetime.strptime(date_str, "%m/%d/%Y").date()
                except:
                    pass
            
            if not date_obj:
                print(f"⚠️ No date found for WO {wo_number}, skipping save.")
                return False

            # Prepare values
            defaults = {
                "date": date_obj,
                "technician_name": tech_name_raw,
                "full_address": full_address,
                "updated_at": timezone.now()
            }

            # Save entire timesheet array
            defaults["fieldedge_data"] = ts_data

            # Update or create record
            # Use WO number and date as the unique key to prevent duplicates
            record, created = TimeTracking.objects.update_or_create(
                wo_number=wo_number,
                date=date_obj,
                defaults=defaults
            )
            
            print(f"✅ {'Created' if created else 'Updated'} database record for WO {wo_number} ({tech_name})")
            return True

        except Exception as e:
            print(f"❌ Error saving record for WO {data.get('wo_number')}: {e}")
            return False

    async def fetch_details_for_work_orders(self, work_orders):
        """
        Process each work order to get details and save them immediately.
        """
        result = []
        base_xpath_config = self.rules.get("open_work_order_xpath", [])
        
        # Use a list for processed work orders to avoid infinite loops
        processed_wo = set()
        to_process = copy.deepcopy(work_orders)
        retries = {}

        while to_process:
            work_order = to_process.pop(0)
            wo_number = work_order.get("wo_number", "").strip()
            
            if not wo_number:
                continue
                
            # Skip if we already succeeded for this WO (in this run)
            if wo_number in processed_wo:
                continue

            retry_count = retries.get(wo_number, 0)
            if retry_count >= 2:
                print(f"Giving up on WO {wo_number} after {retry_count} retries.")
                continue

            print(f"Processing WO {wo_number} (Retry {retry_count})...")

            try:
                xpath_config = copy.deepcopy(base_xpath_config)
                for action in xpath_config:
                    if "xpath" in action:
                        action["xpath"] = action["xpath"].replace("{work_order_number}", wo_number)

                new_page = None
                try:
                    async with self.page.context.expect_page(timeout=60000) as new_page_info:
                        await self.perform_actions_by_xpaths(action_list=xpath_config)
                    new_page = await new_page_info.value
                except Exception as e:
                    print(f"Timeout/Error opening detail page for {wo_number}: {e}")
                    raise e

                await new_page.wait_for_load_state()
                
                # Check login
                if "Login" in new_page.url:
                    await self.login_fieldedge(page=new_page)
                    await new_page.wait_for_load_state()

                # Extract data
                details = await self.scrape_details_from_page(page=new_page)

                if details:
                    work_order["full_address"] = details["full_address"]
                    work_order["timesheet_data"] = details.get("timesheet_data")
                    work_order["completed_elapsed_time"] = details["completed_elapsed_time"]
                    
                    print(f"✅ Scraped details for WO {wo_number} | Tech: {work_order.get('technician')}")
                    
                    # Save immediately
                    await sync_to_async(self.save_record)(work_order)
                    
                    processed_wo.add(wo_number)
                    result.append(work_order)
                else:
                    raise Exception("Failed to scrape details from page")

            except Exception as e:
                print(f"Failed to process {wo_number}: {e}")
                retries[wo_number] = retry_count + 1
                to_process.append(work_order) # Put back to retry
            finally:
                if new_page:
                    try:
                        await new_page.close()
                    except:
                        pass
                # Small delay between WOs
                await asyncio.sleep(2)

        return result

    async def run(self):
        """
        Execute the complete work orders time tracking scraping workflow.
        """
        _start_time = _time.time()
        _error_occurred = None
        _records_processed = 0
        
        print("\n=== Starting Work Orders Time Tracking Scraper ===")
        
        try:
            await self.initialize()

            
            # 2. Login to FieldEdge
            dashboard_url = self.rules.get("dashboard_url")
            await self._goto_with_fallback(dashboard_url)
            
            if "Login" in self.page.url:
                await self.login_fieldedge()
            
            # 3. Navigate to Work Orders list
            wo_list_url = self.rules.get("work_order_url")
            await self._goto_with_fallback(wo_list_url)
            
            # Wait for table
            wait_xpath = self.rules.get("time_entry_scraper_wait_xpath", "//tbody[contains(@class, 'fixed-body')]")
            await self.page.wait_for_selector(wait_xpath, state="visible", timeout=60000)

            # Filter
            print("Applying filters...")
            await self.perform_actions_by_xpaths(name="status_xpath")
            await self.perform_actions_by_xpaths(name="time_entry_scraper_scheduled_date_filter_xpath")
            await self.perform_actions_by_xpaths(name="submit_filter")
            await self.page.wait_for_timeout(5000)

            # Scrape main table
            scraped = await self.scrape_work_orders_table()
            work_orders = scraped.get("rows", [])
            
            if not work_orders:
                print("No work orders found in table after filtering.")
                return []

            # Fetch details and save as we go
            final_data = await self.fetch_details_for_work_orders(work_orders)
            _records_processed = len(final_data) if final_data else 0
            
            print(f"\n✅ Finished processing {_records_processed} work orders.")
            return final_data

        except Exception as e:
            print(f"Scraping error: {e}")
            _error_occurred = f"{str(e)}\n{traceback.format_exc()}"
            return None
        finally:
            await self.cleanup()
            
            _elapsed = _time.time() - _start_time
            try:
                from status.models import ScraperExecutionLog, Incident

                def _log_execution():
                    ScraperExecutionLog.objects.create(
                        scraper_name="work-orders-time-tracking-scraper",
                        status="error" if _error_occurred else "success",
                        error_message=_error_occurred,
                        records_processed=_records_processed,
                        execution_time_seconds=round(_elapsed, 2),
                    )
                    if _error_occurred:
                        incident, created = Incident.objects.get_or_create(
                            service_name="work-orders-time-tracking-scraper",
                            status="active",
                            defaults={
                                "title": "Work Orders Time Tracking Scraper Error",
                                "description": _error_occurred,
                            },
                        )
                        if not created:
                            incident.description = _error_occurred
                            incident.save()
                    else:
                        # Resolve existing active incidents if successful
                        for incident in Incident.objects.filter(
                            service_name="work-orders-time-tracking-scraper",
                            status="active"
                        ):
                            incident.status = "resolved"
                            incident.resolved_at = timezone.now()
                            incident.resolution_description = "Automation resolved automatically."
                            incident.save()

                await sync_to_async(_log_execution)()
                print(f"📝 Logged: {'ERROR' if _error_occurred else 'SUCCESS'} ({round(_elapsed, 1)}s, {_records_processed} records)")
            except Exception as log_err:
                print(f"Failed to log execution: {log_err}")


if __name__ == "__main__":
    scraper = WorkOrdersTimeTrackingScraper()
    asyncio.run(scraper.run())
