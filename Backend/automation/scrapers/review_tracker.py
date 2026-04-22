"""
Review Tracker Scraper
Scrapes Google reviews for Sterling Septic & Plumbing LLC.
"""
import asyncio
import traceback
import time as _time
from datetime import datetime
from asgiref.sync import sync_to_async
from django.utils import timezone
from automation.scrapers.base_scraper import BaseScraper
from playwright.async_api import TimeoutError as PlaywrightTimeoutError

class ReviewTrackerScraper(BaseScraper):
    """
    Scraper for Google Maps reviews.
    Navigates to the business profile, scrolls reviews, and extracts details.
    """

    def __init__(self):
        """Initialize review tracker scraper."""
        super().__init__()
        # Target URL for Sterling Septic & Plumbing LLC reviews on Google Maps
        self.target_url = "https://www.google.com/maps/place/Sterling+Septic+%26+Plumbing+LLC/@47.1477057,-122.3684081,4933m/data=!3m1!1e3!4m12!1m2!2m1!1sSeptic+system+service!3m8!1s0x54911ceea9f5605f:0xa8488b08b377e811!8m2!3d47.1477077!4d-122.3529584!9m1!1b1!15sChVTZXB0aWMgc3lzdGVtIHNlcnZpY2VaFyIVc2VwdGljIHN5c3RlbSBzZXJ2aWNlkgEVc2VwdGljX3N5c3RlbV9zZXJ2aWNlmgEjQ2haRFNVaE5NRzluUzBWSlEwRm5TVVIxY1dOSFdGTm5FQUXgAQD6AQQIABBD!16s%2Fg%2F11dyb5zmdk?entry=ttu&g_ep=EgoyMDI2MDQxOS4wIKXMDSoASAFQAw%3D%3D"
        self.business_name = "Unknown_Business"

    # ----------------------------
    # GET BUSINESS NAME
    # ----------------------------
    async def get_business_name(self):
        try:
            name_el = self.page.locator("h1.DUwDvf")
            if await name_el.count() > 0:
                return await name_el.inner_text()
            return "Unknown_Business"
        except:
            return "Unknown_Business"

    # ----------------------------
    # OPEN REVIEWS TAB
    # ----------------------------
    async def open_reviews_tab(self):
        try:
            print("--> Opening reviews tab...")

            # Click the Reviews tab
            review_tab = self.page.locator("button[role='tab']").filter(has_text="Reviews").first
            await review_tab.wait_for(timeout=10000)
            await review_tab.click()
            print("[v] Clicked Reviews tab")

            # Wait for reviews panel to appear
            # Try multiple selectors since Google Maps changes class names frequently
            panel_selectors = [
                "div.m6QErb.DxyBCb.kA9KIf",
                "div.m6QErb.DxyBCb",
                "div.m6QErb.WNBkOb",
            ]

            panel_found = False
            for selector in panel_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=8000)
                    print(f"[v] Reviews panel loaded ({selector})")
                    panel_found = True
                    break
                except:
                    continue

            if not panel_found:
                print("[!] Reviews panel selector not matched, continuing anyway...")

            await asyncio.sleep(2)
            return True

        except Exception as e:
            print(f"[x] Error opening reviews tab: {e}")
            return False

    # ----------------------------
    # SCROLL REVIEWS
    # ----------------------------
    async def scroll_reviews(self, scrolls=100, max_reviews=15):
        try:
            print(f"--> Scrolling reviews (targeting {max_reviews} max)...")
            await asyncio.sleep(3)

            # Ensure mouse is over the left panel so scrolling works
            reviews_list = self.page.locator("div.jftiEf")
            if await reviews_list.count() > 0:
                await reviews_list.first.hover()
                await asyncio.sleep(1)

            previous_count = 0
            no_new_count = 0

            for i in range(scrolls):
                try:
                    # Best way to trigger Maps infinite scroll is to scroll the last review into view
                    current_reviews = self.page.locator("div.jftiEf")
                    current_count = await current_reviews.count()
                    
                    if current_count > 0:
                        last_review = current_reviews.nth(current_count - 1)
                        await last_review.scroll_into_view_if_needed()
                    
                    # Also do a giant mouse wheel down just in case
                    await self.page.mouse.wheel(0, 10000)
                except:
                    await self.page.mouse.wheel(0, 10000)

                await asyncio.sleep(3)  # Need decent wait for Google's API to fetch & append

                current_count = await self.page.locator("div.jftiEf").count()
                print(f"  Scroll {i+1}/{scrolls}: {current_count} reviews loaded")

                if current_count >= max_reviews:
                    print(f"  Reached target of {max_reviews} reviews. Stopping scroll.")
                    break

                if current_count == previous_count:
                    no_new_count += 1
                    if no_new_count >= 5:  # 5 consecutive empty scrolls = end of list
                        print(f"  No new reviews after 5 attempts — reached end of list.")
                        break
                else:
                    no_new_count = 0
                    previous_count = current_count

            print(f"[v] Scrolling done. Total reviews in DOM: {previous_count}")

        except Exception as e:
            print(f"[x] Scroll error: {e}")

    # ----------------------------
    # EXPAND ALL "MORE" BUTTONS
    # ----------------------------
    async def expand_all_reviews(self):
        try:
            print("--> Expanding truncated reviews...")
            more_buttons = self.page.locator("button.w8nwRe")
            count = await more_buttons.count()
            print(f"  Found {count} 'More' buttons")

            for i in range(count):
                try:
                    btn = more_buttons.nth(i)
                    if await btn.is_visible():
                        text = await btn.inner_text()
                        if "More" in text:
                            await btn.click()
                            await asyncio.sleep(0.3)
                except:
                    continue

            print("[v] Done expanding reviews")
        except Exception as e:
            print(f"[x] Error expanding reviews: {e}")

    # ----------------------------
    # SCRAPE REVIEWS
    # ----------------------------
    async def scrape_reviews(self, max_reviews=15):
        try:
            print("--> Scraping reviews...")
            await asyncio.sleep(2)

            # Expand all truncated reviews first
            await self.expand_all_reviews()
            await asyncio.sleep(1)

            reviews = self.page.locator("div.jftiEf")
            review_count = await reviews.count()
            if review_count > max_reviews:
                review_count = max_reviews
                
            print(f"[v] Found {review_count} reviews to scrape")

            scraped_data = []

            for i in range(review_count):
                try:
                    review = reviews.nth(i)

                    # Reviewer name
                    name_el = review.locator("div.d4r55")
                    reviewer_name = "N/A"
                    if await name_el.count() > 0:
                        reviewer_name = (await name_el.inner_text()).strip()

                    # Reviewer info (Local Guide, review count)
                    info_el = review.locator("div.RfnDt")
                    reviewer_info = "N/A"
                    if await info_el.count() > 0:
                        reviewer_info = (await info_el.inner_text()).strip()

                    # Rating
                    rating_el = review.locator("span.kvMYJc")
                    rating = "N/A"
                    rating_value = 0
                    if await rating_el.count() > 0:
                        aria_label = await rating_el.get_attribute("aria-label")
                        if aria_label:
                            rating = aria_label
                            try:
                                rating_value = int(aria_label.split()[0])
                            except:
                                rating_value = 0

                    # Date
                    date_el = review.locator("span.rsqaWe")
                    date = "N/A"
                    if await date_el.count() > 0:
                        date = (await date_el.inner_text()).strip()

                    # Review text
                    text_el = review.locator("span.wiI7pd").first
                    review_text = "No text"
                    if await text_el.count() > 0:
                        review_text = (await text_el.inner_text()).strip()

                    # Try clicking "More" for this specific review if still truncated
                    more_button = review.locator("button.w8nwRe").first
                    if await more_button.count() > 0:
                        try:
                            btn_text = await more_button.inner_text()
                            if "More" in btn_text and await more_button.is_visible():
                                await more_button.click()
                                await asyncio.sleep(0.4)
                                if await text_el.count() > 0:
                                    review_text = (await text_el.inner_text()).strip()
                        except:
                            pass

                    # Owner response
                    owner_response = "N/A"
                    response_el = review.locator("div.CDe7pd div.wiI7pd")
                    if await response_el.count() > 0:
                        owner_response = (await response_el.inner_text()).strip()

                    # Price & services from structured info blocks
                    price_assessment = "N/A"
                    price_range = "N/A"
                    services_mentioned = "N/A"

                    info_divs = review.locator("div.PBK6be")
                    for j in range(await info_divs.count()):
                        try:
                            div = info_divs.nth(j)
                            div_text = await div.inner_text()
                            if "Price" in div_text:
                                spans = div.locator("span.RfDO5c")
                                for k in range(await spans.count()):
                                    s = await spans.nth(k).inner_text()
                                    if "$" in s:
                                        price_range = s
                                    elif s and len(s) < 50 and "Price" not in s:
                                        price_assessment = s
                            if any(w in div_text.lower() for w in ["septic", "sewer", "repair", "pumping", "drain", "plumbing"]):
                                spans = div.locator("span.RfDO5c")
                                svc = []
                                for k in range(await spans.count()):
                                    svc.append(await spans.nth(k).inner_text())
                                if svc:
                                    services_mentioned = ", ".join(svc)
                        except:
                            continue

                    # Validate basic info
                    if reviewer_name == "N/A" or rating_value == 0:
                        continue

                    scraped_data.append({
                        "reviewer_name": reviewer_name,
                        "reviewer_info": reviewer_info,
                        "rating_text": rating,
                        "rating_value": rating_value,
                        "review_date": date,
                        "review_text": review_text,
                        "owner_response": owner_response,
                        "price_assessment": price_assessment,
                        "price_range": price_range,
                        "services_mentioned": services_mentioned
                    })

                    if (i + 1) % 25 == 0:
                        print(f"  Scraped {i+1}/{review_count}...")

                except Exception as e:
                    print(f"  [!] Error on review {i+1}: {e}")
                    continue

            print(f"[v] Scraping complete: {len(scraped_data)} reviews")
            return scraped_data

        except Exception as e:
            print(f"[x] Scraping error: {e}")
            return []

    # ----------------------------
    # MAIN WORKFLOW
    # ----------------------------
    async def run(self):
        """Execute the complete review scraping workflow."""
        _start_time = _time.time()
        _error_occurred = None
        _records_processed = 0
        reviews_scraped_count = 0

        try:
            print("=== Starting Review Tracker Scraper ===")
            await self.initialize()
            
            print(f"Opening: {self.target_url}")
            await self.page.goto(self.target_url, timeout=60000)
            
            # Wait for either the business title or search results
            try:
                await self.page.wait_for_selector("h1.DUwDvf, a.hfpxzc", timeout=30000)
                
                # If we landed on a search results list, click the first one
                if await self.page.locator("h1.DUwDvf").count() == 0 and await self.page.locator("a.hfpxzc").count() > 0:
                    print("--> Search results found. Clicking first business...")
                    await self.page.locator("a.hfpxzc").first.click()
                    await self.page.wait_for_selector("h1.DUwDvf", timeout=20000)

                await asyncio.sleep(3)
                print("[v] Business page loaded")
            except Exception as e:
                print(f"[x] Error waiting for business page: {e}")

            # Get business name
            self.business_name = await self.get_business_name()
            print(f"\nBusiness: {self.business_name}\n")

            # Open reviews tab and extract data
            if await self.open_reviews_tab():
                await asyncio.sleep(3)
                
                # Scroll to load reviews (limiting to 15 max as per original script)
                await self.scroll_reviews(scrolls=100, max_reviews=15)
                
                # Scrape reviews
                reviews = await self.scrape_reviews(max_reviews=15)
                reviews_scraped_count = len(reviews)
                
                if reviews:
                    print(f"Inserting {len(reviews)} reviews into database...")
                    for review in reviews:
                        # Use api_client which handles auth and deduplication via reviewer_name/text
                        success = self.api_client.insert_review(review)
                        if success:
                            _records_processed += 1
                    
                    print(f"✅ Successfully inserted/verified {_records_processed} reviews.")
                    
                    # Summary Output
                    print(f"\n{'='*40}")
                    print(f"SUMMARY")
                    print(f"{'='*40}")
                    print(f"Business:        {self.business_name}")
                    print(f"Total reviews:   {len(reviews)}")
                    ratings = [float(r['rating_value']) for r in reviews if r['rating_value'] != 'N/A']
                    if ratings:
                        print(f"Average rating:  {sum(ratings)/len(ratings):.2f} / 5.0")
                        rating_dist = {}
                        for r in ratings:
                            key = str(int(r))
                            rating_dist[key] = rating_dist.get(key, 0) + 1
                        print(f"Rating breakdown:")
                        for star in ["5", "4", "3", "2", "1"]:
                            count = rating_dist.get(star, 0)
                            print(f"  {star} stars: {count}")
                    print(f"{'='*40}")
                else:
                    print("❌ No reviews found after scrolling.")
            else:
                _error_occurred = "Could not navigate to the reviews tab."
                
            return _records_processed > 0

        except Exception as e:
            print(f"Critical error in Review Tracker: {e}")
            _error_occurred = f"{str(e)}\n{traceback.format_exc()}"
            return False
            
        finally:
            await self.cleanup()

            # ── Log execution result to ScraperExecutionLog and Incident ──
            _elapsed = _time.time() - _start_time
            try:
                from status.models import ScraperExecutionLog, Incident

                def _log_execution():
                    ScraperExecutionLog.objects.create(
                        scraper_name="review-tracker-scraper",
                        status="error" if _error_occurred else "success",
                        error_message=_error_occurred,
                        records_processed=_records_processed,
                        execution_time_seconds=round(_elapsed, 2),
                        details={"reviews_found": reviews_scraped_count},
                    )

                    if _error_occurred:
                        incident, created = Incident.objects.get_or_create(
                            service_name="review-tracker-scraper",
                            status="active",
                            defaults={
                                "title": "Review Tracker Scraper Error",
                                "description": _error_occurred,
                            },
                        )
                        if not created:
                            incident.description = _error_occurred
                            incident.save()
                    else:
                        active_incidents = Incident.objects.filter(
                            service_name="review-tracker-scraper",
                            status="active",
                        )
                        if active_incidents.exists():
                            for incident in active_incidents:
                                incident.status = "resolved"
                                incident.resolved_at = timezone.now()
                                incident.save()

                await sync_to_async(_log_execution)()
                print(f"📝 Execution logged: {'ERROR' if _error_occurred else 'SUCCESS'} ({round(_elapsed, 1)}s)")
            except Exception as log_err:
                print(f"⚠️ Failed to log execution: {log_err}")

if __name__ == "__main__":
    import django
    import os
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()
    
    scraper = ReviewTrackerScraper()
    asyncio.run(scraper.run())
