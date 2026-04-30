"""
Work Orders Scraper
Scrapes work orders with complete status and extracts full addresses.
Updated to include Add Column functionality for Completed Date.
Updated to print all table data after filters are applied.
"""

import copy
from typing import List, Dict, Optional
import asyncio
from automation.scrapers.base_scraper import BaseScraper


class WorkOrdersScraper(BaseScraper):
    """
    Scraper for complete work orders including address extraction.
    Opens individual work orders to fetch full address details.
    """

    def __init__(self):
        """Initialize work orders scraper."""
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

    async def extract_completed_elapsed_time(self, page):
        """
        Try to extract completed_elapsed_time from timeline.
        If not found, click 'Show all activity' button and try again.

        Args:
            page: Playwright page object

        Returns:
            str: completed_elapsed_time like "March 6, 2026 12:23 AM" or None
        """
        async def find_completed_time():
            return await page.evaluate(
                r"""() => {
                try {
                    const notes = document.querySelectorAll('.note-container p');
                    for (let note of notes) {
                        if (note.innerText.includes('was completed for tech')) {
                            const activityNote = note.closest('.timeline-activity-note');
                            if (!activityNote) continue;

                            // Get time from activity-note-time
                            const timeEl = activityNote.querySelector('.activity-note-time');
                            const timeParts = timeEl ? timeEl.innerText.split(' - ') : [];
                            const time = timeParts[timeParts.length - 1].trim();

                            // Get date from timeline-date-value (walk up to note-bundle, then find date)
                            let date = null;
                            let parent = activityNote.closest('.note-bundle');
                            if (parent) {
                                const dateEl = parent.querySelector('.timeline-date-value');
                                if (dateEl) {
                                    date = dateEl.innerText.trim();
                                }
                            }

                            // Fallback: find nearest visible timeline-date-value
                            if (!date) {
                                const allDates = document.querySelectorAll('.timeline-date-value');
                                for (let d of allDates) {
                                    if (d.innerText.trim()) {
                                        date = d.innerText.trim();
                                        break;
                                    }
                                }
                            }

                            if (date && time) {
                                return `${date} ${time}`;
                            } else if (time) {
                                return time;
                            }
                        }
                    }
                    return null;
                } catch (err) {
                    console.error("Error extracting completed_elapsed_time:", err);
                    return null;
                }
            }"""
            )

        # First attempt
        completed_elapsed_time = await find_completed_time()

        if not completed_elapsed_time:
            print("⚠️ completed_elapsed_time not found, clicking 'Show all activity'...")
            try:
                # Click the Show all activity button via XPath
                show_all_btn = page.locator(
                    'xpath=//*[@id="main-page-container"]/div[3]/div/div[2]/div[2]/div[2]/div[1]/div[2]/div/div[3]/div/div[7]/div/button'
                )
                await show_all_btn.wait_for(state="visible", timeout=10000)
                await show_all_btn.click()
                print("✅ Clicked 'Show all activity' button.")

                # Wait for timeline to reload
                await page.wait_for_timeout(3000)

                # Second attempt
                completed_elapsed_time = await find_completed_time()

            except Exception as e:
                print(f"⚠️ Could not click 'Show all activity' button: {e}")

        return completed_elapsed_time

    async def scrape_address_from_page(self, page):
        """
        Extract full address and completed_elapsed_time from work order detail page.

        Args:
            page: Playwright page object for the work order detail

        Returns:
            dict: { full_address, completed_elapsed_time } or None if extraction fails
        """
        try:
            await page.wait_for_selector(
                '[data-automation-id="address1"]', state="attached", timeout=60000
            )
        except Exception as e:
            print(f"Error waiting for address elements: {e}")
            return None

        try:
            # Wait for timeline to load
            try:
                await page.wait_for_selector(
                    '.note-container p', state="attached", timeout=30000
                )
            except Exception as e:
                print(f"⚠️ Timeline not loaded initially: {e}")

            # Extract address
            full_address = await page.evaluate(
                r"""() => {
                try {
                    const address1 = document.querySelector('[data-automation-id="address1"]').innerText.trim();
                    const address2 = document.querySelector('[data-automation-id="address2"]').innerText.trim();
                    return `${address1}, ${address2}`;
                } catch (err) {
                    return null;
                }
            }"""
            )

            # Extract completed_elapsed_time (with Show all activity fallback)
            completed_elapsed_time = await self.extract_completed_elapsed_time(page)

            print(f"✅ Address: {full_address} | completed_elapsed_time: {completed_elapsed_time}")

            return {
                "full_address": full_address,
                "completed_elapsed_time": completed_elapsed_time
            }

        except Exception as e:
            print(f"Error extracting address: {e}")
            return None

    async def fetch_addresses_for_work_orders(self, work_orders):
        """
        Open each work order to extract full address.
        Only processes work orders with "Complete" status.

        Args:
            work_orders: List of work order dictionaries

        Returns:
            list: Work orders with full_address and completed_elapsed_time fields added
        """
        result = []
        base_xpath_config = self.rules.get("open_work_order_xpath", [])

        while work_orders:
            work_order = work_orders.pop(0)

            try:
                wo_number = work_order.get("wo_number", "").strip()
                status = work_order.get("status", "").strip()
                retry_count = work_order.get("try_later", 0)

                # Only process Complete work orders with retry limit
                if not wo_number or retry_count >= 2:
                    if retry_count >= 2:
                        print(f"Skipping work order {wo_number}: Retry limit reached")
                    continue

                if not base_xpath_config:
                    print("No XPath configured for opening work orders.")
                    continue

                # Prepare XPath with work order number
                xpath_config = copy.deepcopy(base_xpath_config)
                wo_xpath = xpath_config[0]["xpath"]
                xpath_config[0]["xpath"] = wo_xpath.replace(
                    "{work_order_number}", wo_number
                )

                # Open work order in new tab
                try:
                    async with self.page.context.expect_page() as new_page_info:
                        await self.perform_actions_by_xpaths(action_list=xpath_config)

                    new_page = await new_page_info.value
                    await new_page.wait_for_load_state()
                    
                    current_url = new_page.url
                    if "https://login.fieldedge.com/Account/Login?ReturnUrl=" in current_url:
                        print("Session expired, logging in again...")
                        await self.login_fieldedge(page=new_page)
                        await new_page.wait_for_load_state()
                        work_orders.append(work_order)  # Re-queue for retry after login
                        continue

                    # Extract address and completed_elapsed_time
                    scraped = await self.scrape_address_from_page(page=new_page)

                    if scraped and scraped.get("full_address"):
                        work_order["full_address"] = scraped["full_address"]
                        work_order["completed_elapsed_time"] = scraped.get("completed_elapsed_time")
                        print(f"{wo_number}: {scraped['full_address']} | completed_elapsed_time: {scraped.get('completed_elapsed_time')}")
                        result.append(work_order)
                    else:
                        raise Exception("Address not found")

                except Exception as e:
                    print(f"Failed to scrape {wo_number}: {e}")
                    work_order["try_later"] = retry_count + 1
                    work_orders.append(work_order)

                finally:
                    try:
                        await new_page.close()
                    except:
                        pass

            except Exception as e:
                print(f"Error processing work order {wo_number}: {e}")
                work_order["try_later"] = work_order.get("try_later", 0) + 1
                work_orders.append(work_order)

        return result

    async def add_completed_date_column(self):
        """
        Click the Add Column (+) button, select Completed Date checkbox,
        and click Save. Runs once before filters are applied.
        """
        try:
            print("Adding 'Completed Date' column...")
            await self.perform_actions_by_xpaths(name="add_column_xpath")
            print("✅ 'Completed Date' column added successfully.")
        except Exception as e:
            print(f"⚠️ Add Column step failed (column may already be present): {e}")

    async def run(self):
        """
        Execute the complete work orders scraping workflow.

        Returns:
            list: Work orders with full addresses, or None on error
        """
        import time as _time
        import traceback
        _start_time = _time.time()
        _error_occurred = None
        _records_processed = 0

        try:
            await self.initialize()

            # Navigate to dispatch board
            dashboard_url = self.rules.get("dashboard_url")
            await self._goto_with_fallback(dashboard_url)

            # Login if necessary
            if "Login" in self.page.url:
                await self.login_fieldedge()

            # Navigate to work orders list if needed
            work_order_url = self.rules.get("work_order_url", "")
            if work_order_url and work_order_url != self.page.url:
                await self._goto_with_fallback(work_order_url)

            # Wait for table to load
            try:
                wait_xpath = self.rules.get("wait_xpath")
                await self.page.wait_for_selector(
                    wait_xpath, state="visible", timeout=600000
                )
            except Exception as e:
                print(f"Error waiting for table: {e}")
                _error_occurred = f"Error waiting for table: {e}"
                return None

            # Step 1: Add Completed Date column via Add Column modal
            await self.add_completed_date_column()

            # Wait for table to reflect new column
            await self.page.wait_for_timeout(3000)

            # Step 2: Apply filters
            await self.perform_actions_by_xpaths(name="edit_filter_xpath")
            await asyncio.sleep(3)
            await self.perform_actions_by_xpaths(name="status_xpath")
            await self.perform_actions_by_xpaths(name="scheduled_date_filter_xpath")
            await self.perform_actions_by_xpaths(name="completed_date_filter_xpath")

            await self.perform_actions_by_xpaths(name="submit_filter")

            # Wait for table to reload with new column
            await self.page.wait_for_timeout(3000)

            # Scrape table data
            scraped = await self.scrape_work_orders_table()
            work_orders = scraped.get("rows", [])

            # ✅ PRINT ALL TABLE DATA AFTER FILTERS
            print("\n" + "=" * 80)
            print("FILTERED TABLE DATA")
            print("=" * 80)
            for wo in work_orders:
                print(wo)
            print("=" * 80 + "\n")

            # Fetch addresses for each work order
            work_orders_with_addresses = await self.fetch_addresses_for_work_orders(
                work_orders
            )

            _records_processed = len(work_orders_with_addresses)
            return work_orders_with_addresses

        except Exception as e:
            print(f"Scraping error: {e}")
            _error_occurred = f"{str(e)}\n{traceback.format_exc()}"
            return None

        finally:
            await self.cleanup()

            # ── Log execution result to ScraperExecutionLog and Incident ──
            _elapsed = _time.time() - _start_time
            try:
                from status.models import ScraperExecutionLog, Incident
                from django.utils import timezone
                from asgiref.sync import sync_to_async
                
                def _log_execution():
                    ScraperExecutionLog.objects.create(
                        scraper_name="work-orders-scraper",
                        status="error" if _error_occurred else "success",
                        error_message=_error_occurred,
                        records_processed=_records_processed,
                        execution_time_seconds=round(_elapsed, 2),
                    )
                    
                    if _error_occurred:
                        incident, created = Incident.objects.get_or_create(
                            service_name="work-orders-scraper",
                            status="active",
                            defaults={
                                "title": "Work Orders Scraper Error",
                                "description": _error_occurred
                            }
                        )
                        if not created:
                            incident.description = _error_occurred
                            incident.save()
                    else:
                        active_incidents = Incident.objects.filter(
                            service_name="work-orders-scraper",
                            status="active"
                        )
                        if active_incidents.exists():
                            from status.email_service import send_recovery_email
                            for incident in active_incidents:
                                incident.status = "resolved"
                                incident.resolved_at = timezone.now()
                                incident.resolution_description = "Automation started properly and automatically resolved the incident."
                                incident.save()
                                downtime_seconds = (incident.resolved_at - incident.created_at).total_seconds()
                                send_recovery_email("Work Orders Scraper", downtime_seconds)
                                
                await sync_to_async(_log_execution)()
                print(f"📝 Execution logged: {'ERROR' if _error_occurred else 'SUCCESS'} ({round(_elapsed, 1)}s)")
            except Exception as log_err:
                print(f"⚠️ Failed to log execution: {log_err}")
                
            if _error_occurred:
                try:
                    from status.email_service import send_outage_email
                    from asgiref.sync import sync_to_async
                    await sync_to_async(send_outage_email)('Work Orders Scraper', _error_occurred)
                    print("📧 Sent direct outage notification email from scraper.")
                except Exception as mail_err:
                    print(f"⚠️ Failed to send direct email: {mail_err}")