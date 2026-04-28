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

    async def scrape_report_table(self):
        """
        Scrape records from the main fixed-body table.
        Detects boolean checkmark icons and returns rows as dictionaries mapped to headers.
        """
        try:
            # FieldEdge lists usually use tbody.fixed-body or .kgViewport
            await self.page.wait_for_selector(
                "tbody.fixed-body tr, .kgRow, .table-row", state="attached", timeout=60000
            )
            # Also try to wait for header text to be present
            await self.page.wait_for_timeout(2000)
        except Exception as e:
            print(f"Error waiting for table rows: {e}")
            return []

        try:
            data = await self.page.evaluate(
                r"""() => {
                const results = [];
                try {
                    // Try to find headers with multiple strategies
                    let headers = [];
                    
                    // Strategy 1: Look for common FieldEdge/ko-grid header classes
                    const kgHeaders = document.querySelectorAll('.kgHeaderCell .kgHeaderText, .kgHeaderRow div, .header-cell-text');
                    if (kgHeaders.length > 0) {
                        headers = Array.from(kgHeaders).map(el => el.innerText.trim()).filter(h => h !== "");
                    }
                    
                    // Strategy 2: Look for role-based headers
                    if (headers.length === 0) {
                        const roleHeaders = document.querySelectorAll('[role="columnheader"]');
                        if (roleHeaders.length > 0) {
                            headers = Array.from(roleHeaders).map(el => el.innerText.trim()).filter(h => h !== "");
                        }
                    }

                    // Strategy 3: Standard table headers
                    if (headers.length === 0) {
                        const thHeaders = document.querySelectorAll('th, .fixed-header th');
                        headers = Array.from(thHeaders).map(el => el.innerText.trim()).filter(h => h !== "");
                    }

                    const rows = document.querySelectorAll('tbody.fixed-body tr, .kgRow, .table-row');
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        const cells = row.querySelectorAll('td, .kgCell, .table-cell');
                        if (cells.length > 0) {
                            const rowDict = {};
                            Array.from(cells).forEach((td, index) => {
                                let value = td.innerText.replace(/\s+/g, ' ').trim();
                                
                                // Detect Checkmarks (FieldEdge success icons)
                                const checkImg = td.querySelector('img[src*="success-checkmark"]');
                                let hasCheckmark = false;
                                
                                if (checkImg) {
                                    // Check if the image or its parent container is hidden.
                                    // offsetParent is null if the element or any grandparent has 'display: none'.
                                    // We also check computed style as a secondary measure.
                                    const isVisible = checkImg.offsetParent !== null && 
                                                      window.getComputedStyle(checkImg).display !== 'none';
                                    
                                    if (isVisible) {
                                        hasCheckmark = true;
                                    }
                                }
                                
                                if (hasCheckmark) {
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

                # 3. Apply Date Filter (Yesterday)
                print("Applying date filter (Yesterday)...")
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
                    if scraped_rows:
                        print(f"DEBUG Sample Row: {scraped_rows[0]}")

                    # Filter: Invoice must not be blank and Assignment Completed must be 'Yes'
                    filtered_rows = []
                    for row in scraped_rows:
                        # Try multiple keys for Invoice, including column indices if headers failed
                        invoice = (row.get("Invoice") or row.get("Invoice #") or 
                                   row.get("Transaction") or row.get("Number") or 
                                   row.get("Column_10") or # Fallback for added column 'Invoice'
                                   "").strip()
                        
                        # Try multiple keys for Assignment Completed, including column indices
                        completed = (row.get("Assignment Completed") or 
                                     row.get("Completed") or 
                                     row.get("Is Completed") or 
                                     row.get("Column_11")) # Fallback for added column 'Assignment Completed'
                        
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

            def parse_worked_time(time_str):
                """
                Convert raw time from 'Worked Time' column to decimal hours.
                Supported formats:
                 - "120" (minutes) -> 120 * 0.0167 = 2.0 hrs
                 - "01:30" (HH:MM) -> 1.5 hrs
                 - "2.5" (hours)   -> 2.5 hrs (if detected as non-integer decimal)
                Rule: 1 minute = 0.0167 hours.
                """
                if not time_str: return 0.0
                time_str = str(time_str).strip()
                
                try:
                    # 1. Handle HH:MM format
                    if ":" in time_str:
                        parts = time_str.split(":")
                        hrs = float(parts[0])
                        mins = float(parts[1]) if len(parts) > 1 else 0
                        return round(hrs + (mins * 0.0167), 4)
                    
                    # 2. Handle numeric values
                    # If it's a decimal like 2.5, we assume it's already hours
                    if "." in time_str:
                        val = float(re.sub(r'[^0-9.]', '', time_str))
                        return round(val, 4)
                    
                    # 3. Handle integer values as minutes
                    minutes = float(re.sub(r'[^0-9.]', '', time_str))
                    
                    # Align with Model logic for clean rounding of common values
                    if minutes == 30: return 0.5
                    if minutes == 60: return 1.0
                    if minutes == 15: return 0.25
                    
                    # Requirement specifies 0.0167 conversion factor
                    return round(minutes * 0.0167, 4)
                except Exception as e:
                    print(f"DEBUG: Error parsing worked time '{time_str}': {e}")
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
                    # Column order confirmed from DOM:
                    # Col0=Employee, Col1=Date, Col2=Category, Col3=Item,
                    # Col4=Description, Col5=Customer, Col6=WO#,
                    # Col7=Agreement, Col8=Qty.Sold, Col9=TotalSold,
                    # Col10=CompletedDate, Col11=Invoice(added), Col12=Task(added)
                    wo_num = (item_row.get("WO #") or item_row.get("Work Order #") or 
                              item_row.get("WO") or item_row.get("Work Order") or 
                              item_row.get("Column_6"))  # Col6 = WO #
                    
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
                    tech_name = wo_row.get("Technician") or wo_row.get("Employee") or wo_row.get("Column_0") or "Unknown"
                    # Handle Summary or Notes
                    wo_summary = wo_row.get("Summary") or wo_row.get("Notes") or ""
                    worked_time_raw = wo_row.get("Worked Time") or wo_row.get("Column_8") or "0"
                    
                    # Requirement: 1 minute = 0.0167 Hours
                    worked_hours = parse_worked_time(worked_time_raw)
                    
                    # Match with Invoiced Items
                    invoiced_items = items_by_wo.get(wo_num, [])
                    if not invoiced_items:
                        print(f"DEBUG: Periodic check - No invoiced items found for WO {wo_num}. Skipping.")
                        continue 

                    total_worth_hours = 0.0   # kept for legacy variable; actual calc is in model
                    items_detail = []
                    invoice_total = 0.0
                    invoice_num = ""
                    # Two separate date fields from Table 1:
                    #   completed_date_str = "Completed Date" (Col10) -> work_order_date
                    #   invoice_date_str   = "Date" (Col1)            -> invoice_date
                    completed_date_str = ""
                    invoice_date_str = ""
                    has_excavation_pass_item = False
                    
                    # --- Raw items: no worth calculation here ---
                    # Model.save() calls compute_invoiced_time() which uses
                    # InvoiceProficiency.calculate_worth_time() to derive worth from item codes.
                    for item in invoiced_items:
                        item_name = item.get("Item") or item.get("Item Name") or item.get("Column_3") or ""  # Col3
                        qty_str = str(item.get("Qty. Sold") or item.get("Column_8") or "1.0")  # Col8
                        try:
                            qty = float(re.sub(r'[^0-9.]', '', qty_str)) if qty_str else 1.0
                        except:
                            qty = 1.0

                        # NOTE: Table 1 has no 'Rate' column — only Total Sold (Col9)
                        total_sold_str = str(item.get("Total Sold") or item.get("Column_9") or "0")  # Col9
                        try:
                            total_sold = float(re.sub(r'[^0-9.]', '', total_sold_str)) if total_sold_str else 0.0
                        except:
                            total_sold = 0.0

                        invoice_total += total_sold
                        invoice_num = item.get("Invoice") or item.get("Column_11") or invoice_num  # Col11 (added)
                        
                        # Col10 = Completed Date (when the WO was completed)
                        completed_date_str = item.get("Completed Date") or item.get("Column_10") or completed_date_str
                        # Col1 = Date (the invoice date)
                        invoice_date_str = item.get("Date") or item.get("Column_1") or invoice_date_str

                        # Check excavation pass item
                        if "6SP1DRA" in item_name.upper():
                            has_excavation_pass_item = True

                        # Store ONLY raw item fields — no worth, no is_counted
                        items_detail.append({
                            "item": item_name,
                            "qty": qty,
                            "description": item.get("Description") or item.get("Column_4") or "",  # Col4
                            "total_sold": total_sold,
                        })

                    print(f"DEBUG: WO {wo_num} - {len(items_detail)} raw item(s) collected for DB save.")
                    # Date discrepancy check:
                    #   work_order_date  = "Completed Date" from Table 1 (Col10)
                    #   invoice_date     = "Date" from Table 1 (Col1)
                    # Spec: "discard any workorder and invoice that have dates more
                    #        than 5 days off one another either in the future or past."
                    from datetime import datetime, timedelta
                    fmt = "%m/%d/%Y"
                    parsed_wo_date = None
                    parsed_inv_date = None
                    try:
                        if completed_date_str:
                            parsed_wo_date = datetime.strptime(completed_date_str.strip(), fmt).date()
                        if invoice_date_str:
                            parsed_inv_date = datetime.strptime(invoice_date_str.strip(), fmt).date()
                        
                        # Fallback: if no completed date, use invoice date
                        if not parsed_wo_date and parsed_inv_date:
                            parsed_wo_date = parsed_inv_date
                    except:
                        pass 

                    if not parsed_wo_date:
                        parsed_wo_date = timezone.now().date()
                    
                    # SPEC RULE: Discard WOs where Completed Date and Invoice Date
                    # differ by more than 5 days — these are likely errors.
                    if parsed_wo_date and parsed_inv_date:
                        day_diff = abs((parsed_wo_date - parsed_inv_date).days)
                        if day_diff > 5:
                            print(f"⚠️ DISCARDING WO {wo_num}: Completed Date ({parsed_wo_date}) and "
                                  f"Invoice Date ({parsed_inv_date}) differ by {day_diff} days (>5). Likely error.")
                            continue

                    # Excavation Logic
                    priority = wo_row.get("Priority") or wo_row.get("Column_12") or ""
                    task = wo_row.get("Task") or wo_row.get("Column_13") or ""
                    excavation_status = None
                    if "EXCAVATOR" in priority.upper() and ("DRAIN FIELD" in task.upper() or "DRAINFIELD" in task.upper()):
                        excavation_status = "Pass" if has_excavation_pass_item else "Fail"

                    # Save raw data to DB.
                    # invoiced_time_hours and proficiency_percentage are NOT set here;
                    # InvoiceProficiency.save() computes them from items_detail automatically.
                    try:
                        proficiency_record, created = InvoiceProficiency.objects.update_or_create(
                            work_order_number=wo_num,
                            defaults={
                                "technician_name": tech_name,
                                "work_order_date": parsed_wo_date,
                                "invoice_date": parsed_inv_date or parsed_wo_date,
                                "invoice_number": invoice_num or wo_row.get("Invoice") or wo_row.get("Column_10"),
                                "assignment_completed": (wo_row.get("Assignment Completed") or wo_row.get("Column_11")) == "Yes",
                                # worked_time_hours is raw from scraper (in decimal hours)
                                "worked_time_hours": round(worked_hours, 4),
                                # invoiced_time_hours and proficiency_percentage are NOT set here;
                                # they are auto-calculated by InvoiceProficiency.save()
                                "total_amount": invoice_total,
                                "customer_name": wo_row.get("Customer") or wo_row.get("Column_3") or "Unknown",
                                "priority": priority,
                                "task_name": task,
                                "items_detail": items_detail,
                                "work_order_summary": f"Excavation: {excavation_status}" if excavation_status else wo_summary
                            }
                        )
                        processed_count += 1
                        print(f"DEBUG: Saved/Updated WO {wo_num} ({'Created' if created else 'Updated'})")
                    except Exception as db_err:
                        print(f"❌ Database error saving WO {wo_num}: {db_err}")

                # SPEC RULE: "Need error report if invoices do not correspond to a workorder."
                # Check for orphan invoices in Table 1 that have no matching WO in Table 0.
                table_0_wos = set()
                for wo_row in table_0:
                    wo = (wo_row.get("Work Order") or wo_row.get("Work Order #") or 
                          wo_row.get("WO #") or wo_row.get("Column_2") or "")
                    if wo:
                        table_0_wos.add(str(wo).strip())
                
                orphan_wos = set(items_by_wo.keys()) - table_0_wos
                if orphan_wos:
                    print(f"\n⚠️ ORPHAN INVOICE REPORT: {len(orphan_wos)} invoice WO(s) have no matching Work Performance entry:")
                    for orphan_wo in sorted(orphan_wos):
                        orphan_items = items_by_wo[orphan_wo]
                        inv = orphan_items[0].get("Invoice") or orphan_items[0].get("Column_11") or "N/A"
                        print(f"   - WO {orphan_wo} (Invoice: {inv}, {len(orphan_items)} item(s))")

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
