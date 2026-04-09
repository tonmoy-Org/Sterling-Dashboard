"""
Work Orders Scraper
Scrapes work orders with complete status and extracts full addresses.
Updated to include Add Column functionality for Completed Date.
Updated to print all table data after filters are applied.
"""

import copy
from datetime import datetime
from typing import Dict
from asgiref.sync import sync_to_async
from django.utils.timezone import make_aware
from django.utils.timezone import get_current_timezone
from dispatcher_booked.models import DispatcherBooked
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

    async def _get_booked_counts(self, url):
        """
        Navigate to the given URL and extract the booked count from the page.

        Args:
            url: The URL to navigate to
        Returns:
            int: The booked count extracted from the page, or None on failure
        """ 
        try:
            if not url:
                print("Booked count URL is missing.")
                return None

            await self._goto_with_fallback(url, timeout_ms=6000)

            current_url = (self.page.url or "").lower()
            if "/Account/Login" in current_url:
                print("Detected login redirect while fetching booked count. Logging in and retrying target URL...")
                await self.login_fieldedge()
                await self.page.wait_for_timeout(3000)
                await self._goto_with_fallback(url, timeout_ms=6000)

            count_xpath = self.rules.get("booked_count_get_xpath")
            for attempt in range(1, 4):
                try:
                    await self.page.wait_for_selector(
                        count_xpath, state="visible", timeout=6000
                    )
                    count_text = await self.page.locator(count_xpath).inner_text()
                    count_text = count_text.replace("(", "").replace(")", "").replace(",", "")
                    count = int(count_text.strip())
                    print(f"Extracted booked count : {count}")
                    return count
                except Exception as parse_error:
                    if attempt == 3:
                        raise parse_error

                    print(
                        f"Booked count extraction attempt {attempt} failed. Reloading page and retrying..."
                    )
                    await self.page.reload(wait_until="domcontentloaded", timeout=6000)
                    await self.page.wait_for_timeout(2000)
        except Exception as e:
            print(f"Error getting booked count from {url}: {e}")
            return None

    async def run(self):
        """
        Execute the complete work orders scraping workflow.

        Returns:
            list: Work orders with full addresses, or None on error
        """
        try:
            await self.initialize()

            # Navigate to dispatch board
            dashboard_url = self.rules.get("dashboard_url")
            await self.page.goto(dashboard_url, wait_until="domcontentloaded")

            # Login if necessary
            if "Login" in self.page.url:
                await self.login_fieldedge()


            # Wait for table to reflect new column
            await self.page.wait_for_timeout(3000)
            booked_urls = self.rules.get("booked_urls", {})
            if not booked_urls:
                print("No booked URLs configured.")
                return None

            # Step 1: Apply filters
            booked_urls = self.rules.get("booked_urls", {})

            cameron_booked = await self._get_booked_counts(booked_urls.get("cameron_booked"))
            cameron_non_booked = await self._get_booked_counts(booked_urls.get("cameron_non_booked"))
            eric_booked = await self._get_booked_counts(booked_urls.get("eric_booked"))
            eric_non_booked = await self._get_booked_counts(booked_urls.get("eric_non_booked"))

            counts = [cameron_booked, cameron_non_booked, eric_booked, eric_non_booked]
            if any(count is None for count in counts):
                print("One or more booked counts are None.")
                return None
            else:
                print(f"Cameron Booked: {cameron_booked}")
                print(f"Cameron Non-Booked: {cameron_non_booked}")
                print(f"Eric Booked: {eric_booked}")
                print(f"Eric Non-Booked: {eric_non_booked}")
                # get_current_timezone
                current_date = make_aware(datetime.now(), timezone=get_current_timezone())
                data = {
                    "date": current_date,
                    "cameron_booked": cameron_booked,
                    "cameron_total": cameron_non_booked + cameron_booked,
                    "eric_booked": eric_booked,
                    "eric_total": eric_non_booked + eric_booked,
                }
                await sync_to_async(DispatcherBooked.objects.create)(**data)
                print("✅ Booked counts saved to database.")
        except Exception as e:
            print(f"Scraping error: {e}")
            return None

        finally:
            await self.cleanup()

    