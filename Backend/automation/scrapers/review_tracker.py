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

class ReviewTrackerScraper(BaseScraper):
    """
    Scraper for Google Maps reviews.
    Navigates to the business profile, scrolls reviews, and extracts details.
    """

    def __init__(self):
        """Initialize review tracker scraper."""
        super().__init__()
        # Target URL for Sterling Septic & Plumbing LLC reviews on Google Maps
        self.target_url = "https://www.google.com/maps/place/Sterling+Septic+%26+Plumbing+LLC/@47.1477057,-122.3684081,4154m/data=!3m1!1e3!4m10!1m2!2m1!1sSeptic+system+service!3m6!1s0x54911ceea9f5605f:0xa8488b08b377e811!8m2!3d47.1477077!4d-122.3529584!15sChVTZXB0aWMgc3lzdGVtIHNlcnZpY2VaFyIVc2VwdGljIHN5c3RlbSBzZXJ2aWNlkgEVc2VwdGljX3N5c3RlbV9zZXJ2aWNlmgEjQ2haRFNVaE5NRzluUzBWSlEwRm5TVVIxY1dOSFdGTm5FQUXgAQD6AQQIABBD!16s%2Fg%2F11dyb5zmdk?entry=ttu&g_ep=EgoyMDI2MDQxNC4wIKXMDSoASAFQAw%3D%3D"

    async def dismiss_google_consent(self):
        """Handle Google's 'Before you continue' cookie consent dialog."""
        try:
            # Common selectors for Google consent buttons
            consent_selectors = [
                "button:has-text('Accept all')",
                "button:has-text('I agree')",
                "button:has-text('Accept')",
                "button[aria-label='Accept all']",
                "form[action*='consent'] button"
            ]
            
            for selector in consent_selectors:
                btn = self.page.locator(selector)
                if await btn.count() > 0:
                    print(f"➡️ Dismissing Google consent dialog using: {selector}")
                    await btn.first.click()
                    await asyncio.sleep(2)
                    return True
            return False
        except Exception:
            return False

    async def open_reviews_tab(self):
        """Navigate to the reviews tab."""
        try:
            print("➡️ Opening reviews tab...")
            
            # 1. Give Google Maps some extra time to load the sidebar components
            await self.page.wait_for_timeout(5000)
            
            # 2. List of possible Review tab selectors (Google changes these often)
            tab_selectors = [
                "button[role='tab']:has-text('Reviews')",
                "button[aria-label^='Reviews']",
                "button:has-text('Reviews')",
                "div[role='tab']:has-text('Reviews')"
            ]
            
            review_tab = None
            for selector in tab_selectors:
                loc = self.page.locator(selector)
                if await loc.count() > 0:
                    review_tab = loc.first
                    print(f"✅ Found Reviews tab using selector: {selector}")
                    break
            
            if not review_tab:
                # Last resort: search for anything with "Reviews" text
                loc = self.page.get_by_text("Reviews", exact=False)
                if await loc.count() > 0:
                    review_tab = loc.first
                    print("✅ Found Reviews tab using text search")

            if review_tab:
                # Check if it's already selected
                aria_selected = await review_tab.get_attribute("aria-selected")
                if aria_selected == "true":
                    print("ℹ️ Reviews tab is already selected")
                else:
                    await review_tab.click()
                    print("✅ Clicked Reviews tab")
                
                # Wait for reviews panel to load
                # Google Maps uses div[role='feed'] for the reviews list
                try:
                    await self.page.wait_for_selector("div[role='feed']", timeout=15000)
                    print("✅ Reviews panel opened")
                    return True
                except:
                    # Even if selector doesn't appear, check if some reviews loaded
                    if await self.page.locator("div.jftiEf").count() > 0:
                        print("✅ Reviews detected even without role='feed'")
                        return True
                    print("⚠️ Clicked tab but feed didn't load")
                    return False
            else:
                print("⚠️ Reviews tab not found")
                # DEBUG: Take a screenshot if possible? (not in this env)
                return False
            
        except Exception as e:
            print(f"❌ Error opening reviews tab: {e}")
            return False

    async def scroll_reviews(self, scrolls=25):
        """Scroll down the review feed to load more reviews."""
        try:
            print(f"➡️ Scrolling reviews ({scrolls} times)...")
            feed = self.page.locator("div[role='feed']")
            
            if await feed.count() == 0:
                print("❌ Review feed not found")
                return
            
            # Hover over the feed to make sure scroll events reach it
            await feed.first.hover()
            
            previous_count = 0
            no_new_reviews_count = 0
            
            for i in range(scrolls):
                # Use mouse wheel for more natural scrolling that triggers Google's lazy loading
                await self.page.mouse.wheel(0, 8000)
                await asyncio.sleep(2.5)
                
                # Check how many reviews we have now
                current_reviews = self.page.locator("div.jftiEf")
                current_count = await current_reviews.count()
                
                print(f"  Scroll {i+1}: Found {current_count} reviews so far")
                
                if current_count == previous_count:
                    # Fallback: manual scroll evaluation if mouse wheel didn't trigger load
                    await feed.first.evaluate("el => el.scrollBy(0, el.scrollHeight)")
                    await asyncio.sleep(3)
                    current_count = await current_reviews.count()
                    
                    if current_count == previous_count:
                        no_new_reviews_count += 1
                        if no_new_reviews_count >= 3:
                            print("  No new reviews loading, stopping scroll")
                            break
                    else:
                        no_new_reviews_count = 0
                        previous_count = current_count
                else:
                    no_new_reviews_count = 0
                    previous_count = current_count
                
                await asyncio.sleep(0.5)
            
            print(f"✅ Scrolling done. Total reviews found: {previous_count}")
            
        except Exception as e:
            print(f"❌ Scroll error: {e}")

    async def scrape_reviews(self):
        """Extract all loaded reviews from the page."""
        try:
            print("➡️ Scraping reviews...")
            await asyncio.sleep(2)
            
            reviews = self.page.locator("div.jftiEf")
            review_count = await reviews.count()
            print(f"✅ Found {review_count} reviews in feed")
            
            scraped_data = []
            
            for i in range(review_count):
                try:
                    review = reviews.nth(i)
                    
                    # 1. REVIEWER NAME
                    name_el = review.locator("div.d4r55")
                    reviewer_name = await name_el.inner_text() if await name_el.count() > 0 else "N/A"
                    
                    # 2. RATING
                    rating_el = review.locator("span.kvMYJc")
                    rating_text = "N/A"
                    rating_value = 0
                    if await rating_el.count() > 0:
                        aria_label = await rating_el.get_attribute("aria-label")
                        if aria_label:
                            rating_text = aria_label
                            try:
                                # Extract number from "5 stars"
                                rating_value = int(aria_label.split()[0])
                            except:
                                rating_value = 0
                    
                    # 3. DATE
                    date_el = review.locator("span.rsqaWe")
                    review_date = await date_el.inner_text() if await date_el.count() > 0 else "N/A"
                    
                    # 4. REVIEW TEXT
                    text_el = review.locator("span.wiI7pd").first
                    review_text = await text_el.inner_text() if await text_el.count() > 0 else ""
                    
                    # Check for "More" button to expand full text
                    # We target expandReview specifically to avoid clicking expandOwnerResponse
                    more_button = review.locator("button.w8nwRe[jsaction*='expandReview']").first
                    if await more_button.count() > 0:
                        try:
                            button_text = await more_button.inner_text()
                            if "More" in button_text:
                                await more_button.click()
                                await asyncio.sleep(0.5)
                                review_text = await text_el.inner_text() if await text_el.count() > 0 else review_text
                        except:
                            pass
                    
                    # 5. PRICE ASSESSMENT & SERVICES
                    price_assessment = "N/A"
                    price_range = "N/A"
                    services_mentioned = "N/A"
                    
                    info_divs = review.locator("div.PBK6be")
                    info_count = await info_divs.count()
                    
                    for j in range(info_count):
                        div = info_divs.nth(j)
                        div_text = await div.inner_text()
                        
                        if "Price assessment" in div_text or "Reasonable price" in div_text:
                            spans = div.locator("span.RfDO5c")
                            for k in range(await spans.count()):
                                span_text = await spans.nth(k).inner_text()
                                if "Price assessment" not in span_text and "Reasonable price" not in span_text:
                                    if span_text and len(span_text) < 50:
                                        price_assessment = span_text
                                        break
                        
                        if "$" in div_text or "above" in div_text.lower():
                            spans = div.locator("span.RfDO5c")
                            for k in range(await spans.count()):
                                span_text = await spans.nth(k).inner_text()
                                if "$" in span_text or "above" in span_text:
                                    price_range = span_text
                                    break
                        
                        if any(service in div_text.lower() for service in ["septic", "sewer", "repair", "installation", "pumping"]):
                            spans = div.locator("span.RfDO5c")
                            services_list = []
                            for k in range(await spans.count()):
                                span_text = await spans.nth(k).inner_text()
                                if any(service in span_text.lower() for service in ["septic", "sewer", "repair", "installation", "pumping"]):
                                    services_list.append(span_text)
                            if services_list:
                                services_mentioned = ", ".join(services_list)
                    
                    scraped_data.append({
                        "reviewer_name": reviewer_name,
                        "rating_text": rating_text,
                        "rating_value": rating_value,
                        "review_date": review_date,
                        "review_text": review_text,
                        "price_assessment": price_assessment,
                        "price_range": price_range,
                        "services_mentioned": services_mentioned
                    })
                    
                except Exception as e:
                    print(f"⚠️ Error reading review {i+1}: {e}")
                    continue
            
            return scraped_data
            
        except Exception as e:
            print(f"❌ Scraping error: {e}")
            return []

    async def run(self):
        """Execute the complete review scraping workflow."""
        _start_time = _time.time()
        _error_occurred = None
        _records_processed = 0
        reviews_scraped_count = 0

        try:
            print("=== Starting Review Tracker Scraper ===")
            await self.initialize()
            
            print(f"Navigating to: {self.target_url}")
            await self.page.goto(self.target_url, wait_until="domcontentloaded", timeout=60000)
            
            # Dismiss any Google cookie consent popups (common on VPS/clean browsers)
            await self.dismiss_google_consent()

            # Wait for business page load
            try:
                await self.page.wait_for_selector("h1.DUwDvf", timeout=30000)
            except:
                print("Warning: Business title not immediately visible.")

            # Open reviews tab and extract data
            if await self.open_reviews_tab():
                await self.scroll_reviews(scrolls=20)
                reviews = await self.scrape_reviews()
                reviews_scraped_count = len(reviews)
                
                if reviews:
                    print(f"Inserting {len(reviews)} reviews into database...")
                    for review in reviews:
                        # Use api_client which handles auth and deduplication via reviewer_name/text
                        success = self.api_client.insert_review(review)
                        if success:
                            _records_processed += 1
                    
                    print(f"✅ Successfully inserted/verified {_records_processed} reviews.")
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
    scraper = ReviewTrackerScraper()
    asyncio.run(scraper.run())
