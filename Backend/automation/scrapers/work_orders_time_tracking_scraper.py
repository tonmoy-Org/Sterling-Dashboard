"""
Work Orders Time Tracking Scraper
Scrapes work orders and extracts completion time from the Timesheet section.
"""

import copy
from typing import List, Dict, Optional
import asyncio
from automation.scrapers.base_scraper import BaseScraper


class WorkOrdersTimeTrackingScraper(BaseScraper):
    """
    Scraper for work orders that extracts full address and 
    technician completion time from the Timesheet tab.
    """

    def __init__(self):
        """Initialize scraper."""
        super().__init__()

    async def scrape_work_orders_table(self):
        """
        Scrape work orders from the main table.

        Returns:
            dict: Dictionary with rows list and count
        """
        try:
            await self.page.wait_for_selector(
                "tbody.fixed-body tr", state="attached", timeout=60000
            )
        except Exception as e:
            print(f"Error waiting for table rows: {e}")
            return {"rows": []}

        try:
            scraped_data = await self.page.evaluate(
                r"""() => {
                const dataList = [];
                
                try {
                    const rows = document.querySelectorAll('tbody.fixed-body tr');
                    
                    for (let i = 1; i < rows.length; i++) {
                        try {
                            const row = rows[i];
                            const cells = row.querySelectorAll('td');
                            
                            if (cells.length > 0) {
                                const getText = (index) => {
                                    return cells[index] ? cells[index].innerText.replace(/\s+/g, ' ').trim() : "";
                                };
                                
                                const workOrder = {
                                    customer: getText(0),
                                    wo_number: getText(1),
                                    purchase_order: getText(2),
                                    invoice: getText(3),
                                    quote: getText(4),
                                    task_name: getText(5),
                                    status: getText(6),
                                    appointment_date: getText(7),
                                    scheduled_date: getText(8),
                                    technician: getText(9),
                                    completed_date: getText(10)
                                };
                                
                                dataList.push(workOrder);
                            }
                        } catch (rowError) {
                            console.error(`Error parsing row ${i}:`, rowError);
                        }
                    }
                } catch (err) {
                    console.error("Global scraping error:", err);
                }
                
                return { rows: dataList, count: dataList.length };
            }"""
            )

            row_count = len(scraped_data.get("rows", []))
            print(f"Scraped {row_count} work order(s) from table.")
            return scraped_data

        except Exception as e:
            print(f"Error during table scraping: {e}")
            return {"rows": []}

    async def scrape_timesheet_data(self, page):
        """
        Navigate to Timesheet section and extract completion time.

        Args:
            page: Playwright page object

        Returns:
            str: Completion time (e.g., "12:49 PM") or None
        """
        try:
            # Click the Timesheet card
            timesheet_card = page.locator('//div[contains(@class, "card")]//div[normalize-space(text())="Timesheet"]')
            await timesheet_card.wait_for(state="visible", timeout=30000)
            await timesheet_card.click()
            print("✅ Clicked Timesheet card.")

            # Wait for Timesheet Entries table
            await page.wait_for_selector('//div[normalize-space(text())="Timesheet Entries"]', timeout=30000)
            
            # Extract End Time from the "Working" row
            # We look for the first row where the status (td[2]) is "Working"
            completed_time = await page.evaluate(
                r"""() => {
                try {
                    const rows = Array.from(document.querySelectorAll('table tr')).slice(1); // Skip header
                    for (let row of rows) {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 5) {
                            const status = cells[1].innerText.trim();
                            const date = cells[2].innerText.trim();
                            const endTime = cells[4].innerText.trim();
                            
                            if (status === 'Working' && endTime) {
                                return `${date} ${endTime}`;
                            }
                        }
                    }
                    // Fallback to first row end time if 'Working' status not found but entries exist
                    if (rows.length > 0) {
                        const cells = rows[0].querySelectorAll('td');
                        if (cells.length >= 5) {
                            return `${cells[2].innerText.trim()} ${cells[4].innerText.trim()}`;
                        }
                    }
                    return null;
                } catch (err) {
                    return null;
                }
            }"""
            )
            return completed_time

        except Exception as e:
            print(f"⚠️ Error extracting timesheet data: {e}")
            return None

    async def scrape_details_from_page(self, page):
        """
        Extract address and timesheet data from work order detail page.

        Args:
            page: Playwright page object

        Returns:
            dict: { full_address, completed_elapsed_time }
        """
        try:
            # Wait for address elements
            await page.wait_for_selector(
                '[data-automation-id="address1"]', state="attached", timeout=60000
            )
            
            # Extract address
            address_data = await page.evaluate(
                r"""() => {
                try {
                    const address1 = document.querySelector('[data-automation-id="address1"]').innerText.trim();
                    const address2 = document.querySelector('[data-automation-id="address2"]').innerText.trim();
                    return `${address1}, ${address2}`;
                } catch (err) {
                    return null;
                }
            }"""
            )

            # Extract Timesheet completion time
            completed_time = await self.scrape_timesheet_data(page)

            print(f"✅ Address: {address_data} | Completed Time: {completed_time}")

            return {
                "full_address": address_data,
                "completed_elapsed_time": completed_time
            }

        except Exception as e:
            print(f"Error extracting details: {e}")
            return None

    async def fetch_details_for_work_orders(self, work_orders):
        """
        Process each work order to get details.
        """
        result = []
        base_xpath_config = self.rules.get("open_work_order_xpath", [])

        while work_orders:
            work_order = work_orders.pop(0)
            wo_number = work_order.get("wo_number", "").strip()
            retry_count = work_order.get("try_later", 0)

            if not wo_number or retry_count >= 2:
                continue

            try:
                xpath_config = copy.deepcopy(base_xpath_config)
                wo_xpath = xpath_config[0]["xpath"]
                xpath_config[0]["xpath"] = wo_xpath.replace("{work_order_number}", wo_number)

                async with self.page.context.expect_page() as new_page_info:
                    await self.perform_actions_by_xpaths(action_list=xpath_config)

                new_page = await new_page_info.value
                await new_page.wait_for_load_state()
                
                # Check login
                if "Login" in new_page.url:
                    await self.login_fieldedge(page=new_page)
                    await new_page.wait_for_load_state()

                # Extract data
                details = await self.scrape_details_from_page(page=new_page)

                if details:
                    work_order["full_address"] = details["full_address"]
                    work_order["completed_elapsed_time"] = details["completed_elapsed_time"]
                    result.append(work_order)
                else:
                    raise Exception("Failed to scrape details")

            except Exception as e:
                print(f"Failed to scrape {wo_number}: {e}")
                work_order["try_later"] = retry_count + 1
                work_orders.append(work_order)
            finally:
                try:
                    await new_page.close()
                except:
                    pass

        return result

    async def run(self):
        """Execute the workflow."""
        import time as _time
        _start_time = _time.time()
        _error_occurred = None
        _records_processed = 0

        try:
            await self.initialize()

            # Navigate
            dashboard_url = self.rules.get("dashboard_url")
            await self._goto_with_fallback(dashboard_url)
            if "Login" in self.page.url:
                await self.login_fieldedge()

            work_order_url = self.rules.get("work_order_url", "")
            await self._goto_with_fallback(work_order_url)

            # Wait for table
            wait_xpath = self.rules.get("wait_xpath")
            await self.page.wait_for_selector(wait_xpath, state="visible", timeout=60000)

            # Filter
            await self.perform_actions_by_xpaths(name="status_xpath")
            await self.perform_actions_by_xpaths(name="time_entry_scraper_scheduled_date_filter_xpath")
            await self.perform_actions_by_xpaths(name="submit_filter")
            await self.page.wait_for_timeout(5000)

            # Scrape
            scraped = await self.scrape_work_orders_table()
            work_orders = scraped.get("rows", [])
            
            # Fetch details
            final_data = await self.fetch_details_for_work_orders(work_orders)
            _records_processed = len(final_data)
            
            print(f"\n✅ Finished processing {len(final_data)} records.")
            return final_data

        except Exception as e:
            print(f"Scraping error: {e}")
            _error_occurred = str(e)
            return None
        finally:
            await self.cleanup()
            print(f"Execution time: {round(_time.time() - _start_time, 1)}s")


if __name__ == "__main__":
    scraper = WorkOrdersTimeTrackingScraper()
    asyncio.run(scraper.run())
