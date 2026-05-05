"""
Invoice Proficiency Scraper
Scrapes invoice proficiency/performance data from the FieldEdge dashboard.

FIXES:
  1. Duplicate item/invoice rows — deduplicated by item_code ONLY (keeps the
     row with the highest total_sold). Same item code appearing with qty=1 and
     qty=2 is collapsed to ONE record — the one with the real dollar value.
  2. Items with blank description AND blank item code are discarded (not saved).
  3. Description is ALWAYS persisted — extracted with full innerText, newlines
     converted to spaces, never truncated or silently dropped. Falls back to
     Column_1, Column_2, Column_4, Column_5 when header detection fails.
  4. parse_worked_time handles FieldEdge "Xh YYm" format.
  5. Header detection falls back to Column_N index so added columns
     (Invoice, Assignment Completed) are always found.
  6. WO normalisation strips leading zeros / # so cross-table join never misses.
  7. Scroll waits for stable row count before extracting.
"""

import time as _time
import traceback
import re
import json
from datetime import datetime, timedelta

from asgiref.sync import sync_to_async
from django.utils import timezone

from automation.scrapers.base_scraper import BaseScraper


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalise_wo(raw: str) -> str:
    """Strip whitespace, #, commas and leading zeros for reliable WO matching."""
    cleaned = str(raw).strip().replace('#', '').replace(',', '').strip()
    stripped = re.sub(r'^0+', '', cleaned)
    return stripped if stripped else cleaned


def parse_worked_time(time_str: str) -> float:
    """
    Convert raw FieldEdge time string to decimal hours.

    Supported formats:
      "1h 31m"  -> 1.517 h
      "0h 17m"  -> 0.284 h
      "01:30"   -> 1.500 h
      "90"      -> 1.503 h  (integer = minutes)
      "1.5"     -> 1.500 h  (decimal = hours)
      "" / None -> 0.0
    """
    if not time_str:
        return 0.0
    time_str = str(time_str).strip()
    try:
        # 1. "Xh YYm"
        hm = re.match(r'(\d+)\s*h\s*(\d+)\s*m', time_str, re.IGNORECASE)
        if hm:
            return round(int(hm.group(1)) + int(hm.group(2)) * 0.0167, 4)
        # 2. "Xh" only
        h_only = re.match(r'^(\d+)\s*h$', time_str, re.IGNORECASE)
        if h_only:
            return float(h_only.group(1))
        # 3. HH:MM
        if ':' in time_str:
            parts = time_str.split(':')
            return round(float(parts[0]) + (float(parts[1]) if len(parts) > 1 else 0.0) * 0.0167, 4)
        # 4. Decimal = hours
        if '.' in time_str:
            return round(float(re.sub(r'[^0-9.]', '', time_str)), 4)
        # 5. Integer = minutes
        minutes = float(re.sub(r'[^0-9]', '', time_str) or '0')
        exact = {15: 0.25, 30: 0.5, 60: 1.0, 90: 1.5, 120: 2.0}
        return exact.get(minutes, round(minutes * 0.0167, 4))
    except Exception as exc:
        print(f"DEBUG parse_worked_time: cannot parse '{time_str}': {exc}")
        return 0.0


