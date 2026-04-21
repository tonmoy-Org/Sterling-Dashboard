"""
Work Orders Scraper
Scrapes work orders with complete status and extracts full addresses.
Updated to include Add Column functionality for Completed Date.
Updated to print all table data after filters are applied.
"""

import asyncio
import copy
from datetime import datetime
from typing import List, Dict, Optional
from asgiref.sync import sync_to_async
from django.utils.timezone import make_aware
from django.utils.timezone import get_current_timezone
from work_order.models import WorkOrder
from automation.scrapers.base_scraper import BaseScraper


class WorkOrdersTagsScraper(BaseScraper):
    """
    Scraper for complete work orders including address extraction.
    Opens individual work orders to fetch full address details.
    """

    def __init__(self):
        """Initialize work orders scraper."""
        super().__init__()

    async def _goto_with_fallback(self, url: str, *, timeout_ms: int = 60000):
        """Navigate reliably for pages that keep background requests alive."""
        if not url:
            return

        try:
            # Use a shorter timeout for the strict 'load' or 'networkidle' state
            await self.page.goto(url, wait_until="load", timeout=25000)
            return
        except Exception as e:
            print(f"⚠️ Initial navigation attempt failed for {url} (expected for SPAs): {e}")

        # Fallback to domcontentloaded which is much faster and reliable for FieldEdge
        await self.page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)

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
                                    completed_date: getText(10),
                                    tags: getText(11),
                                    // Search for any link in the row that might be the WO detail page
                                    link: row.querySelector('a[href*="/DispatchSummary/"]')?.href || 
                                          row.querySelector('a[href*="/Dispatch/"]')?.href ||
                                          Array.from(row.querySelectorAll('a')).find(a => a.href)?.href || 
                                          null
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

    async def get_second_textarea_value(self, page):
        """
        Extract value from the 2nd textarea (.text-area_he5R6)

        Args:
            page: Playwright page object

        Returns:
            str or None
        """
        try:
            # Wait until at least 2 textarea exist
            await page.wait_for_selector('.text-area_he5R6', timeout=60000)

            value = await page.evaluate(
                """() => {
                    try {
                        const textareas = document.querySelectorAll('.text-area_he5R6');

                        if (textareas.length >= 2) {
                            return textareas[1].value;
                        } else {
                            return null;
                        }
                    } catch (err) {
                        return null;
                    }
                }"""
            )
            return value

        except Exception as e:
            print(f"❌ Error extracting 2nd textarea: {e}")
            return ''
    
    async def get_all_tags(self, page):
        """
        Extract all tag labels from the tag section

        Args:
            page: Playwright page object

        Returns:
            list[str] or None
        """
        try:
            # Wait for tag elements
            await page.wait_for_selector('.tag-label_XNe5d', timeout=60000)

            tags = await page.evaluate(
                """() => {
                    try {
                        const elements = document.querySelectorAll('.tag-label_XNe5d');
                        return Array.from(elements).map(el => el.innerText.trim());
                    } catch (err) {
                        return [];
                    }
                }"""
            )
            return tags

        except Exception as e:
            print(f"❌ Error extracting tags: {e}")
            return []
        
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
            # completed_elapsed_time = await self.extract_completed_elapsed_time(page)
            completed_elapsed_time = None

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
            if not work_order.get("tags", ""):
                print("Skipping work order without tags")
                continue
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

                wo_link = work_order.get("link")

                # Try direct navigation if link is available (much more robust)
                if wo_link:
                    try:
                        new_page = await self.page.context.new_page()
                        await new_page.goto(wo_link, wait_until="domcontentloaded", timeout=60000)
                        print(f"Directly navigated to {wo_number}")
                    except Exception as e:
                        print(f"Direct navigation failed for {wo_number}: {e}")
                        work_order["try_later"] = retry_count + 1
                        work_orders.append(work_order)
                        continue
                else:
                    # Fallback to the scroll-seek and right-click method
                    # Prepare XPath with work order number (Broad row search + fallback)
                    xpath_config = copy.deepcopy(base_xpath_config)
                    wo_xpath_pattern = f"//tr[.//text()[contains(., '{wo_number}')]]//span[contains(@class, 'title')] | //span[@title='{wo_number}'] | //*[text()='{wo_number}']"
                    xpath_config[0]["xpath"] = wo_xpath_pattern

                    try:
                        await self.page.evaluate(f"""async (args) => {{
                            const xpath = args.xpath;
                            const wo = args.wo;
                            const getEl = () => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                            let el = getEl();
                            if (el) {{
                                el.scrollIntoView({{ block: 'center' }});
                                return true;
                            }}
                            const container = document.querySelector('tbody.fixed-body')?.closest('div') || 
                                            document.querySelector('.fixed-body')?.parentElement || 
                                            document.querySelector('.table-container') ||
                                            window;
                            for (let i = 0; i < 30; i++) {{
                                if (container.scrollBy) container.scrollBy(0, 800);
                                else window.scrollBy(0, 800);
                                await new Promise(r => setTimeout(r, 500));
                                el = getEl();
                                if (el) {{
                                    el.scrollIntoView({{ block: 'center' }});
                                    return true;
                                }}
                            }}
                            return false;
                        }}""", {"xpath": wo_xpath_pattern, "wo": wo_number})
                        await asyncio.sleep(1)
                    except Exception as e:
                        print(f"Scroll seeking error: {e}")

                    # Open work order in new tab via context menu
                    try:
                        async with self.page.context.expect_page() as new_page_info:
                            await self.perform_actions_by_xpaths(action_list=xpath_config, raise_on_error=True)
                        new_page = await new_page_info.value
                        await new_page.wait_for_load_state(state="domcontentloaded", timeout=60000)
                    except Exception as e:
                        print(f"Failed to open context menu for {wo_number}: {e}")
                        work_order["try_later"] = retry_count + 1
                        work_orders.append(work_order)
                        continue

                # Once the page is open (via link or click), extract data
                try:
                    current_url = new_page.url
                    if "https://login.fieldedge.com/Account/Login?ReturnUrl=" in current_url:
                        print("Session expired, logging in again...")
                        await self.login_fieldedge(page=new_page)
                        await new_page.wait_for_load_state()
                        work_orders.append(work_order)  # Re-queue for retry after login
                        continue

                    # Extract address and completed_elapsed_time
                    scraped = await self.scrape_address_from_page(page=new_page)
                    workOrderSummary = await self.get_second_textarea_value(page=new_page)
                    tags = await self.get_all_tags(page=new_page)
                    if not tags:
                        print("Skipping work order without tags")
                        continue
                    work_order["tag"] = tags
                    work_order["workOrderSummary"] = workOrderSummary
                    if "QUOTE-CREATED" in tags:
                        work_order["quoteLink"] = current_url
                    work_order["workOrderLink"] = current_url


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
            await self.perform_actions_by_xpaths(name="workorder_tags_add_column_xpath")
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
            await self.page.goto(dashboard_url, wait_until="domcontentloaded")

            # Login if necessary
            if "Login" in self.page.url:
                await self.login_fieldedge()

            # Navigate to work orders list if needed
            work_order_url = self.rules.get("work_order_url", "")
            timeout_ms = int(self.rules.get("navigation_timeout_ms", 60000))
            current_url = (self.page.url or "").rstrip("/")
            target_url = work_order_url.rstrip("/")
            if work_order_url and target_url != current_url:
                await self._goto_with_fallback(work_order_url, timeout_ms=timeout_ms)

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
            # await self.perform_actions_by_xpaths(name="workorder_tags_edit_filter_xpath")
            # await asyncio.sleep(3)
            await self.perform_actions_by_xpaths(name="tags_edit_filter_xpath")
            await self.perform_actions_by_xpaths(name="workorder_tags_status_xpath")
            await self.perform_actions_by_xpaths(name="scheduled_date_filter_xpath")
            await self.perform_actions_by_xpaths(name="tags_select_all_xpath")
            # await self.perform_actions_by_xpaths(name="completed_date_filter_xpath")
            await self.perform_actions_by_xpaths(name="submit_filter")

            # Wait for table to reload with new column
            await self.page.wait_for_timeout(3000)

            # Scrape table data
            scraped = await self.scrape_work_orders_table()
            work_orders = scraped.get("rows", [])

            # # Fetch addresses for each work order
            work_orders_with_addresses = await self.fetch_addresses_for_work_orders(
                work_orders
            )
            await self.insert_data(work_orders_with_addresses)
            
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
                        scraper_name="work-orders-tags-scraper",
                        status="error" if _error_occurred else "success",
                        error_message=_error_occurred,
                        records_processed=_records_processed,
                        execution_time_seconds=round(_elapsed, 2),
                    )
                    
                    if _error_occurred:
                        incident, created = Incident.objects.get_or_create(
                            service_name="work-orders-tags-scraper",
                            status="active",
                            defaults={
                                "title": "Work Orders Tags Scraper Error",
                                "description": _error_occurred
                            }
                        )
                        if not created:
                            incident.description = _error_occurred
                            incident.save()
                    else:
                        active_incidents = Incident.objects.filter(
                            service_name="work-orders-tags-scraper",
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
                                send_recovery_email("Work Orders Tags Scraper", downtime_seconds)
                                
                await sync_to_async(_log_execution)()
                print(f"📝 Execution logged: {'ERROR' if _error_occurred else 'SUCCESS'} ({round(_elapsed, 1)}s)")
            except Exception as log_err:
                print(f"⚠️ Failed to log execution: {log_err}")
                
            if _error_occurred:
                try:
                    from status.email_service import send_outage_email
                    from asgiref.sync import sync_to_async
                    await sync_to_async(send_outage_email)('Work Orders Tags Scraper', _error_occurred)
                    print("📧 Sent direct outage notification email from scraper.")
                except Exception as mail_err:
                    print(f"⚠️ Failed to send direct email: {mail_err}")

    def _build_work_order_payload(self, data: Dict):
        """Map scraped keys to WorkOrder model fields."""
        wo = (data.get("wo_number") or "").strip()
        if not wo:
            return None

        return {
            "wo": wo,
            "defaults": {
                "tag": data.get("tag") if isinstance(data.get("tag"), list) else [],
                "customerName": data.get("customer"),
                "workOrderAddress": data.get("full_address"),
                "workOrderSummary": data.get("workOrderSummary"),
                "workOrderLink": data.get("workOrderLink", ''),
                "quoteLink": data.get("quoteLink", ''),
                "technicianName": data.get("technician"),
                "status": data.get("status"),
            },
        }

    async def insert_data(self, datas):
        """
        Insert scraped data into database.

        Args:
            data: List of work orders with full addresses

        Returns:
            bool: True if insertion successful, False otherwise
        """
        try:
            for data in datas:
                try:
                    payload = self._build_work_order_payload(data)
                    print(payload)
                    if not payload:
                        print("Skipping insertion: missing wo_number")
                        continue

                    await sync_to_async(
                        WorkOrder.objects.update_or_create,
                        thread_sensitive=True,
                    )(
                        wo=payload["wo"],
                        defaults=payload["defaults"],
                    )
                except Exception as e:
                    print(f"Database insertion error for {data.get('wo_number', 'N/A')}: {e}")
            print("✅ Data inserted successfully.")
            return True
        except Exception as e:
            print(f"Database insertion error: {e}")
            return False