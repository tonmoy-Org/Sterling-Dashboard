"""
Work Orders Scraper
Scrapes work orders with complete status and extracts full addresses.
Updated to include Add Column functionality for Completed Date.
Updated to print all table data after filters are applied.
"""

from datetime import datetime
from asgiref.sync import sync_to_async
from django.utils.timezone import make_aware
from django.utils.timezone import get_current_timezone
from dispatcher_booked.serializers import DispatcherBookedSerializer
from automation.scrapers.base_scraper import BaseScraper


class DispatcherBookedScraper(BaseScraper):
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
            await self.page.goto(url, wait_until="networkidle", timeout=timeout_ms)
            return
        except Exception as e:
            print(f"⚠️ networkidle navigation failed for {url}: {e}")

        # Fallback for SPA pages where network never becomes fully idle.
        await self.page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)

    async def _get_booked_count(self, url, status_xpath):
        """
        Navigate to the given URL, apply a single dispatcher status filter,
        and extract the booked count from the page.

        Args:
            url: The URL to navigate to
            status_xpath: The xpath name for the specific status filter
        Returns:
            int: The booked count extracted from the page
        """
        if not url:
            raise ValueError("Booked count URL is missing.")

        await self._goto_with_fallback(url, timeout_ms=60000)

        current_url = (self.page.url or "").lower()
        if "/account/login" in current_url:
            print(
                "Detected login redirect while fetching booked count. Logging in and retrying target URL..."
            )
            await self.login_fieldedge()
            await self.page.wait_for_timeout(5000)
            await self._goto_with_fallback(url, timeout_ms=60000)

        # Apply the specific dispatcher status filter
        await self.perform_actions_by_xpaths(name=status_xpath, raise_on_error=True)
        await self.perform_actions_by_xpaths(name="submit_filter", raise_on_error=True)
        await self.page.wait_for_timeout(2000)

        count_xpath = self.rules.get("booked_count_get_xpath")

        # Wait for selector and extract text (safely return 0 if element isn't found)
        try:
            await self.page.wait_for_selector(
                count_xpath, state="visible", timeout=15000
            )
            count_text = await self.page.locator(count_xpath).inner_text()
            count_text = count_text.replace("(", "").replace(")", "").replace(",", "")
            count = int(count_text.strip())
            print(f"Extracted count for [{status_xpath}]: {count}")
            return count
        except Exception as e:
            print(
                f"Count element not found for [{status_xpath}] (timeout). Assuming 0."
            )
            return 0

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
        _details = {}

        try:
            await self.initialize()

            # Navigate to dispatch board
            dashboard_url = self.rules.get("dashboard_url")
            await self.page.goto(dashboard_url, wait_until="domcontentloaded")

            # Login if necessary
            if "Login" in self.page.url:
                await self.login_fieldedge()

            # Wait for page to settle after login
            await self.page.wait_for_timeout(4000)

            booked_urls = self.rules.get("booked_urls", {})
            if not booked_urls:
                print("No booked URLs configured.")
                _error_occurred = "No booked URLs configured in scraper rules."
                return None

            cameron_booked = await self._get_booked_count(
                booked_urls.get("cameron_booked"), "dispatcher_status_xpath"
            )
            cameron_non_booked = await self._get_booked_count(
                booked_urls.get("cameron_non_booked"), "dispatcher_status_xpath"
            )
            eric_booked = await self._get_booked_count(
                booked_urls.get("eric_booked"), "dispatcher_status_xpath"
            )
            eric_non_booked = await self._get_booked_count(
                booked_urls.get("eric_non_booked"), "dispatcher_status_xpath"
            )
            total_jobs_booked = await self._get_booked_count(
                booked_urls.get("booked"), "dispatcher_status_xpath"
            )
            all_leads = await self._get_booked_count(
                booked_urls.get("all_leads"), "dispatcher_status_xpath"
            )

            print(f"Cameron Booked: {cameron_booked}")
            print(f"Cameron Non-Booked: {cameron_non_booked}")
            print(f"Eric Booked: {eric_booked}")
            print(f"Eric Non-Booked: {eric_non_booked}")
            print(f"Total Jobs Booked: {total_jobs_booked}")
            print(f"All Leads: {all_leads}")

            # current_date = make_aware(datetime.now(), timezone=get_current_timezone())
            data = {
                # "date": current_date.date(),
                "cameron_booked": cameron_booked,
                "cameron_total": cameron_non_booked + cameron_booked,
                "eric_booked": eric_booked,
                "eric_total": eric_non_booked + eric_booked,
                "total_jobs_booked": total_jobs_booked,
                "all_leads": all_leads,
            }

            def save_data():
                serializer = DispatcherBookedSerializer(data=data)
                if serializer.is_valid():
                    instance = serializer.save()
                    message = getattr(instance, "_message", "Success")
                    print(f"✅ {message}")
                else:
                    print(f"❌ Validation error: {serializer.errors}")

            await sync_to_async(save_data)()
            _records_processed = 1
            _details = {
                "cameron_booked": cameron_booked,
                "cameron_total": cameron_non_booked + cameron_booked,
                "eric_booked": eric_booked,
                "eric_total": eric_non_booked + eric_booked,
                "total_jobs_booked": total_jobs_booked,
                "all_leads": all_leads,
            }

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

                def _log_execution():
                    ScraperExecutionLog.objects.create(
                        scraper_name="dispatcher-booked-scraper",
                        status="error" if _error_occurred else "success",
                        error_message=_error_occurred,
                        records_processed=_records_processed,
                        execution_time_seconds=round(_elapsed, 2),
                        details=_details,
                    )
                    
                    if _error_occurred:
                        incident, created = Incident.objects.get_or_create(
                            service_name="dispatcher-booked-scraper",
                            status="active",
                            defaults={
                                "title": "Dispatcher Booked Scraper Error",
                                "description": _error_occurred
                            }
                        )
                        if not created:
                            incident.description = _error_occurred
                            incident.save()
                    else:
                        active_incidents = Incident.objects.filter(
                            service_name="dispatcher-booked-scraper",
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
                                send_recovery_email("Dispatcher Booked Scraper", downtime_seconds)

                await sync_to_async(_log_execution)()
                print(
                    f"📝 Execution logged: {'ERROR' if _error_occurred else 'SUCCESS'} ({round(_elapsed, 1)}s)"
                )
            except Exception as log_err:
                print(f"⚠️ Failed to log execution: {log_err}")

            if _error_occurred:
                try:
                    from status.email_service import send_outage_email

                    await sync_to_async(send_outage_email)(
                        "Dispatcher Booked Scraper", _error_occurred
                    )
                    print("📧 Sent direct outage notification email from scraper.")
                except Exception as mail_err:
                    print(f"⚠️ Failed to send direct email: {mail_err}")
