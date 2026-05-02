"""
Work Orders Time Tracking Scraper
Scrapes work orders and extracts completion time from the Timesheet section.
"""

import copy
import asyncio
import sys
import os
import django
from typing import List, Dict, Optional
from datetime import datetime

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
from accounts.models import User
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
            # Verified selector from findings
            selector = '[data-automation-id="workOrderTabsEnum-Timesheet-container"]'
            
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
            try:
                await page.wait_for_selector('[data-automation-id="table-body"]', timeout=30000)
            except:
                # Fallback: wait for any table that looks like the timesheet entries
                await page.wait_for_selector('table.custom-table', timeout=10000)
            
            # Extract Working and Traveling data
            scraped_details = await page.evaluate(
                r"""() => {
                try {
                    const tbody = document.querySelector('[data-automation-id="table-body"]');
                    if (!tbody) return null;

                    const results = {
                        working: null,
                        traveling: null
                    };

                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    for (let row of rows) {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 6) {
                            const status = cells[1].innerText.trim();
                            const date = cells[2].innerText.trim();
                            const startTime = cells[3].innerText.trim();
                            const endTime = cells[4].innerText.trim();
                            const duration = cells[5].innerText.trim();
                            
                            const entry = { date, startTime, endTime, duration };
                            
                            if (status === 'Working' && !results.working) {
                                results.working = entry;
                            } else if (status === 'Traveling' && !results.traveling) {
                                results.traveling = entry;
                            }
                        }
                    }
                    return results;
                } catch (err) {
                    return null;
                }
            }"""
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
            dict: { full_address, completed_elapsed_time }
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

            # Extract Timesheet data (Working and Traveling)
            timesheet_data = await self.scrape_timesheet_data(page)

            # Map the primary completed time for backward compatibility (Working end time)
            primary_completed_time = None
            if timesheet_data and timesheet_data.get('working'):
                w = timesheet_data['working']
                primary_completed_time = f"{w['date']} {w['endTime']}"

            print(f"✅ Address: {address_data} | Timesheet: {timesheet_data}")

            return {
                "full_address": address_data,
                "timesheet_data": timesheet_data,
                "completed_elapsed_time": primary_completed_time
            }

        except Exception as e:
            print(f"Error extracting details: {e}")
            return None

    async def fetch_details_for_work_orders(self, work_orders):
        """
        Process each work order to get details.
        """
        result = []
        base_xpath_config = self.rules.get("open_work_order_xpath", [])

        while work_orders:
            work_order = work_orders.pop(0)
            wo_number = work_order.get("wo_number", "").strip()
            retry_count = work_order.get("try_later", 0)

            if not wo_number or retry_count >= 2:
                continue

            try:
                xpath_config = copy.deepcopy(base_xpath_config)
                wo_xpath = xpath_config[0]["xpath"]
                xpath_config[0]["xpath"] = wo_xpath.replace("{work_order_number}", wo_number)

                async with self.page.context.expect_page() as new_page_info:
                    await self.perform_actions_by_xpaths(action_list=xpath_config)

                new_page = await new_page_info.value
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
                    result.append(work_order)
                else:
                    raise Exception("Failed to scrape details")

            except Exception as e:
                print(f"Failed to scrape {wo_number}: {e}")
                work_order["try_later"] = retry_count + 1
                work_orders.append(work_order)
            finally:
                try:
                    await new_page.close()
                except:
                    pass

        return result

    def save_to_db(self, final_data):
        """
        Save the scraped data to the TimeTracking model.
        """
        if not final_data:
            return

        import re
        print(f"Saving {len(final_data)} records to database...")

        def parse_duration(dur_str):
            if not dur_str: return 0
            # Matches "1hrs 16" or "0hrs 14" or "16"
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

        for data in final_data:
            try:
                wo_number = data.get("wo_number")
                full_address = data.get("full_address")
                tech_name_raw = data.get("technician")
                ts_data = data.get("timesheet_data")
                
                if not ts_data:
                    continue

                # Parse technician
                tech_name = tech_name_raw
                if " - " in tech_name_raw:
                    tech_name = tech_name_raw.split(" - ")[1].strip()

                # Find user
                user = User.objects.filter(name__icontains=tech_name).first()

                # Prepare values
                defaults = {
                    "user": user,
                    "technician_name": tech_name_raw,
                    "full_address": full_address,
                    "updated_at": timezone.now()
                }

                # Date (from either row)
                date_str = None
                if ts_data.get('working'):
                    date_str = ts_data['working']['date']
                elif ts_data.get('traveling'):
                    date_str = ts_data['traveling']['date']

                if date_str:
                    defaults["date"] = datetime.strptime(date_str, "%m/%d/%Y").date()

                # Working time
                if ts_data.get('working'):
                    w = ts_data['working']
                    defaults["actual_worked_start"] = parse_time(w['startTime'])
                    defaults["actual_worked_end"] = parse_time(w['endTime'])
                    defaults["actual_worked_duration"] = parse_duration(w['duration'])
                    # For backward compatibility with proficiency calculations
                    defaults["marked_worked_end"] = defaults["actual_worked_end"]

                # Traveling time
                if ts_data.get('traveling'):
                    t = ts_data['traveling']
                    defaults["actual_travel_start"] = parse_time(t['startTime'])
                    defaults["actual_travel_end"] = parse_time(t['endTime'])
                    defaults["actual_travel_duration"] = parse_duration(t['duration'])

                # Update or create record
                record, created = TimeTracking.objects.update_or_create(
                    wo_number=wo_number,
                    defaults=defaults
                )
                
                print(f"{'Created' if created else 'Updated'} record for WO {wo_number} ({tech_name})")

            except Exception as e:
                print(f"Error saving record for WO {data.get('wo_number')}: {e}")

    async def run(self):
        """Execute the workflow."""
        import time as _time
        _start_time = _time.time()
        _error_occurred = None
        _records_processed = 0

        try:
            await self.initialize()

            # Navigate
            work_order_url = self.rules.get("work_order_url", "")
            await self._goto_with_fallback(work_order_url)

            if "Login" in self.page.url:
                await self.login_fieldedge()
                await self._goto_with_fallback(work_order_url)

            # Wait for table
            wait_xpath = self.rules.get("wait_xpath")
            await self.page.wait_for_selector(wait_xpath, state="visible", timeout=60000)

            # Filter
            await self.perform_actions_by_xpaths(name="status_xpath")
            await self.perform_actions_by_xpaths(name="time_entry_scraper_scheduled_date_filter_xpath")
            await self.perform_actions_by_xpaths(name="submit_filter")
            await self.page.wait_for_timeout(5000)

            # Scrape
            scraped = await self.scrape_work_orders_table()
            work_orders = scraped.get("rows", [])
            
            # Fetch details
            final_data = await self.fetch_details_for_work_orders(work_orders)
            _records_processed = len(final_data)
            
            # ✅ Console Log the data
            print("\n" + "=" * 80)
            print(f"SCRAPED DATA FOR {len(final_data)} WORK ORDERS")
            print("=" * 80)
            for entry in final_data:
                print(f"WO: {entry.get('wo_number'):<10} | Tech: {entry.get('technician'):<15} | Time: {entry.get('completed_elapsed_time'):<20} | Address: {entry.get('full_address')}")
            print("=" * 80 + "\n")
            
            # Save to database
            if final_data:
                await sync_to_async(self.save_to_db)(final_data)
            
            print(f"\n✅ Finished processing and saving {len(final_data)} records.")
            return final_data

        except Exception as e:
            print(f"Scraping error: {e}")
            _error_occurred = str(e)
            return None
        finally:
            await self.cleanup()
            print(f"Execution time: {round(_time.time() - _start_time, 1)}s")


if __name__ == "__main__":
    scraper = WorkOrdersTimeTrackingScraper()
    asyncio.run(scraper.run())
