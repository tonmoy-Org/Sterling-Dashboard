"""
Invoice Proficiency Scraper
Scrapes invoice proficiency/performance data from the FieldEdge dashboard.
"""
import time as _time
import traceback
from datetime import datetime
from asgiref.sync import sync_to_async
from django.utils import timezone
from automation.scrapers.base_scraper import BaseScraper


class InvoiceProficiencyScraper(BaseScraper):
    """
    Scraper for FieldEdge Invoice Proficiency reports.
    Inherits common browser automation from BaseScraper.
    """
    
    def __init__(self):
        """Initialize Invoice Proficiency scraper."""
        super().__init__()

    async def _goto_with_fallback(self, url: str, *, timeout_ms: int = 60000):
        """Navigate reliably for pages that keep background requests alive."""
        if not url:
            return

        try:
            await self.page.goto(url, wait_until="networkidle", timeout=timeout_ms)
            return
        except Exception as e:
            print(f"⚠️ networkidle navigation failed for {url}: {e}")

        # Fallback for SPA pages where network never becomes fully idle.
        await self.page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)

    async def scrape_report_table(self):
        """
        Scrape records from the main fixed-body table.
        Detects boolean checkmark icons and converts them to text.
        """
        try:
            # FieldEdge lists usually use tbody.fixed-body
            await self.page.wait_for_selector(
                "tbody.fixed-body tr", state="attached", timeout=60000
            )
        except Exception as e:
            print(f"Error waiting for table rows: {e}")
            return []

        try:
            data = await self.page.evaluate(
                r"""() => {
                const dataList = [];
                try {
                    const rows = document.querySelectorAll('tbody.fixed-body tr');
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        const cells = row.querySelectorAll('td');
                        if (cells.length > 0) {
                            const rowData = Array.from(cells).map(td => {
                                // Check if cell contains a success checkmark image
                                const img = td.querySelector('img[src*="success-checkmark"]');
                                if (img) {
                                    return "Yes";
                                }
                                return td.innerText.replace(/\s+/g, ' ').trim();
                            });
                            dataList.push(rowData);
                        }
                    }
                } catch (err) {
                    console.error("Scraping error:", err);
                }
                return dataList;
            }"""
            )
            print(f"Scraped {len(data)} row(s) from table.")
            return data
        except Exception as e:
            print(f"Error during table evaluation: {e}")
            return []

    async def run(self):
        """
        Execute the complete Invoice Proficiency scraping workflow.
        """
        import time as _time
        import traceback
        _start_time = _time.time()
        _error_occurred = None
        _records_processed = 0

        try:
            await self.initialize()

            # 1. Login if necessary
            dashboard_url = self.rules.get("dashboard_url", "https://login.fieldedge.com/Dashboard/")
            await self._goto_with_fallback(dashboard_url)
            
            if "Login" in self.page.url:
                await self.login_fieldedge()

            # 2. Navigate and Scrape Reports
            report_urls = self.rules.get("invoice_proficiency_urls", [])
            if not report_urls:
                # Fallback to singular if plural not found
                single_url = self.rules.get("invoice_proficiency_url")
                if single_url:
                    report_urls = [single_url]

            if not report_urls:
                print("⚠️ No report URLs found in rules!")
                return None

            all_scraped_data = []

            for index, report_url in enumerate(report_urls):
                print(f"\n--- Processing Report: {report_url} ---")
                await self._goto_with_fallback(report_url)
                
                # Wait for SPA to stabilize
                await self.page.wait_for_timeout(2000)

                # Add extra columns
                if index == 0:
                    print("Adding 'Invoice' and 'Assignment Completed' columns...")
                    try:
                        await self.perform_actions_by_xpaths(name="invoice_proficiency_add_column_xpath")
                        print("✅ Columns added.")
                    except Exception as e:
                        print(f"⚠️ Failed to add extra columns: {e}")
                
                elif index == 1:
                    print("Adding 'Invoice' column only...")
                    try:
                        await self.perform_actions_by_xpaths(name="invoice_proficiency_add_column_invoice_only_xpath")
                        print("✅ 'Invoice' column added.")
                    except Exception as e:
                        print(f"⚠️ Failed to add extra column: {e}")

                # 3. Apply Date Filter (Today)
                print("Applying date filter (Today)...")
                try:
                    # Wait for the filter UI to render
                    await self.page.wait_for_selector(
                        "div.secondary-filter.date-filter",
                        state="visible",
                        timeout=30000,
                    )
                    
                    # Apply filter sequence: Open -> Today -> Select
                    await self.perform_actions_by_xpaths(name="invoice_proficiency_status_xpath", raise_on_error=True)
                    
                    # Apply the filters
                    await self.perform_actions_by_xpaths(name="submit_filter", raise_on_error=True)
                    print(f"✅ Filter applied successfully for {report_url}.")
                    
                    # Wait for table to update after filter
                    await self.page.wait_for_timeout(3000)
                    
                except Exception as e:
                    print(f"⚠️ Failed to apply filter for {report_url}: {e}. Attempting to scrape anyway...")

                # 4. Scrape the data
                scraped_rows = await self.scrape_report_table()
                
                if scraped_rows:
                    import json
                    print(f"\n📋 JSON DATA FROM {report_url} ({len(scraped_rows)} rows):")
                    print(json.dumps(scraped_rows, indent=2))
                    all_scraped_data.extend(scraped_rows)
                else:
                    print(f"No data found in table for {report_url}")

            # 5. Final JSON Summary
            import json
            _records_processed = len(all_scraped_data)
            print("\n" + "="*50)
            print(f"🚀 FINAL AGGREGATED JSON DATA ({_records_processed} total rows):")
            print("="*50)
            print(json.dumps(all_scraped_data, indent=2))
            print("="*50 + "\n")
            
            return all_scraped_data

        except Exception as e:
            print(f"Critical error in Invoice Proficiency Scraper: {e}")
            _error_occurred = f"{str(e)}\n{traceback.format_exc()}"
            return None

        finally:
            await self.cleanup()
            # ... (rest of logging logic)

            # ── Log execution result to ScraperExecutionLog and Incident ──
            _elapsed = _time.time() - _start_time
            try:
                from status.models import ScraperExecutionLog, Incident
                
                def _log_execution():
                    ScraperExecutionLog.objects.create(
                        scraper_name="invoice-proficiency-scraper",
                        status="error" if _error_occurred else "success",
                        error_message=_error_occurred,
                        records_processed=_records_processed,
                        execution_time_seconds=round(_elapsed, 2),
                    )
                    
                    if _error_occurred:
                        incident, created = Incident.objects.get_or_create(
                            service_name="invoice-proficiency-scraper",
                            status="active",
                            defaults={
                                "title": "Invoice Proficiency Scraper Error",
                                "description": _error_occurred
                            }
                        )
                        if not created:
                            incident.description = _error_occurred
                            incident.save()
                    else:
                        active_incidents = Incident.objects.filter(
                            service_name="invoice-proficiency-scraper",
                            status="active"
                        )
                        if active_incidents.exists():
                            for incident in active_incidents:
                                incident.status = "resolved"
                                incident.resolved_at = timezone.now()
                                incident.resolution_description = "Automation started properly and automatically resolved the incident."
                                incident.save()
                                
                await sync_to_async(_log_execution)()
                print(f"📝 Execution logged: {'ERROR' if _error_occurred else 'SUCCESS'} ({round(_elapsed, 1)}s)")
            except Exception as log_err:
                print(f"⚠️ Failed to log execution: {log_err}")
                
            if _error_occurred:
                try:
                    from status.email_service import send_outage_email
                    await sync_to_async(send_outage_email)('Invoice Proficiency Scraper', _error_occurred)
                    print("📧 Sent direct outage notification email from scraper.")
                except Exception as mail_err:
                    print(f"⚠️ Failed to send direct email: {mail_err}")
