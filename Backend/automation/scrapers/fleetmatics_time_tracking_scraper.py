"""
Time Tracking Scraper
Scrapes technician time tracking records from Fleetmatics Reveal.

Flow per date:
  1. Navigate to Replay page
  2. Enter the date
  3. Capture ActivityTimeline network data
  4. Match captured data against DB records
"""

import asyncio
import sys
import os
import django
import re
import time as _time
from datetime import datetime, date
from asgiref.sync import sync_to_async


def setup_django():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if project_root not in sys.path:
        sys.path.append(project_root)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    try:
        django.setup()
    except Exception as e:
        print(f"Django setup warning: {e}")

setup_django()

from automation.scrapers.base_scraper import BaseScraper


class TimeTrackingScraper(BaseScraper):

    def __init__(self):
        super().__init__()

    async def run(self):
        _start_time = _time.time()
        _error_occurred = None
        pending_records = []
        print("\n=== Starting Time Tracking Scraper ===")

        try:
            # ─────────────────────────────────────────
            # STEP 1 — Navigate to the Replay page
            # ─────────────────────────────────────────
            await self.initialize()
            await self.login_fleetmatics()

            print("Navigating to Replay tab...")
            await self.page.goto(
                "https://reveal.fleetmatics.com/replay/",
                wait_until="networkidle"
            )
            await self.page.wait_for_selector("input#lblDate", timeout=30000)
            print("✅ Replay page ready.")

            # Determine which dates to process
            from time_tracking.models import TimeTracking

            from django.db.models import Q
            pending_records = await sync_to_async(list)(
                TimeTracking.objects.filter(Q(fleetmatics_data__isnull=True) | Q(fleetmatics_data=[]))
            )

            # Build date → records map from pending records
            dates_map: dict[str, list] = {}
            for r in pending_records:
                key = r.date.strftime("%m/%d/%Y")
                dates_map.setdefault(key, []).append(r)

            print(f"Dates to scrape: {list(dates_map.keys())}")
            print(f"Pending DB records: {len(pending_records)}")

            # ─────────────────────────────────────────
            # Loop over each date
            # ─────────────────────────────────────────
            for date_str, date_records in dates_map.items():
                print(f"\n{'='*50}")
                print(f"  Date: {date_str}  |  DB records: {len(date_records)}")
                print(f"{'='*50}")

                # ─────────────────────────────────────
                # STEP 2 — Enter the date
                # (listener attached BEFORE typing so
                #  we don't miss the network response)
                # ─────────────────────────────────────
                activity_responses = []

                async def handle_response(response):
                    if "ActivityTimeline" in response.url and response.status == 200:
                        try:
                            data = await response.json()
                            activity_responses.append(data)
                            print(f"  📥 ActivityTimeline captured: {response.url[:80]}...")
                        except Exception:
                            pass

                self.page.on("response", handle_response)

                print(f"  Entering date: {date_str}")
                date_input = self.page.locator("input#lblDate")
                await date_input.click()
                await asyncio.sleep(0.3)
                await date_input.click(click_count=3)  # Select all existing text
                await date_input.type(date_str, delay=50)
                
                # Press Enter on the keyboard to submit and trigger data load
                await self.page.keyboard.press("Enter")
                print("  Pressed Enter - waiting for data to load...")
                
                # Wait for network to become idle
                print("  Waiting for network data to load...")
                try:
                    await self.page.wait_for_load_state("networkidle", timeout=15000)
                except:
                    print("  (Network did not go idle, but proceeding to check captured data)")

                # Wait up to 30 s for responses with activities to arrive
                print("  Waiting for non-empty ActivityTimeline data...")
                for _ in range(60):
                    any_activities = False
                    for data in activity_responses:
                        if self._extract_activities(data):
                            any_activities = True
                            break
                    if any_activities:
                        await asyncio.sleep(2)   # let any straggling responses land
                        break
                    await asyncio.sleep(0.5)

                self.page.remove_listener("response", handle_response)

                if not activity_responses:
                    print(f"  ⚠️ No ActivityTimeline data for {date_str}. Saving screenshot.")
                    await self.page.screenshot(path=f"no_data_{date_str.replace('/', '-')}.png")
                    continue

                print(f"  ✅ Captured {len(activity_responses)} response(s).")

                # ─────────────────────────────────────
                # STEP 3 — Match captured data to records
                # ─────────────────────────────────────
                if not date_records:
                    print("  No DB records for this date — skipping match step.")
                    continue

                print(f"  Matching against {len(date_records)} DB record(s)...")
                match_found = False

                for data in activity_responses:
                    print(f"  Raw snapshot: {str(data)[:500]}...")

                    activities = self._extract_activities(data)

                    if not activities:
                        print("  ⚠️ Could not extract activities from response.")
                        continue

                    print(f"  {len(activities)} activities to check.")

                    for act in activities:
                        ecn = str(act.get("ecn", "")).lower()
                        aloc = act.get("aloc", "")

                        if not any(x in ecn for x in ["stop", "idle", "inactive", "moving"]):
                            continue
                        if not aloc:
                            continue

                        for record in date_records:
                            if self._address_match(aloc, record.full_address):
                                v_name = act.get('vehicle_name', 'Unknown')
                                print(f"  🎯 MATCH  WO={record.wo_number} | Vehicle={v_name}")
                                print(f"     DB : {record.full_address}")
                                print(f"     FM : {aloc}")
                                await self._update_record(record, act)
                                match_found = True
                            else:
                                print(f"  ✗ No match | DB: {record.full_address[:40]} | FM: {aloc[:40]}")

                if not match_found:
                    print(f"  No matches found for {date_str}.")

            print("\n=== Time Tracking Scraper complete ===")
            return pending_records

        except Exception as e:
            print(f"Fatal scraper error: {e}")
            import traceback
            _error_occurred = f"{str(e)}\n{traceback.format_exc()}"
            traceback.print_exc()
            return None
        finally:
            await self.cleanup()
            
            # ── Log execution result to ScraperExecutionLog and Incident ──
            _elapsed = _time.time() - _start_time
            try:
                from status.models import ScraperExecutionLog, Incident
                from django.utils import timezone
                
                def _log_execution():
                    ScraperExecutionLog.objects.create(
                        scraper_name="fleetmatics-time-tracking-scraper",
                        status="error" if _error_occurred else "success",
                        error_message=_error_occurred,
                        records_processed=len(pending_records) if pending_records else 0,
                        execution_time_seconds=round(_elapsed, 2),
                    )
                    
                    if _error_occurred:
                        incident, created = Incident.objects.get_or_create(
                            service_name="fleetmatics-time-tracking-scraper",
                            status="active",
                            defaults={
                                "title": "Fleetmatics Time Tracking Scraper Error",
                                "description": _error_occurred
                            }
                        )
                        if not created:
                            incident.description = _error_occurred
                            incident.save()
                    else:
                        active_incidents = Incident.objects.filter(
                            service_name="fleetmatics-time-tracking-scraper",
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

    # ─────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────

    def _extract_activities(self, data) -> list:
        """Pull the activity list out of whatever structure Fleetmatics returns."""
        activities = []
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            if "Data" in data:
                d = data["Data"]
                if isinstance(d, list):
                    return d
                if isinstance(d, dict):
                    activities = d.get("Activities", [])
                    if not activities:
                        v_list = d.get("taList", [])
                        print(f"  Checking {len(v_list)} vehicle(s) in taList...")
                        for v in v_list:
                            v_ta = v.get("ta", [])
                            v_name = v.get("vl")
                            if v_ta:
                                print(f"    - Vehicle {v_name} has {len(v_ta)} activities.")
                                # Inject vehicle name into each activity
                                for act in v_ta:
                                    act["vehicle_name"] = v_name
                                activities.extend(v_ta)
                    if not activities:
                        print(f"  Data keys: {list(d.keys())}")
            elif "Activities" in data:
                activities = data["Activities"]
            elif "Vehicles" in data:
                for v in data["Vehicles"]:
                    v_name = v.get("Name") or v.get("vl") or v.get("VehicleName")
                    v_acts = v.get("Activities", [])
                    if v_acts and v_name:
                        for act in v_acts:
                            act["vehicle_name"] = v_name
                    activities.extend(v_acts)
        return activities

    def _address_match(self, scraped: str, db_addr: str) -> bool:
        """
        Return True if scraped address likely matches the DB address.
        Uses partial matching with a minimum threshold.
        """
        if not scraped or not db_addr:
            return False
        
        # Clean both addresses (remove punctuation, normalize case)
        s = re.sub(r'[^a-z0-9\s]', '', scraped.lower())
        d = re.sub(r'[^a-z0-9\s]', '', db_addr.lower())
        
        # Split into words
        s_words = set(s.split())
        d_words = set(d.split())
        
        # Calculate overlap ratio
        if not d_words:
            return False
        
        common_words = s_words & d_words
        overlap_ratio = len(common_words) / len(d_words)
        
        # Special handling for partial matches like "32217 vs 32261"
        # Extract numbers from both addresses
        s_numbers = re.findall(r'\d+', scraped)
        d_numbers = re.findall(r'\d+', db_addr)
        
        number_match = False
        if s_numbers and d_numbers:
            # Check if any numbers partially match (first 3 digits, etc.)
            for s_num in s_numbers:
                for d_num in d_numbers:
                    # Partial number match (first 3 digits or last 3 digits)
                    if (len(s_num) >= 3 and len(d_num) >= 3 and 
                        (s_num[:3] == d_num[:3] or s_num[-3:] == d_num[-3:])):
                        number_match = True
                        print(f"     ℹ️ Partial number match: {s_num} ≈ {d_num}")
                        break
                if number_match:
                    break
        
        # Street name matching (ignore numbers for street comparison)
        s_street = re.sub(r'^\d+\s+', '', s)  # Remove leading numbers
        d_street = re.sub(r'^\d+\s+', '', d)
        s_street_words = set(s_street.split())
        d_street_words = set(d_street.split())
        
        street_overlap = 0
        if d_street_words:
            street_overlap = len(s_street_words & d_street_words) / len(d_street_words)
        
        # Decision logic - MINIMUM MATCHING:
        # Accept if:
        # 1. At least 40% word overlap, OR
        # 2. Street name has 50%+ overlap AND numbers partially match, OR
        # 3. At least one full word matches AND numbers partially match
        
        result = False
        
        # Case 1: Good word overlap
        if overlap_ratio >= 0.4:
            result = True
            print(f"     ℹ️ Word overlap: {overlap_ratio:.0%} ({len(common_words)}/{len(d_words)} words)")
        
        # Case 2: Street name matches well + partial number match
        elif street_overlap >= 0.5 and number_match:
            result = True
            print(f"     ℹ️ Street match ({street_overlap:.0%}) + partial number match")
        
        # Case 3: At least one significant word matches + number match
        elif number_match and len(common_words) >= 1:
            # Check if the common word is meaningful (not a short word like "dr", "rd")
            meaningful_words = {w for w in common_words if len(w) > 2 and w not in {'the', 'and', 'for', 'dr', 'rd', 'st', 'ave', 'ln'}}
            if meaningful_words:
                result = True
                print(f"     ℹ️ Partial match: '{', '.join(meaningful_words)}' + number match")
        
        # Debug output for non-matches (to help tune thresholds)
        if not result:
            print(f"     🔍 Match analysis: overlap={overlap_ratio:.0%}, street={street_overlap:.0%}, num_match={number_match}")
            print(f"        DB words: {d_words}")
            print(f"        FM words: {s_words}")
        
        return result

    @sync_to_async
    def _update_record(self, record, act):
        """Append matching Fleetmatics activity to the record's data list."""
        try:
            # Prepare the activity object
            activity_obj = {
                "arrival_time": act.get("ast"),
                "departure_time": act.get("aet"),
                "duration": float(act.get("ActivityDurationMin", 0)),
                "category": act.get("ecn"),
                "address": act.get("aloc"),
                "vehicle_name": act.get("vehicle_name")
            }

            # Initialize fleetmatics_data if it's None
            if record.fleetmatics_data is None:
                record.fleetmatics_data = []

            # Check if this activity already exists (simple deduplication by start time)
            if not any(a.get("arrival_time") == activity_obj["arrival_time"] for a in record.fleetmatics_data):
                record.fleetmatics_data.append(activity_obj)
                record.save()
                print(f"     ✅ Appended activity to WO {record.wo_number}")
            else:
                print(f"     ℹ️ Activity already exists for WO {record.wo_number}")
                
        except Exception as e:
            print(f"     ❌ Save failed: {e}")


if __name__ == "__main__":
    scraper = TimeTrackingScraper()
    asyncio.run(scraper.run())