"""
FieldEdge Scraper
Scrapes work order data from the FieldEdge dashboard.
"""
from datetime import datetime
from automation.scrapers.base_scraper import BaseScraper


class FieldEdgeScraper(BaseScraper):
    """
    Scraper for FieldEdge dashboard work orders.
    Filters by status, task type, and date range.
    """
    
    def __init__(self):
        """Initialize FieldEdge scraper."""
        super().__init__()
    
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
        
        Args:
            status_name: Status to filter by (e.g., "Assigned")
        """
        selector = f'button[title="{status_name}"]'
        status_button = self.page.locator(selector)
        
        if await status_button.count() > 0:
            await status_button.click()
            print(f"Selected status: {status_name}")
        else:
            raise Exception(f"Status button '{status_name}' not found.")
    

    async def set_date_filter(self, start_date, end_date):
        """
        Set date range filter in the UI.
        
        Args:
            start_date: Start date in MM/DD/YYYY format
            end_date: End date in MM/DD/YYYY format
        """
        # Open date filter dropdown
        date_filter_dropdown = self.page.locator(
            'div.filter-dropdown:has(.time-filter) div.filter-text'
        ).first
        
        if await date_filter_dropdown.count() > 0:
            await date_filter_dropdown.click()
        
        # Fill date inputs
        start_input = self.page.locator('#start-date-filter')
        end_input = self.page.locator('#end-date-filter')
        
        await start_input.fill('')
        await start_input.type(start_date)
        
        await end_input.fill('')
        await end_input.type(end_date)
        
        print(f"Date filter set: {start_date} to {end_date}")
    
    async def apply_filters(self):
        """Apply all selected filters."""
        apply_button = self.page.locator('.plot-map-button:has-text("Apply")')
        
        if await apply_button.count() > 0:
            await apply_button.click()
            print("Filters applied.")
            await self.page.wait_for_timeout(2000)
        else:
            raise Exception("Apply button not found.")
    
    async def scrape_work_orders(self):
        """
        Scrape work order data from the table.
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
                const rows = [];
                
                const getTextByClass = (rowElement, classSelector) => {
                    const el = rowElement.querySelector(classSelector);
                    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
                };
                
                const domRows = document.querySelectorAll('.kgRow');
                
                domRows.forEach((row, index) => {
                    try {
                        const priorityColor = row.querySelector('.col0 div[style*="background-color"]')?.style.backgroundColor || '';
                        const priorityName = getTextByClass(row, '.col1');
                        
                        // Only process EXCAVATOR items
                        if (priorityName !== "[3] EXCAVATOR") {
                            return;
                        }
                        
                        rows.push({
                            priorityColor: priorityColor,
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
                
                return { rows: rows, count: rows.length };
            }""")
            
            row_count = len(scraped_data.get('rows', []))
            print(f"Scraped {row_count} work order(s).")
            return scraped_data
            
        except Exception as e:
            print(f"Error during page evaluation: {e}")
            return {'rows': []}
    
    async def get_work_order_status(self, work_order_number):
        """
        Fetch detailed status for a specific work order.
        
        Args:
            work_order_number: Work order identifier
            
        Returns:
            str: Status text or None if not found
        """
        target_xpath = f"//span[text()='{work_order_number}']"
        
        # Click on work order — use .first to avoid strict mode violation
        # when the work order number appears in multiple places on the page
        target_locator = self.page.locator(target_xpath).first
        try:
            await target_locator.wait_for(state="attached", timeout=10000)
            await target_locator.click(timeout=5000)
            print(f"Clicked element: {target_xpath}")
        except Exception as e:
            raise Exception(f"Action 'click' failed for xpath '{target_xpath}': {e}") from e
        
        import asyncio
        await asyncio.sleep(3)
        
        # Wait for and extract status
        status_xpath = self.rules.get('locator_status_xpath')
        await self.page.wait_for_selector(
            status_xpath,
            state='visible',
            timeout=10000
        )
        status_locator = self.page.locator(status_xpath)
        raw_text = await status_locator.text_content()
        
        if raw_text:
            # Clean up non-breaking spaces
            return raw_text.replace("\xa0", "").strip()
        
        return None
    
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
                await self.page.goto(url, wait_until='domcontentloaded')
            else:
                raise ValueError("No URL found in rules configuration.")
            
            # Login if necessary
            if "Login" in self.page.url:
                await self.login_fieldedge()
            
            # Wait for UI to load
            await self.page.wait_for_selector(
                '.plot-map-button:has-text("Apply")',
                state='attached',
                timeout=60000
            )
            
            # Apply filters
            status_name = self.rules.get('status_name', "Assigned")
            await self.select_status(status_name)
            

            # Set date range
            start_date = self.rules.get('start_date') or datetime.now().strftime('%m/%d/%Y')
            end_date = self.rules.get('end_date') or datetime.now().strftime('%m/%d/%Y')
            await self.set_date_filter(start_date, end_date)
            
            await self.apply_filters()
            
            # Scrape initial data
            scraped = await self.scrape_work_orders()
            work_orders = scraped.get('rows', [])
            _records_processed = len(work_orders)
            
            # Fetch detailed status for each work order
            for work_order in work_orders:
                wo_number = work_order.get("workOrderNumber")
                if wo_number:
                    status = await self.get_work_order_status(wo_number)
                    if status:
                        work_order['tags'] = status
            
            result = {
                "filterStartDate": start_date,
                "filterEndDate": end_date,
                "workOrders": work_orders,
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