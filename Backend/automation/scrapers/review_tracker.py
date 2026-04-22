"""
Review Tracker Scraper
Scrapes Google reviews for Sterling Septic & Plumbing LLC.
"""
import asyncio
import traceback
import time as _time
import re
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
            
            # 1. Give Google Maps extra time to load especially on slow VPS connections
            await self.page.wait_for_timeout(8000)
            
            # 2. Dismiss Pendo/Overlay if they appear (Maps sometimes has tour/intro)
            try:
                pendo = self.page.locator("button:has-text('Skip'), button:has-text('Got it')").first
                if await pendo.is_visible():
                    await pendo.click()
            except:
                pass

            # 3. Robust list of tab selectors
            tab_selectors = [
                "button[role='tab'][aria-label^='Reviews']",
                "button[role='tab']:has-text('Reviews')",
                "div[role='tab']:has-text('Reviews')",
                "button:has-text('Reviews')",
                "span:has-text('Reviews')"
            ]
            
            review_tab = None
            
            # Try searching by role first (standard ARIA)
            try:
                tab_role = self.page.get_by_role("tab", name="Reviews")
                if await tab_role.count() > 0:
                    for i in range(await tab_role.count()):
                        if await tab_role.nth(i).is_visible():
                            review_tab = tab_role.nth(i)
                            print("✅ Found Reviews tab using get_by_role")
                            break
            except:
                pass

            if not review_tab:
                for selector in tab_selectors:
                    loc = self.page.locator(selector)
                    count = await loc.count()
                    for i in range(count):
                        item = loc.nth(i)
                        # Avoid huge divs like the one in the VPS error
                        text_content = await item.inner_text()
                        if await item.is_visible() and len(text_content or "") < 50:
                            review_tab = item
                            print(f"✅ Found Reviews tab using selector: {selector}")
                            break
                    if review_tab: break
            
            if not review_tab:
                # Last resort: search for text "Reviews" but only short strings (tab labels)
                loc = self.page.get_by_text("Reviews", exact=True)
                if await loc.count() > 0:
                    for i in range(await loc.count()):
                        item = loc.nth(i)
                        text = await item.inner_text()
                        if await item.is_visible() and len(text or "") < 20:
                            review_tab = item
                            print("✅ Found Reviews tab using exact text search")
                            break

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
            
            # Google Maps main scrollable containers
            feed_selectors = [
                "div.dS8AEf[scrollable='true']",
                "div.m6QErb.DxyBCb.kA9KIf.dS8AEf",
                "div[role='feed']",
                "div.dS8AEf",
            ]
            
            feed = None
            for selector in feed_selectors:
                loc = self.page.locator(selector)
                if await loc.count() > 0:
                    feed = loc.first
                    print(f"✅ Found scrollable feed using: {selector}")
                    break
            
            if not feed:
                print("⚠️ Review feed container not found, trying generic scroll...")
            else:
                # Hover over the feed to make sure scroll events reach it
                await feed.hover()
            
            previous_count = 0
            no_new_reviews_count = 0
            
            for i in range(scrolls):
                # Use mouse wheel for more natural scrolling that triggers Google's lazy loading
                await self.page.mouse.wheel(0, 8000)
                await asyncio.sleep(2.5)
                
                # Check how many reviews we have now
                # Broad selectors for review cards: jftiEf is standard
                card_selectors = "div.jftiEf"
                current_reviews = self.page.locator(card_selectors)
                current_count = await current_reviews.count()
                
                print(f"  Scroll {i+1}: Found {current_count} reviews so far")

                # STOP if we have found at least 50 reviews as requested
                if current_count >= 50:
                    print(f"✅ Found {current_count} reviews (target 50 reached). Stopping scroll.")
                    previous_count = current_count
                    break
                
                if current_count == previous_count:
                    # Fallback: manual scroll evaluation
                    if feed:
                        await feed.evaluate("el => el.scrollBy(0, el.scrollHeight)")
                    else:
                        await self.page.evaluate("window.scrollBy(0, 5000)")
                    
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
            
            # Use only the top-level card selector to avoid nested matches (which cause duplicates)
            # div.jftiEf is the standard container for a Google review card
            review_selectors = "div.jftiEf"
            reviews = self.page.locator(review_selectors)
            review_count = await reviews.count()
            print(f"✅ Found {review_count} reviews in feed")
            
            # If standard selectors fail, try searching for "stars" container parents
            if review_count == 0:
                print("⚠️ No card matches found, trying alternative: star rating parent search")
                stars_loc = self.page.locator("span[aria-label*='stars']").first
                if await stars_loc.is_visible():
                    # Move up to find the common parent that looks like a card
                    review_container = self.page.locator("div[role='feed'] > div")
                    review_count = await review_container.count()
                    reviews = review_container
                    print(f"✅ Found {review_count} potential review containers using feed traversal")
            
            scraped_data = []
            seen_reviews = set() # To prevent duplicates in the same run
            
            for i in range(review_count):
                try:
                    review = reviews.nth(i)
                    
                    # Ensure the review card is in view to trigger rendering of virtualized content
                    try:
                        await review.scroll_into_view_if_needed(timeout=2000)
                        await asyncio.sleep(0.1) # Brief pause for rendering
                    except:
                        pass
                    
                    # 1. REVIEWER NAME (Multiple possible selectors)
                    name_selectors = ["div.d4r50", "div.d4r55", "div.XEAFd", "div[role='heading']"]
                    reviewer_name = None
                    for sel in name_selectors:
                        loc = review.locator(sel)
                        if await loc.count() > 0:
                            text = await loc.first.inner_text()
                            if text and text.strip():
                                reviewer_name = text.strip()
                                break
                    
                    # 2. RATING
                    rating_selectors = ["span.kvMYyc", "span.kvMYJc", "span.G_P8"]
                    rating_text = "N/A"
                    rating_value = 0
                    for sel in rating_selectors:
                        loc = review.locator(sel)
                        if await loc.count() > 0:
                            aria_label = await loc.first.get_attribute("aria-label")
                            if aria_label:
                                rating_text = aria_label
                                try:
                                    # Extract number from "5 stars" or "4/5"
                                    match = re.search(r'(\d+)', aria_label)
                                    if match:
                                        rating_value = int(match.group(1))
                                        break
                                except: pass
                    
                    # 3. DATE
                    date_selectors = ["span.rsqSbe", "span.rsqaWe", "span.ODZ07"]
                    review_date = "N/A"
                    for sel in date_selectors:
                        loc = review.locator(sel)
                        if await loc.count() > 0:
                            text = await loc.first.inner_text()
                            if text and text.strip():
                                review_date = text.strip()
                                break
                    
                    # 4. REVIEW TEXT
                    text_el = review.locator("span.wiI7pd").first
                    review_text = await text_el.inner_text() if await text_el.count() > 0 else ""
                    
                    # Check for "More" button to expand full text
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

                    # --- VALIDATION & DEDUPLICATION ---
                    # 1. Ensure we have a reviewer name and a rating.
                    if not (reviewer_name and rating_value > 0):
                        print(f"⏩ Skipping incomplete review at index {i} (Name: {reviewer_name}, Rating: {rating_value})")
                        continue

                    # 2. Prevent local duplicates (same name and text) in the same run
                    review_id = f"{reviewer_name}_{review_text[:50]}"
                    if review_id in seen_reviews:
                        print(f"⏩ Skipping local duplicate: {reviewer_name}")
                        continue
                    
                    seen_reviews.add(review_id)
                    
                    # 3. Add to output
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
