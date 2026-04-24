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
        Detects boolean checkmark icons and returns rows as dictionaries mapped to headers.
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
                const results = [];
                try {
                    // Get Headers - FieldEdge uses various structures depending on the list version
                    const headerSelectors = [
                        '.header-container .header-cell-text',
                        '.kgHeaderCell .kgHeaderText',
                        '.fixed-header th',
                        '[role="columnheader"]',
                        '.table-header .cell-text',
                        '.header-row div'
                    ];
                    
                    let headers = [];
                    for (const selector of headerSelectors) {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            headers = Array.from(elements)
                                .map(el => el.innerText.trim())
                                .filter(h => h !== "");
                            if (headers.length > 0) break;
                        }
                    }
                    
                    const rows = document.querySelectorAll('tbody.fixed-body tr, .table-row, .kgRow');
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        const cells = row.querySelectorAll('td, .table-cell, .kgCell');
                        if (cells.length > 0) {
                            const rowDict = {};
                            Array.from(cells).forEach((td, index) => {
                                let value = td.innerText.replace(/\s+/g, ' ').trim();
                                
                                // Check if cell contains a success checkmark image
                                const img = td.querySelector('img[src*="success-checkmark"], .checkmark-container');
                                if (img || td.innerHTML.includes('success-checkmark')) {
                                    value = "Yes";
                                }
                                
                                const headerName = headers[index] || `Column_${index}`;
                                rowDict[headerName] = value;
                            });
                            results.push(rowDict);
                        }
                    }
                } catch (err) {
                    console.error("Scraping error:", err);
                }
                return results;
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
        import json
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

            all_scraped_data = {}

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
                    # Log the headers found in the first row
                    print(f"DEBUG: Headers found for {report_url}: {list(scraped_rows[0].keys())}")
                
                # Apply business logic filtering for Work Performance table (index 0)
                if index == 0:
                    print("Applying specification filters for Work Performance data...")
                    # Filter: Invoice must not be blank and Assignment Completed must be 'Yes'
                    filtered_rows = []
                    for row in scraped_rows:
                        # Try multiple common FieldEdge header variations for Invoice
                        invoice = (row.get("Invoice") or row.get("Invoice #") or 
                                   row.get("Transaction") or row.get("Number") or "").strip()
                        
                        # Try multiple common variations for Assignment Completed
                        completed = (row.get("Assignment Completed") or 
                                     row.get("Completed") or 
                                     row.get("Is Completed") or "")
                        
                        if invoice and completed == "Yes":
                            filtered_rows.append(row)
                    
                    print(f"📋 Validated {len(filtered_rows)} of {len(scraped_rows)} rows (excluded blank invoices or incomplete assignments).")
                    scraped_rows = filtered_rows

                if scraped_rows:
                    print(f"\n📋 JSON DATA FROM {report_url} ({len(scraped_rows)} rows):")
                    print(json.dumps(scraped_rows, indent=2))
                    all_scraped_data[f"table_{index}"] = scraped_rows
                else:
                    print(f"No valid data found for {report_url}")

            # 5. Process Data and Save to Database
            from asgiref.sync import sync_to_async
            from django.utils import timezone
            from invoice_proficiency.models import InvoiceProficiency
            import re

            def extract_worth_from_item(item_name):
                """
                Extract hour worth from item strings like '3SP1TROU—1HR' or '4PS1FLO—15MIN'.
                Requirement: '0' or '0H' indicates no time value and should be ignored.
                """
                if not item_name: return 0.0
                
                # Requirements: Ignore 0 or 0H items (Health department or no time value)
                if item_name.strip() in ["0", "0H"]:
                    return 0.0

                # Look for patterns like 1HR, 2HR, 30MIN etc.
                hr_match = re.search(r'(\d+)HR', item_name)
                min_match = re.search(r'(\d+)MIN', item_name)
                
                if hr_match:
                    return float(hr_match.group(1))
                if min_match:
                    # Requirement specifies 1 minute = 0.0167 Hours
                    return float(min_match.group(1)) * 0.0167
                
                return 0.0

            def parse_worked_time(time_str):
                """
                Convert minutes or string time to decimal hours.
                Requirement: 1minute = 0.0167 Hours
                """
                if not time_str: return 0.0
                try:
                    # Remove any non-numeric chars except .
                    minutes = float(re.sub(r'[^0-9.]', '', str(time_str)))
                    return minutes * 0.0167
                except:
                    return 0.0

            def save_results(table_0, table_1):
                """
                Merge tables, calculate proficiency, and save to database.
                """
                if not table_0:
                    print("⚠️ Table 0 (Work Performance) is empty. Nothing to save.")
                    return 0
                
                print(f"DEBUG: Processing {len(table_0)} work performance rows and {len(table_1)} invoiced item rows.")

                # Group items by Work Order Number
                items_by_wo = {}
                for item_row in table_1:
                    # Try various common FieldEdge WO header names
                    wo_num = (item_row.get("WO #") or item_row.get("Work Order #") or 
                              item_row.get("WO") or item_row.get("Work Order") or 
                              item_row.get("Column_6")) # Fallback to index if header fails
                    
                    if not wo_num: continue
                    
                    # Clean WO (sometimes it has a link or whitespace)
                    wo_num = str(wo_num).strip()
                    if wo_num not in items_by_wo:
                        items_by_wo[wo_num] = []
                    items_by_wo[wo_num].append(item_row)

                print(f"DEBUG: Grouped items for {len(items_by_wo)} distinct Work Orders.")

                processed_count = 0
                for wo_row in table_0:
                    # Identify WO number in first table
                    wo_num = (wo_row.get("Work Order") or wo_row.get("Work Order #") or 
                              wo_row.get("WO #") or wo_row.get("Column_2"))
                    
                    if not wo_num: 
                        print("DEBUG: Skipping row without WO #:", wo_row.keys())
                        continue
                    
                    wo_num = str(wo_num).strip()
                    tech_name = wo_row.get("Technician") or wo_row.get("Employee") or "Unknown"
                    wo_date_str = wo_row.get("Date") or ""
                    worked_time_raw = wo_row.get("Worked Time") or "0"
                    
                    # Requirement: 1 minute = 0.0167 Hours
                    worked_hours = parse_worked_time(worked_time_raw)
                    
                    # Match with Invoiced Items
                    invoiced_items = items_by_wo.get(wo_num, [])
                    if not invoiced_items:
                        print(f"DEBUG: Periodic check - No invoiced items found for WO {wo_num}. Skipping.")
                        continue 

                    total_worth_hours = 0.0
                    items_detail = []
                    invoice_total = 0.0
                    invoice_num = ""
                    invoice_date_str = ""
                    has_excavation_pass_item = False
                    
                    for item in invoiced_items:
                        item_name = item.get("Item") or item.get("Column_3") or ""
                        qty_str = str(item.get("Qty. Sold") or item.get("Column_7") or "1.0")
                        qty = float(re.sub(r'[^0-9.]', '', qty_str)) if qty_str else 1.0
                        
                        rate_str = str(item.get("Rate") or "0")
                        rate = float(re.sub(r'[^0-9.]', '', rate_str)) if rate_str else 0.0
                        
                        total_sold_str = str(item.get("Total Sold") or item.get("Column_8") or "0")
                        total_sold = float(re.sub(r'[^0-9.]', '', total_sold_str)) if total_sold_str else 0.0
                        
                        invoice_total += total_sold
                        invoice_num = item.get("Invoice") or item.get("Column_9") or invoice_num
                        invoice_date_str = item.get("Date") or item.get("Column_1") or invoice_date_str
                        
                        worth_per_unit = extract_worth_from_item(item_name)
                        total_item_worth = worth_per_unit * qty
                        total_worth_hours += total_item_worth
                        
                        if item_name.strip() == "6SP1DRA--4HR":
                            has_excavation_pass_item = True
                        
                        items_detail.append({
                            "item": item_name,
                            "qty": qty,
                            "description": item.get("Description") or item.get("Column_4") or "",
                            "rate": rate,
                            "worth": round(total_item_worth, 3)
                        })

                    # Date discrepancy check
                    from datetime import datetime
                    fmt = "%m/%d/%Y"
                    parsed_wo_date = None
                    try:
                        if wo_date_str and invoice_date_str:
                            d1 = datetime.strptime(wo_date_str, fmt)
                            d2 = datetime.strptime(invoice_date_str, fmt)
                            parsed_wo_date = d1.date()
                            delta = abs((d1 - d2).days)
                            if delta > 5:
                                print(f"⚠️ Discarding WO {wo_num}: Date discrepancy too large ({delta} days)")
                                continue
                        elif wo_date_str:
                            parsed_wo_date = datetime.strptime(wo_date_str, fmt).date()
                    except:
                        pass 

                    if not parsed_wo_date:
                        parsed_wo_date = timezone.now().date()

                    # Proficiency Calculation
                    proficiency = 0.0
                    if worked_hours > 0:
                        proficiency = (total_worth_hours / worked_hours) * 100

                    # Excavation Logic
                    priority = wo_row.get("Priority") or ""
                    task = wo_row.get("Task") or ""
                    excavation_status = None
                    if "EXCAVATOR" in priority and "DRAIN FIELD" in task:
                        excavation_status = "Pass" if has_excavation_pass_item else "Fail"

                    # Save to DB
                    try:
                        proficiency_record, created = InvoiceProficiency.objects.update_or_create(
                            work_order_number=wo_num,
                            defaults={
                                "technician_name": tech_name,
                                "date": parsed_wo_date,
                                "invoice_number": invoice_num,
                                "assignment_completed": wo_row.get("Assignment Completed") == "Yes",
                                "worked_time_hours": round(worked_hours, 3),
                                "invoiced_time_hours": round(total_worth_hours, 3),
                                "proficiency_percentage": round(proficiency, 2),
                                "total_amount": invoice_total,
                                "customer_name": wo_row.get("Customer") or "Unknown",
                                "priority": priority,
                                "task_name": task,
                                "items_detail": items_detail,
                                "work_order_summary": f"Excavation: {excavation_status}" if excavation_status else wo_row.get("Summary", "")
                            }
                        )
                        processed_count += 1
                        print(f"DEBUG: Saved/Updated WO {wo_num} ({'Created' if created else 'Updated'})")
                    except Exception as db_err:
                        print(f"❌ Database error saving WO {wo_num}: {db_err}")

                return processed_count

            # Execute Save
            table_0 = all_scraped_data.get("table_0", [])
            table_1 = all_scraped_data.get("table_1", [])
            
            print(f"DEBUG: Final check before DB - table_0: {len(table_0)}, table_1: {len(table_1)}")
            
            _records_processed = await sync_to_async(save_results)(table_0, table_1)
            
            print("\n" + "="*50)
            print(f"🚀 FINAL SUMMARY: saved {_records_processed} records to database.")
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