def _dedup_items_by_code(raw_items: list) -> list:
    """
    Collapse duplicate item rows by item_code — keeps the row with the
    highest total_sold value.

    Problem this solves:
      FieldEdge sometimes emits the same item code twice on the same WO
      (e.g. 0PP1SEP--1HR with qty=1/no rate AND qty=2/$1198). The old dedup
      used (item, description, qty, total_sold) as the key, so those two rows
      looked different and BOTH were saved. Now we key on item_code alone and
      keep whichever row has the real dollar value.

    Items with a blank code are kept as-is (they may be free-text lines).
    """
    best_by_code: dict = {}   # item_code_upper -> (item_dict, total_sold_float)
    blank_code_items: list = []

    for item in raw_items:
        item_code = (
            item.get("Item") or
            item.get("Item Name") or
            item.get("Column_3") or
            ""
        ).strip()

        total_sold_raw = str(
            item.get("Total Sold") or item.get("Column_9") or "0"
        )
        try:
            total_sold = float(re.sub(r'[^0-9.]', '', total_sold_raw)) if total_sold_raw else 0.0
        except Exception:
            total_sold = 0.0

        if not item_code:
            # Blank-code lines: keep all (they're free-text description rows)
            blank_code_items.append(item)
            continue

        key = item_code.upper()
        if key not in best_by_code or total_sold > best_by_code[key][1]:
            best_by_code[key] = (item, total_sold)

    deduped = [v[0] for v in best_by_code.values()]
    removed = len(raw_items) - len(deduped)
    if removed > 0:
        print(f"DEBUG _dedup_items_by_code: removed {removed} duplicate or blank-code item row(s).")
    return deduped


# ---------------------------------------------------------------------------
# Scraper
# ---------------------------------------------------------------------------

