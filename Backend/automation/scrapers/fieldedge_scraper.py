"""
FieldEdge Scraper
Scrapes work order data from the FieldEdge dashboard.
"""
from datetime import datetime
import asyncio
import copy
from typing import List, Dict, Optional
from automation.scrapers.base_scraper import BaseScraper


class FieldEdgeScraper(BaseScraper):
    """
    Scraper for FieldEdge dashboard work orders.
    Filters by status, task type, and date range.
    """
    
    def __init__(self):
        """Initialize FieldEdge scraper."""
        super().__init__()
    
    async def _remove_overlays(self):
        """Aggressively remove UI overlays that block interactions (Pendo, Intercom, backdrops)."""
        js_cleaner = """() => {
            const selectors = [
                "[class*='pendo']", 
                "[id*='pendo']", 
                ".intercom-app", 
                ".intercom-launcher-discovery-frame",
                "[class*='backdrop']",
                ".modal-backdrop"
            ];
            selectors.forEach(s => {
                document.querySelectorAll(s).forEach(el => el.remove());
            });
            // Also force fix any overflow hidden on body that might prevent scrolling
            document.body.style.overflow = 'auto';
            document.documentElement.style.overflow = 'auto';
        }"""
        try:
            await self.page.evaluate(js_cleaner)
        except Exception:
            pass

    def format_date(self, date_str):
        """
        Convert date from YYYY-MM-DD to MM/DD/YYYY format.
        
        Args:
            date_str: Date string in YYYY-MM-DD format
            
        Returns:
            str: Formatted date or original string if parsing fails
        """
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            return date_obj.strftime("%m/%d/%Y")
        except ValueError:
            return date_str
    
    async def select_status(self, status_name):
        """
        Select status filter button in the UI.
        Uses specialized logic for footer toolbar buttons that are initially 'muted'
        and require a hover interaction to become clickable.
        
        Args:
            status_name: Status to filter by (e.g., "Assigned")
        """
        await self._remove_overlays()
        
        # User discovery: Status buttons in footer toolbar often require hovering
        # Priority 1: User-provided footer XPath structure
        footer_xpath = '//*[@id="footer-toolbar"]/div[1]/div[3]'
        status_in_footer = self.page.locator(f'xpath={footer_xpath}//div[contains(text(), "{status_name}")]')
        
        # Priority 2: Direct text match in the whole toolbar
        toolbar_fallback = self.page.locator(f'#footer-toolbar :has-text("{status_name}")').first
        
        # Priority 3: Broader selector (Standard buttons/titles)
        general_selector = f'[title="{status_name}"], :has-text("{status_name}")'
        status_button_general = self.page.locator(general_selector).first
        
        # Decide which locator to use
        if await status_in_footer.count() > 0:
            status_button = status_in_footer.first
        elif await toolbar_fallback.count() > 0:
            status_button = toolbar_fallback
        else:
            status_button = status_button_general

        try:
            # Wait for button to be available in DOM
            await status_button.wait_for(state="attached", timeout=10000)
            
            # Robust interaction: Hover to "unmute" or activate the button (essential for headless)
            await status_button.hover(force=True)
            await self.page.wait_for_timeout(1000)  # Wait for hover effect/transition
            
            # Remove overlays again right before clicking
            await self._remove_overlays()
            
            # Use force=True to skip hit-test (ignore invisible overlays/muted states)
            await status_button.click(timeout=5000, force=True)
            print(f"Selected status: {status_name}")
            
        except Exception as e:
            # Final fallback: JS click (Ignores visibility/pointer-events entirely)
            print(f"⚠️ Standard interaction failed for status '{status_name}', trying JS click... (Error: {e})")
            try:
                await status_button.evaluate("el => { el.scrollIntoView(); el.click(); }")
                print(f"Selected status (JS): {status_name}")
            except Exception as js_e:
                print(f"❌ Failed to reach status button: {js_e}")
                # Log page content/error if critical
                raise Exception(f"Status button '{status_name}' not found or clickable in footer toolbar.")

    

    async def set_date_filter(self, start_date, end_date):
        """
        Set date range filter in the UI using ultra-robust JS injection.
        """
        # Open date filter dropdown
        date_filter_dropdown = self.page.locator(
            'div.filter-dropdown:has(.time-filter) div.filter-text'
        ).first
        
        if await date_filter_dropdown.count() > 0:
            try:
                await self._remove_overlays()
                await date_filter_dropdown.click(timeout=1000, force=True)
            except Exception:
                await date_filter_dropdown.evaluate("el => el.click()")
        
        # Very brief wait for SPA dropdown animation
        await self.page.wait_for_timeout(500)
        
        start_input = self.page.locator('#start-date-filter')
        end_input = self.page.locator('#end-date-filter')
        
        try:
            # Try a very quick wait for visibility (only 500ms)
            await start_input.wait_for(state="visible", timeout=500)
            await start_input.fill('')
            await start_input.type(start_date)
            await end_input.fill('')
            await end_input.type(end_date)
        except Exception:
            # If not visible or blocked, use native JS injection (Silent & Robust)
            js_setter = """(el, val) => {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }"""
            await start_input.evaluate(js_setter, start_date)
            await end_input.evaluate(js_setter, end_date)
            
        print(f"Date filter set: {start_date} to {end_date}")
    
    async def apply_filters(self):
        """Apply all selected filters."""
        await self._remove_overlays()
        
        # User provided XPath for the Apply button
        apply_xpath = "//button[contains(@class, 'confirm_hsagT') and contains(., 'Apply')]"
        apply_button = self.page.locator(apply_xpath)
        
        try:
            await apply_button.wait_for(state="visible", timeout=10000)
            await self._remove_overlays()
            await apply_button.click(timeout=5000, force=True)
            print("Filters applied.")
        except Exception:
            # Fallback for complex XPaths or overlays
            print("⚠️ Standard Apply click blocked. Triggering JS fallback...")
            try:
                await apply_button.evaluate("el => el.click()")
                print("Filters applied (JS).")
            except Exception as e:
                print(f"❌ Failed to reach Apply button: {e}")
                # Try locating by text as a final ditch effort
                try:
                    alt_apply = self.page.locator(apply_xpath).last
                    await alt_apply.evaluate("el => el.click()")
                    print("Filters applied (Alternative locator).")
                except:
                    raise Exception(f"Apply button not found at XPath: {apply_xpath}")
        
        await self.page.wait_for_timeout(3000)

    async def scrape_work_orders_table(self):
        """
        Scrape work order data from the main board table.
        Only includes EXCAVATOR priority items.
        
        Returns:
            dict: Scraped data with rows and count
        """
        print("⏳ Waiting for data rows...")
        try:
            await self.page.wait_for_selector(
                '.kgRow',
                state='visible',
                timeout=60000
            )
        except Exception as e:
            print(f"No rows found (timeout waiting for .kgRow). Assuming empty data.")
            return {'rows': []}
        
        try:
            scraped_data = await self.page.evaluate(r"""() => {
                const dataList = [];
                
                const getTextByClass = (rowElement, classSelector) => {
                    const el = rowElement.querySelector(classSelector);
                    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
                };
                
                const domRows = document.querySelectorAll('.kgRow');
                
                domRows.forEach((row, index) => {
                    try {
                        const priorityName = getTextByClass(row, '.col1');
                        
                        // Only process EXCAVATOR items
                        if (priorityName !== "[3] EXCAVATOR") {
                            return;
                        }
                        
                        dataList.push({
                            priorityColor: row.querySelector('.col0 div[style*="background-color"]')?.style.backgroundColor || '',
                            priorityName: priorityName,
                            workOrderNumber: getTextByClass(row, '.col2'),
                            customerPO: getTextByClass(row, '.col3'),
                            customerName: getTextByClass(row, '.col4'),
                            customerAddress: getTextByClass(row, '.col5'),
                            tags: getTextByClass(row, '.col6'),
                            techName: getTextByClass(row, '.col7'),
                            purchaseStatus: getTextByClass(row, '.col8'),
                            promisedAppointment: getTextByClass(row, '.col9'),
                            createdDate: getTextByClass(row, '.col10'),
                            scheduledDate: getTextByClass(row, '.col11'),
                            task: getTextByClass(row, '.col12')
                        });
                    } catch (err) {
                        console.error(`Error parsing row ${index}:`, err);
                    }
                });
                
                return { rows: dataList, count: dataList.length };
            }""")
            
            row_count = len(scraped_data.get('rows', []))
            print(f"Scraped {row_count} work order(s) from table.")
            return scraped_data
            
        except Exception as e:
            print(f"Error during page evaluation: {e}")
            return {'rows': []}
    
    async def scrape_details_from_page(self, page):
        """
        Extract detailed status/tags from the work order detail page.

        Args:
            page: Playwright page object for the work order detail

        Returns:
            str: Detailed status text or None
        """
        try:
            status_xpath = self.rules.get('locator_status_xpath')
            await page.wait_for_selector(
                status_xpath,
                state='visible',
                timeout=15000
            )
            status_locator = page.locator(status_xpath)
            raw_text = await status_locator.text_content()
            
            if raw_text:
                return raw_text.replace("\xa0", "").strip()
            return None
        except Exception as e:
            print(f"⚠️ Error extracting details from page: {e}")
            return None

    async def fetch_detailed_status_for_all(self, work_orders: List[Dict]) -> List[Dict]:
        """
        Process work orders to fetch detailed status using the multi-tab pattern.
        
        Args:
            work_orders: List of work order dictionaries
            
        Returns:
            list: Updated work orders
        """
        result = []
        process_queue = copy.deepcopy(work_orders)
        
        print(f"\n🔍 Fetching detailed status for {len(process_queue)} work orders...")

        while process_queue:
            work_order = process_queue.pop(0)
            wo_number = work_order.get("workOrderNumber", "").strip()
            retry_count = work_order.get("try_later", 0)

            if not wo_number or retry_count >= 2:
                if retry_count >= 2:
                    print(f"⏭️ Skipping {wo_number}: Retry limit reached")
                continue

            target_xpath = f"//span[text()='{wo_number}']"
            
            try:
                # Open work order in new tab
                async with self.page.context.expect_page() as new_page_info:
                    target_locator = self.page.locator(target_xpath).first
                    await target_locator.wait_for(state="visible", timeout=10000)
                    
                    # Use Robust click for the span
                    try:
                        await target_locator.click(timeout=2000, force=True)
                    except Exception:
                        await target_locator.evaluate("el => el.click()")

                new_page = await new_page_info.value
                await new_page.wait_for_load_state()

                # Check for session expiration
                if "Login" in new_page.url:
                    print("🔄 Session expired during detail fetch, re-logging...")
                    await self.login_fieldedge(page=new_page)
                    await new_page.wait_for_load_state()
                    work_order["try_later"] = retry_count + 1
                    process_queue.append(work_order)
                    await new_page.close()
                    continue

                # Extract details
                status = await self.scrape_details_from_page(new_page)
                if status:
                    work_order['tags'] = status
                    print(f"✅ {wo_number}: Status -> {status}")
                
                result.append(work_order)
                await new_page.close()

            except Exception as e:
                print(f"⚠️ Failed to scrape {wo_number}: {e}")
                work_order["try_later"] = retry_count + 1
                process_queue.append(work_order)

        return result
    
    async def run(self):
        """
        Execute the complete FieldEdge scraping workflow.
        
        Returns:
            dict: Scraped data with work orders and filter dates, or None on error
        """
        import time as _time
        import traceback
        _start_time = _time.time()
        _error_occurred = None
        _records_processed = 0

        try:
            await self.initialize()
            
            # Navigate to dashboard
            url = self.rules.get('web_url')
            if url:
                print(f"🚀 Navigating to: {url}")
                await self.page.goto(url, wait_until='load', timeout=60000)
            else:
                raise ValueError("No URL found in rules configuration.")
            
            # Login if necessary
            if "Login" in self.page.url or await self.page.locator('input[type="password"]').count() > 0:
                await self.login_fieldedge()
                await self.page.wait_for_load_state('load')
            
            # Aggressive cleanup before UI check
            await self._remove_overlays()

            # Wait for UI to load with visibility check
            print("⏳ Waiting for Dashboard UI readiness...")
            apply_selector = "//button[contains(@class, 'confirm_hsagT') and contains(., 'Apply')]"
            try:
                # Look for 'Apply' button to confirm dashboard loaded
                await self.page.wait_for_selector(
                    apply_selector,
                    state='attached',
                    timeout=60000
                )
            except Exception as e:
                print(f"⚠️ Timeout waiting for 'Apply' button. Page content: {self.page.url}")
                # Last resort: Try a reload if it's stuck
                print("🔄 Stuck on loading? Trying one-time page reload...")
                await self.page.reload(wait_until="networkidle")
                await self._remove_overlays()
                await self.page.wait_for_selector(
                    apply_selector,
                    state='attached',
                    timeout=20000
                )
            
            # Apply filters
            status_name = self.rules.get('status_name', "Assigned")
            await self.select_status(status_name)
            

            # Set date range
            start_date = self.rules.get('start_date') or datetime.now().strftime('%m/%d/%Y')
            end_date = self.rules.get('end_date') or datetime.now().strftime('%m/%d/%Y')
            await self.set_date_filter(start_date, end_date)
            
            await self.apply_filters()
            
            # Step 1: Scrape initial table data
            scraped = await self.scrape_work_orders_table()
            work_orders = scraped.get('rows', [])
            
            # Step 2: Fetch detailed status for each work order (robust multi-tab pattern)
            final_work_orders = await self.fetch_detailed_status_for_all(work_orders)

            _records_processed = len(final_work_orders)
            
            result = {
                "filterStartDate": start_date,
                "filterEndDate": end_date,
                "workOrders": final_work_orders,
            }
            
            return result
            
        except Exception as e:
            print(f"Critical error in FieldEdge scraper: {e}")
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
                        scraper_name='fieldedge-locates-scraper',
                        status='error' if _error_occurred else 'success',
                        error_message=_error_occurred,
                        records_processed=_records_processed,
                        execution_time_seconds=round(_elapsed, 2),
                    )
                    
                    if _error_occurred:
                        incident, created = Incident.objects.get_or_create(
                            service_name="fieldedge-locates-scraper",
                            status="active",
                            defaults={
                                "title": "Fieldedge Locates Scraper Error",
                                "description": _error_occurred
                            }
                        )
                        if not created:
                            incident.description = _error_occurred
                            incident.save()
                    else:
                        active_incidents = Incident.objects.filter(
                            service_name="fieldedge-locates-scraper",
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
                                send_recovery_email("Fieldedge Locates Scraper", downtime_seconds)
                                
                await sync_to_async(_log_execution)()
                print(f"📝 Execution logged: {'ERROR' if _error_occurred else 'SUCCESS'} ({round(_elapsed, 1)}s)")
            except Exception as log_err:
                print(f"⚠️ Failed to log execution: {log_err}")
                
            if _error_occurred:
                try:
                    from status.email_service import send_outage_email
                    from asgiref.sync import sync_to_async
                    await sync_to_async(send_outage_email)('Fieldedge Locates Scraper', _error_occurred)
                    print("📧 Sent direct outage notification email from scraper.")
                except Exception as mail_err:
                    print(f"⚠️ Failed to send direct email: {mail_err}")