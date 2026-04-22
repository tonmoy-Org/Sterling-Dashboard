"""
Yelp Review Scraper
Scrapes reviews from Yelp using SerpApi.
"""
import time as _time
import traceback
import serpapi
from asgiref.sync import sync_to_async
from django.utils import timezone
from automation.services.api_client import APIClient

class YelpReviewScraper:
    """
    Scraper for Yelp reviews using SerpApi.
    """

    def __init__(self):
        """Initialize Yelp review scraper."""
        self.api_key = "49543b2dfde5af2c45109891d1e52f22f4a0cdff2b036fc5f34a5774848d6523"
        self.client = serpapi.Client(api_key=self.api_key)
        self.place_id = "IF40cYLYczA9ZeYKGslgVw"
        self.api_client = APIClient()

    async def run(self):
        """Execute the complete Yelp review scraping workflow."""
        _start_time = _time.time()
        _error_occurred = None
        _records_processed = 0
        all_reviews = []
        start = 0

        try:
            print("=== Starting Yelp Review Scraper ===")
            
            while True:
                results = self.client.search({
                    "engine": "yelp_reviews",
                    "place_id": self.place_id,
                    "sortby": "date_desc",
                    "start": start
                })

                reviews = results.get("reviews", [])
                if not reviews:
                    break

                all_reviews.extend(reviews)
                print(f"Fetched {len(all_reviews)} reviews so far...")

                pagination = results.get("serpapi_pagination", {})
                if "next" not in pagination:
                    break

                start += len(reviews)
            
            print(f"\nTotal reviews fetched: {len(all_reviews)}")

            if all_reviews:
                print(f"Inserting {len(all_reviews)} reviews into database...")
                for review in all_reviews:
                    # Map Yelp (SerpApi) data to our Review model format
                    # reviewer_name = user["name"]
                    # rating_value = rating
                    # review_date = date
                    # review_text = comment["text"]
                    
                    user_info = review.get("user", {})
                    comment_info = review.get("comment", {})
                    
                    mapped_review = {
                        "reviewer_name": user_info.get("name", "N/A"),
                        "rating_value": review.get("rating", 0),
                        "rating_text": f"{review.get('rating', 0)} star rating",
                        "review_date": review.get("date", "N/A"),
                        "review_text": comment_info.get("text", ""),
                        "business_name": "Yelp - Sterling Septic & Plumbing LLC"
                    }
                    
                    # Use api_client which handles auth and deduplication
                    success = self.api_client.insert_review(mapped_review)
                    if success:
                        _records_processed += 1
                
                print(f"✅ Successfully inserted/verified {_records_processed} reviews.")
            else:
                print("❌ No reviews found on Yelp.")

            return _records_processed > 0

        except Exception as e:
            print(f"Critical error in Yelp Scraper: {e}")
            _error_occurred = f"{str(e)}\n{traceback.format_exc()}"
            return False
            
        finally:
            # ── Log execution result to ScraperExecutionLog and Incident ──
            _elapsed = _time.time() - _start_time
            try:
                from status.models import ScraperExecutionLog, Incident

                def _log_execution():
                    ScraperExecutionLog.objects.create(
                        scraper_name="yelp-review-scraper",
                        status="error" if _error_occurred else "success",
                        error_message=_error_occurred,
                        records_processed=_records_processed,
                        execution_time_seconds=round(_elapsed, 2),
                        details={"reviews_found": len(all_reviews)},
                    )

                    if _error_occurred:
                        incident, created = Incident.objects.get_or_create(
                            service_name="yelp-review-scraper",
                            status="active",
                            defaults={
                                "title": "Yelp Review Scraper Error",
                                "description": _error_occurred,
                            },
                        )
                        if not created:
                            incident.description = _error_occurred
                            incident.save()
                    else:
                        active_incidents = Incident.objects.filter(
                            service_name="yelp-review-scraper",
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
    import asyncio
    scraper = YelpReviewScraper()
    asyncio.run(scraper.run())