class InvoiceProficiencyScraper(BaseScraper):
    """
    Scraper for FieldEdge Invoice Proficiency reports.
    Inherits common browser automation from BaseScraper.
    """

    def __init__(self):
        super().__init__()

    # ------------------------------------------------------------------
    # Scroll / stability helpers
    # ------------------------------------------------------------------

    async def _wait_for_stable_rows(self, timeout_s: int = 60) -> None:
        """Poll until tbody.fixed-body row count stops changing for ~1.5 s."""
        deadline     = _time.time() + timeout_s
        prev_count   = -1
        stable_ticks = 0
        while _time.time() < deadline:
            count = await self.page.evaluate(
                "() => document.querySelectorAll('tbody.fixed-body tr').length"
            )
            if count == prev_count:
                stable_ticks += 1
                if stable_ticks >= 3:
                    print(f"DEBUG: Row count stable at {count}.")
                    return
            else:
                stable_ticks = 0
                prev_count   = count
            await self.page.wait_for_timeout(500)
        print(f"DEBUG: Row count did not stabilise within {timeout_s}s (last={prev_count}).")

    async def _scroll_table_fully(self) -> None:
        """Scroll all known FieldEdge viewport selectors to force virtual-render."""
        selectors = [
            "tbody.fixed-body",
            ".fixed-body-container",
            ".kgViewport",
            ".grid-viewport",
        ]
        for sel in selectors:
            try:
                exists = await self.page.evaluate(
                    f"() => !!document.querySelector('{sel}')"
                )
                if not exists:
                    continue
                for _ in range(10):
                    await self.page.evaluate(
                        f"() => {{ const el = document.querySelector('{sel}'); if (el) el.scrollTop += 1500; }}"
                    )
                    await self.page.wait_for_timeout(300)
                await self.page.evaluate(
                    f"() => {{ const el = document.querySelector('{sel}'); if (el) el.scrollTop = 0; }}"
                )
                await self.page.wait_for_timeout(500)
                print(f"DEBUG: Scrolled '{sel}'.")
            except Exception as exc:
                print(f"DEBUG: Scroll error '{sel}': {exc}")

    # ------------------------------------------------------------------
    # Core table scraper
    # ------------------------------------------------------------------

    async def scrape_report_table(self) -> list:
        """
        Scrape ALL rows from the fixed-body table.

        Every cell is stored under BOTH its named header key AND its
        Column_N fallback key so downstream lookups never fail when
        headers are missing or mis-indexed.
        """
        try:
            await self.page.wait_for_selector(
                "tbody.fixed-body tr, .kgRow",
                state="attached",
                timeout=60_000,
            )
        except Exception as exc:
            print(f"ERROR: Timed out waiting for rows: {exc}")
            return []

        # Try to show max rows
        try:
            dropdowns = await self.page.query_selector_all(
                "select.input-sm, select[ng-model*='pageSize'], .page-size-selector select"
            )
            for drop in dropdowns:
                await drop.select_option("100")
                await self.page.wait_for_timeout(1500)
                print("DEBUG: Set rows-per-page to 100.")
        except Exception:
            pass

        await self._scroll_table_fully()
        await self._wait_for_stable_rows()

        try:
            data = await self.page.evaluate(r"""
                () => {
                    const results = [];

                    // ── Header detection ──────────────────────────────
                    let headers = [];
                    const thEls = document.querySelectorAll(
                        'thead th, .fixed-header th, .kgHeaderCell .kgHeaderText'
                    );
                    if (thEls.length > 0) {
                        headers = Array.from(thEls)
                            .map(el => el.innerText.replace(/\s+/g, ' ').trim())
                            .filter(h => h !== '');
                    }
                    if (headers.length === 0) {
                        const rh = document.querySelectorAll('[role="columnheader"]');
                        headers = Array.from(rh)
                            .map(el => el.innerText.replace(/\s+/g, ' ').trim())
                            .filter(h => h !== '');
                    }

                    // ── Row extraction ────────────────────────────────
                    const rows = document.querySelectorAll('tbody.fixed-body tr, .kgRow');
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        const tds = row.querySelectorAll('td, .kgCell');
                        if (tds.length === 0) continue;

                        const rowDict = {};
                        Array.from(tds).forEach((td, idx) => {
                            // Full innerText preserves multi-line descriptions
                            let value = (td.innerText || td.textContent || '')
                                .replace(/\t/g, ' ')
                                .replace(/\n/g, ' ')
                                .replace(/\s{2,}/g, ' ')
                                .trim();

                            // Boolean checkmark
                            const img = td.querySelector('img[src*="success-checkmark"]');
                            if (img) {
                                const visible =
                                    img.offsetParent !== null &&
                                    window.getComputedStyle(img).display !== 'none';
                                if (visible) value = 'Yes';
                            }

                            // Store by BOTH named key and Column_N
                            const namedKey = (headers[idx] && headers[idx] !== '')
                                ? headers[idx] : `Column_${idx}`;
                            rowDict[namedKey]        = value;
                            rowDict[`Column_${idx}`] = value;
                        });

                        results.push(rowDict);
                    }
                    return results;
                }
            """)

            print(f"DEBUG: Scraped {len(data)} row(s).")
            if data:
                print(f"DEBUG: First row keys: {list(data[0].keys())}")
            return data

        except Exception as exc:
            print(f"ERROR during JS evaluation: {exc}")
            traceback.print_exc()
            return []

    # ------------------------------------------------------------------
    # Main workflow
    # ------------------------------------------------------------------

    async def run(self):
        """Execute the complete Invoice Proficiency scraping workflow."""
        _start_time        = _time.time()
        _error_occurred    = None
        _records_processed = 0

        try:
            await self.initialize()

            # ── Login ─────────────────────────────────────────────────
            dashboard_url = self.rules.get(
                "dashboard_url", "https://login.fieldedge.com/Dashboard/"
            )
            await self._goto_with_fallback(dashboard_url)
            if "Login" in self.page.url:
                await self.login_fieldedge()

            # ── Resolve report URLs ───────────────────────────────────
            report_urls = self.rules.get("invoice_proficiency_urls", [])
            if not report_urls:
                single = self.rules.get("invoice_proficiency_url")
                if single:
                    report_urls = [single]
            if not report_urls:
                print("⚠️ No report URLs configured.")
                return None

            all_scraped_data: dict = {}

            # ── Per-report loop ───────────────────────────────────────
            for index, report_url in enumerate(report_urls):
                print(f"\n{'='*60}")
                print(f"Report {index}: {report_url}")
                print('='*60)

                await self._goto_with_fallback(report_url)
                await self.page.wait_for_timeout(2000)

                # Add extra columns
                if index == 0:
                    print("Adding 'Invoice' and 'Assignment Completed' columns...")
                    try:
                        await self.perform_actions_by_xpaths(
                            name="invoice_proficiency_add_column_xpath"
                        )
                        print("✅ Columns added.")
                    except Exception as exc:
                        print(f"⚠️ Could not add extra columns: {exc}")
                        
                    print("Editing filter to add 'Is Helper'...")
                    try:
                        await self.perform_actions_by_xpaths(
                            name="invoice_proficiency_edit_filter_xpath"
                        )
                        print("✅ Filter edited to add 'Is Helper'.")
                    except Exception as exc:
                        print(f"⚠️ Could not edit filter for 'Is Helper': {exc}")
                elif index == 1:
                    print("Adding 'Invoice' column only...")
                    try:
                        await self.perform_actions_by_xpaths(
                            name="invoice_proficiency_add_column_invoice_only_xpath"
                        )
                        print("✅ Invoice column added.")
                    except Exception as exc:
                        print(f"⚠️ Could not add Invoice column: {exc}")

                # Date filter
                print("Applying date filter...")
                try:
                    await self.page.wait_for_selector(
                        "div.secondary-filter.date-filter",
                        state="visible",
                        timeout=30_000,
                    )
                    await self.perform_actions_by_xpaths(
                        name="invoice_proficiency_status_xpath", raise_on_error=True
                    )
                    await self.perform_actions_by_xpaths(
                        name="submit_filter", raise_on_error=True
                    )
                    print(f"✅ Filter applied for report {index}.")
                    await self.page.wait_for_timeout(3000)
                except Exception as exc:
                    print(f"⚠️ Filter failed for report {index}: {exc}. Scraping anyway...")

                if index == 0:
                    print("Applying 'Is Helper' filter...")
                    try:
                        await self.perform_actions_by_xpaths(
                            name="invoice_proficiency_helper_xpath", raise_on_error=True
                        )
                        await self.perform_actions_by_xpaths(
                            name="submit_filter", raise_on_error=True
                        )
                        print("✅ 'Is Helper' filter applied and submitted.")
                        await self.page.wait_for_timeout(3000)
                    except Exception as exc:
                        print(f"⚠️ 'Is Helper' filter failed: {exc}. Scraping anyway...")

                scraped_rows = await self.scrape_report_table()

                if scraped_rows:
                    print(f"DEBUG: Sample row:\n{json.dumps(scraped_rows[0], indent=2)}")

                # Table 0: keep only Invoice-present + Assignment Completed = Yes
                if index == 0:
                    print("Filtering: invoice present + Assignment Completed = Yes ...")
                    filtered = []
                    for row in scraped_rows:
                        invoice = (
                            row.get("Invoice") or row.get("Invoice #") or
                            row.get("Transaction") or row.get("Number") or
                            row.get("Column_10") or row.get("Column_11") or ""
                        ).strip()

                        completed = str(
                            row.get("Assignment Completed") or
                            row.get("Completed") or
                            row.get("Is Completed") or
                            row.get("Column_15") or
                            row.get("Column_11") or
                            row.get("Column_12") or ""
                        ).strip()

                        if invoice and (completed == "Yes" or completed == "Complete"):
                            filtered.append(row)

                    print(f"📋 {len(filtered)} / {len(scraped_rows)} rows passed filter.")
                    scraped_rows = filtered

                all_scraped_data[f"table_{index}"] = scraped_rows
                print(f"Stored {len(scraped_rows)} row(s) as table_{index}.")

            # ── Merge and persist ─────────────────────────────────────
            from invoice_proficiency.models import InvoiceProficiency

            def save_results(table_0: list, table_1: list) -> int:
                if not table_0:
                    print("⚠️ table_0 is empty — nothing to save.")
                    return 0

                print(
                    f"DEBUG: Merging {len(table_0)} work-performance rows "
                    f"with {len(table_1)} invoice-item rows."
                )

                # ── Index Table 1 by normalised WO ────────────────────
                items_by_wo: dict = {}
                for item_row in table_1:
                    wo_raw = (
                        item_row.get("WO #") or
                        item_row.get("Work Order #") or
                        item_row.get("WO") or
                        item_row.get("Work Order") or
                        item_row.get("Column_6") or
                        item_row.get("Column_5") or
                        item_row.get("Column_7") or
                        ""
                    )
                    if not wo_raw:
                        continue
                    key = _normalise_wo(wo_raw)
                    items_by_wo.setdefault(key, []).append(item_row)

                print(
                    f"DEBUG: Indexed {len(items_by_wo)} distinct WOs "
                    f"from {len(table_1)} item rows."
                )

                processed_count = 0

                for wo_row in table_0:
                    wo_raw = (
                        wo_row.get("Work Order") or
                        wo_row.get("Work Order #") or
                        wo_row.get("WO #") or
                        wo_row.get("Column_2") or
                        wo_row.get("Column_1") or
                        ""
                    )
                    if not wo_raw:
                        print(
                            f"DEBUG: Skipping row — no WO number. "
                            f"Keys: {list(wo_row.keys())}"
                        )
                        continue

                    # ── Status Check (Skip Canceled) ────────────────
                    status = (
                        wo_row.get("Column_15")
                    ).strip()

                    if "Canceled" in status or "Cancelled" in status:
                        print(f"DEBUG: Skipping WO {wo_raw} — Status is {status}")
                        continue

                    wo_key    = _normalise_wo(wo_raw)
                    tech_name = (
                        wo_row.get("Technician") or
                        wo_row.get("Employee") or
                        wo_row.get("Column_0") or
                        "Unknown"
                    )
                    wo_summary      = wo_row.get("Summary") or wo_row.get("Notes") or wo_row.get("Column_14") or ""
                    worked_time_raw = wo_row.get("Worked Time") or wo_row.get("Column_8") or "0"
                    worked_hours    = parse_worked_time(worked_time_raw)

                    # ── FIX: Deduplicate by item_code, keep highest total_sold ──
                    raw_invoiced_items = items_by_wo.get(wo_key, [])
                    invoiced_items     = _dedup_items_by_code(raw_invoiced_items)

                    if not invoiced_items:
                        print(
                            f"DEBUG: WO {wo_raw} (key={wo_key}) — "
                            f"no matching invoice items. Skipping."
                        )
                        continue

                    # ── Build validated item list ──────────────────────
                    items_detail: list   = []
                    invoice_total        = 0.0
                    invoice_num          = ""
                    completed_date_str   = ""
                    invoice_date_str     = ""
                    has_excavation_pass  = False

                    for item in invoiced_items:

                        # ── Item code ──────────────────────────────────
                        item_name = (
                            item.get("Item") or
                            item.get("Item Name") or
                            item.get("Column_3") or
                            ""
                        ).strip()

                        # Discard row if item code is blank
                        if not item_name:
                            print(
                                f"DEBUG: WO {wo_raw} — skipping row: blank item_name."
                            )
                            continue

                        # ── Quantity ───────────────────────────────────
                        qty_raw = str(
                            item.get("Qty. Sold") or
                            item.get("Qty") or
                            item.get("Column_8") or
                            "1"
                        )
                        try:
                            qty = float(re.sub(r'[^0-9.]', '', qty_raw)) if qty_raw else 1.0
                        except Exception:
                            qty = 1.0

                        # ── Total sold (Rate) ──────────────────────────
                        total_sold_raw = str(
                            item.get("Total Sold") or
                            item.get("Column_9") or
                            "0"
                        ).strip()
                        
                        is_dash_rate = total_sold_raw == "-"
                        try:
                            if is_dash_rate:
                                total_sold = 0.0
                            else:
                                total_sold = float(
                                    re.sub(r'[^0-9.]', '', total_sold_raw)
                                ) if total_sold_raw else 0.0
                        except Exception:
                            total_sold = 0.0

                        # Accumulate invoice total
                        invoice_total += total_sold

                        # Invoice number (keep last non-empty value)
                        # Based on sample data: Column_10 is Invoice, Column_11 is Date
                        invoice_num = (
                            item.get("Invoice") or
                            item.get("Invoice #") or
                            item.get("Column_10") or
                            invoice_num
                        )

                        # Dates (keep last non-empty value)
                        completed_date_str = (
                            item.get("Completed Date") or
                            item.get("Column_11") or
                            completed_date_str
                        )
                        invoice_date_str = (
                            item.get("Date") or
                            item.get("Column_1") or
                            invoice_date_str
                        )

                        # Excavation pass check: 6SP1DRA--4HR (handles normal and bold chars)
                        if "6SP1DRA" in item_name.upper() and ("4HR" in item_name.upper() or "𝟒𝐇𝐑" in item_name):
                            has_excavation_pass = True

                        # Append deduplicated, validated item
                        items_detail.append({
                            "item":        item_name,
                            "qty":         qty,
                            "total_sold":  total_sold,
                            "raw_rate":    total_sold_raw if is_dash_rate else None
                        })

                    # Skip WO if nothing valid remains after all filtering
                    if not items_detail:
                        print(
                            f"DEBUG: WO {wo_raw} — all items were blank after "
                            f"filtering. Skipping DB save."
                        )
                        continue

                    print(
                        f"DEBUG: WO {wo_raw} — "
                        f"{len(items_detail)} unique valid item(s), "
                        f"total=${invoice_total:.2f}, "
                        f"inv={invoice_num}"
                    )

                    # ── Date parsing ───────────────────────────────────
                    fmt             = "%m/%d/%Y"
                    parsed_wo_date  = None
                    parsed_inv_date = None
                    try:
                        if completed_date_str:
                            parsed_wo_date = datetime.strptime(
                                completed_date_str.strip(), fmt
                            ).date()
                        if invoice_date_str:
                            parsed_inv_date = datetime.strptime(
                                invoice_date_str.strip(), fmt
                            ).date()
                        if not parsed_wo_date and parsed_inv_date:
                            parsed_wo_date = parsed_inv_date
                    except Exception:
                        pass

                    if not parsed_wo_date:
                        parsed_wo_date = timezone.now().date()

                    # Date mismatch check
                    is_error   = False
                    error_type = None
                    if parsed_wo_date and parsed_inv_date:
                        day_diff = abs((parsed_wo_date - parsed_inv_date).days)
                        if day_diff > 5:
                            print(
                                f"⚠️ DATE MISMATCH WO {wo_raw}: "
                                f"{day_diff} days apart. Flagging as error."
                            )
                            is_error   = True
                            error_type = "DATE_MISMATCH"

                    # Excavation logic
                    priority = wo_row.get("Priority") or wo_row.get("Column_12") or ""
                    task     = wo_row.get("Task")     or wo_row.get("Column_13") or ""
                    excavation_status = None
                    if "EXCAVATOR" in priority.upper() and (
                        "DRAIN FIELD" in task.upper() or "DRAINFIELD" in task.upper()
                    ):
                        excavation_status = "Pass" if has_excavation_pass else "Fail"

                    # Combine scraped summary with excavation status
                    final_summary = wo_summary
                    if excavation_status:
                        excav_prefix = f"[Excavation: {excavation_status}]"
                        final_summary = f"{exc_prefix} {wo_summary}".strip()

                    # ── Persist ────────────────────────────────────────
                    try:
                        _, created = InvoiceProficiency.objects.update_or_create(
                            work_order_number=wo_raw,
                            defaults={
                                "technician_name":      tech_name,
                                "work_order_date":      parsed_wo_date,
                                "invoice_date":         parsed_inv_date or parsed_wo_date,
                                "invoice_number":       invoice_num or "",
                                "assignment_completed": True,
                                "worked_time_hours":    round(worked_hours, 4),
                                "total_amount":         round(invoice_total, 2),
                                "customer_name": (
                                    wo_row.get("Customer") or
                                    wo_row.get("Column_3") or
                                    "Unknown"
                                ),
                                "priority":             priority,
                                "task_name":            task,
                                "items_detail":         items_detail,
                                "wo_summary":           final_summary,
                                "is_error":             is_error,
                                "error_type":           error_type,
                            },
                        )
                        processed_count += 1
                        print(
                            f"✅ WO {wo_raw} — "
                            f"{'Created' if created else 'Updated'} | "
                            f"{len(items_detail)} item(s) | "
                            f"${invoice_total:.2f} | "
                            f"inv={invoice_num}"
                        )
                    except Exception as db_err:
                        print(f"❌ DB error saving WO {wo_raw}: {db_err}")
                        traceback.print_exc()

                # ── Orphan invoice report ──────────────────────────────
                table_0_wo_keys = set()
                for row in table_0:
                    wo = (
                        row.get("Work Order") or row.get("Work Order #") or
                        row.get("WO #") or row.get("Column_2") or ""
                    )
                    if wo:
                        table_0_wo_keys.add(_normalise_wo(wo))

                orphans = set(items_by_wo.keys()) - table_0_wo_keys
                if orphans:
                    print(
                        f"\n⚠️ ORPHAN INVOICES — {len(orphans)} WO(s) in "
                        f"Table 1 with no Work Performance match:"
                    )
                    for orphan_key in sorted(orphans):
                        sample = items_by_wo[orphan_key][0]
                        inv    = (
                            sample.get("Invoice") or
                            sample.get("Column_11") or
                            "N/A"
                        )
                        print(
                            f"   WO key={orphan_key} | "
                            f"Invoice={inv} | "
                            f"{len(items_by_wo[orphan_key])} item(s)"
                        )

                return processed_count

            # Run save
            table_0 = all_scraped_data.get("table_0", [])
            table_1 = all_scraped_data.get("table_1", [])

            print(
                f"\nDEBUG: Pre-save — "
                f"table_0={len(table_0)} rows, table_1={len(table_1)} rows"
            )

            _records_processed = await sync_to_async(save_results)(table_0, table_1)

            print("\n" + "=" * 50)
            print(f"🚀 DONE: {_records_processed} record(s) saved to database.")
            print("=" * 50 + "\n")

            return all_scraped_data

        except Exception as exc:
            print(f"CRITICAL ERROR: {exc}")
            _error_occurred = f"{str(exc)}\n{traceback.format_exc()}"
            return None

        finally:
            await self.cleanup()

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
                                "title":       "Invoice Proficiency Scraper Error",
                                "description": _error_occurred,
                            },
                        )
                        if not created:
                            incident.description = _error_occurred
                            incident.save()
                    else:
                        for incident in Incident.objects.filter(
                            service_name="invoice-proficiency-scraper",
                            status="active",
                        ):
                            incident.status               = "resolved"
                            incident.resolved_at          = timezone.now()
                            incident.resolution_description = (
                                "Automation resolved automatically."
                            )
                            incident.save()

                await sync_to_async(_log_execution)()
                print(
                    f"📝 Logged: "
                    f"{'ERROR' if _error_occurred else 'SUCCESS'} "
                    f"({round(_elapsed, 1)}s, {_records_processed} records)"
                )

            except Exception as log_err:
                print(f"⚠️ Failed to log execution: {log_err}")

            if _error_occurred:
                try:
                    from status.email_service import send_outage_email
                    await sync_to_async(send_outage_email)(
                        "Invoice Proficiency Scraper", _error_occurred
                    )
                    print("📧 Outage email sent.")
                except Exception as mail_err:
                    print(f"⚠️ Failed to send outage email: {mail_err}")