"""
Base Scraper Class
Provides common functionality for all scraper implementations.
"""
import os
import json
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from playwright.async_api import async_playwright, Page
import pytz

from automation.services.api_client import APIClient

# Load environment variables
load_dotenv()

# Configuration paths
RULES_FILE_PATH = os.getenv("RULES_FILE_PATH", "config/scraper_rules.json")


class BaseScraper:
    """
    Base class for all scrapers providing common browser automation
    and authentication functionality.
    """
    
    def __init__(self):
        """Initialize scraper with browser and API client."""
        # Playwright instances
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        
        # API client for data insertion
        self.api_client = APIClient()
        
        # Credentials from environment
        self.fieldedge_email = os.getenv("DASH_EMAIL")
        self.fieldedge_password = os.getenv("DASH_PASSWORD")
        self.rme_username = os.getenv("RME_username")
        self.rme_password = os.getenv("RME_password")
        self.fleetmatics_email = os.getenv("FLEETMATICS_EMAIL")
        self.fleetmatics_password = os.getenv("FLEETMATICS_PASSWORD")
        
        # Load scraping rules
        self.rules = self._load_rules()
    
    def _load_rules(self):
        """
        Load scraping rules from JSON configuration file.
        Attempts multiple paths to ensure robustness across different environments.
        """
        # List of potential paths to check
        potential_paths = [
            RULES_FILE_PATH,
            os.path.join("Backend", "automation", "config", "scraper_rules.json"),
            os.path.join("automation", "config", "scraper_rules.json"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "scraper_rules.json")
        ]
        
        rules_data = None
        for path in potential_paths:
            if os.path.exists(path):
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        rules_data = json.load(f)
                    print(f"✅ Rules loaded successfully from: {path}")
                    break
                except Exception as e:
                    print(f"⚠️ Failed to load rules from {path}: {e}")
        
        if not rules_data:
            print(f"❌ Rules file not found! Checked: {potential_paths}")
            return {}

        return rules_data[0] if isinstance(rules_data, list) and len(rules_data) > 0 else rules_data
    
    async def initialize(self):
        """
        Launch and configure the browser instance.
        Uses headless mode with a full desktop viewport and Linux-safe flags.
        """
        try:
            self.playwright = await async_playwright().start()
            
            # Launch browser with headless-safe arguments for Linux VPS
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                slow_mo=50,
                args=[
                    "--start-maximized",
                    "--window-size=1920,1080",
                    "--no-sandbox",                         # Required on Linux (especially containers/VPS)
                    "--disable-dev-shm-usage",              # Prevents /dev/shm OOM crashes on Linux
                    "--disable-gpu",                        # Avoid GPU issues in headless
                    "--disable-blink-features=AutomationControlled",  # Bypass bot detection
                ]
            )
            
            # Use a full desktop viewport so the site renders its desktop layout,
            # not a responsive/mobile view that changes element structure.
            self.context = await self.browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
            self.page = await self.context.new_page()
            
            print("Browser initialized successfully.")
            
        except Exception as e:
            print(f"Failed to initialize browser: {e}")
            raise

    async def _goto_with_fallback(self, url: str, *, timeout_ms: int = 60000, max_retries: int = 2):
        """
        Navigate reliably for pages that keep background requests alive or time out.
        Attempts navigation with networkidle first, falls back to domcontentloaded.
        Includes a retry mechanism.
        """
        if not url:
            return

        for attempt in range(max_retries + 1):
            try:
                # Try networkidle first as it ensures the page is more "ready"
                print(f"Attempting to navigate to {url} (Attempt {attempt + 1}/{max_retries + 1})")
                await self.page.goto(url, wait_until="networkidle", timeout=timeout_ms)
                return
            except Exception as e:
                print(f"⚠️ networkidle navigation failed for {url} (Attempt {attempt + 1}): {e}")
                
                try:
                    # Fallback for SPA pages where network never becomes fully idle
                    print(f"Retrying with domcontentloaded for {url}...")
                    await self.page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
                    
                    # Dismiss Pendo overlays if they appear
                    try:
                        await self.page.evaluate("""() => {
                            const pendo = document.querySelectorAll('[id^="pendo-"], ._pendo-backdrop');
                            pendo.forEach(el => el.remove());
                        }""")
                    except:
                        pass
                    return
                except Exception as e2:
                    print(f"⚠️ domcontentloaded navigation failed for {url} (Attempt {attempt + 1}): {e2}")
            
            if attempt < max_retries:
                wait_time = (attempt + 1) * 2000
                print(f"Waiting {wait_time}ms before retry...")
                await asyncio.sleep(wait_time / 1000)
        
        # If all retries fail, raise the last error
        print(f"❌ All navigation attempts failed for {url}")
        raise Exception(f"Failed to navigate to {url} after {max_retries + 1} attempts")
    
    async def login_fieldedge(self, page:Page=None):
        """Authenticate to FieldEdge dashboard."""
        try:
            if not page:
                page = self.page

            username_xpath = self.rules.get('username_xpath')
            password_xpath = self.rules.get('password_xpath')
            login_button_xpath = self.rules.get('login_button_xpath')
            
            await page.fill(username_xpath, self.fieldedge_email)
            await page.fill(password_xpath, self.fieldedge_password)
            
            # Wait for navigation and click submit simultaneously
            async with page.expect_navigation(wait_until='domcontentloaded'):
                await page.click(login_button_xpath)
            
            print("FieldEdge login successful.")
            
        except Exception as e:
            print(f"FieldEdge login failed: {e}")
            raise
    
    async def login_online_rme(self):
        """Authenticate to Online RME system."""
        try:
            username_xpath = self.rules.get('RME_username_xpath')
            password_xpath = self.rules.get('RME_password_xpath')
            login_button_xpath = self.rules.get('RME_login_button_xpath')
            
            await self.page.fill(username_xpath, self.rme_username)
            await self.page.fill(password_xpath, self.rme_password)
            
            # Wait for navigation and click submit simultaneously
            async with self.page.expect_navigation(wait_until='domcontentloaded'):
                await self.page.click(login_button_xpath)
            
            print("Online RME login successful.")
            
        except Exception as e:
            print(f"Online RME login failed: {e}")
            raise

    async def login_fleetmatics(self):
        """Authenticate to Fleetmatics Reveal system."""
        try:
            url = self.rules.get('fleetmatics_url')
            email_xpath = self.rules.get('fleetmatics_email_xpath')
            email_button_xpath = self.rules.get('fleetmatics_email_button_xpath')
            password_xpath = self.rules.get('fleetmatics_password_xpath')
            password_button_xpath = self.rules.get('fleetmatics_password_button_xpath')

            await self.page.goto(url, wait_until="networkidle")

            # Step 1: Email
            await self.page.fill(email_xpath, self.fleetmatics_email)
            await self.page.click(email_button_xpath)
            
            # Wait for password field
            await self.page.wait_for_selector(password_xpath, timeout=10000)

            # Step 2: Password
            await self.page.fill(password_xpath, self.fleetmatics_password)
            
            # Wait for navigation after clicking login
            async with self.page.expect_navigation(wait_until='networkidle', timeout=30000):
                await self.page.click(password_button_xpath)
            
            print("Fleetmatics login successful.")
            
        except Exception as e:
            print(f"Fleetmatics login failed: {e}")
            raise
    
    async def perform_actions_by_xpaths(self, name:str='', action_list:list=None, value:str=None, raise_on_error:bool=False):
        """
        Execute actions (click, right-click, input) on elements by XPath.
        
        Args:
            name: Key to lookup in rules configuration
            action_list: List of action dictionaries (fallback if name not found)
            value: Value to input for 'input' actions
            raise_on_error: If True, raises Exception on any failure or missing element
        """
        
        if action_list is None:
            action_list = []
            
        xpaths = self.rules.get(name, action_list)
        
        has_executed = False
        
        for item in xpaths:
            action = item.get("action", "")
            xpath = item.get("xpath", "")
            js_code = item.get("js_code", "")
            timeout = item.get("timeout", 2000)  # Default timeout for actions

            # Wait action does not require a selector.
            if action == "wait":
                await asyncio.sleep(timeout / 1000)  # Convert ms to seconds
                print(f"Waited for {timeout} ms")
                continue

            # JS action may come from dedicated key, or legacy xpath key.
            if action == "js_code_run":
                code_to_run = js_code or xpath
                if not code_to_run:
                    print("Warning: Empty js_code in action configuration")
                    continue
                try:
                    await self.page.evaluate(code_to_run)
                    print(f"Executed JS code: {code_to_run}")
                    await asyncio.sleep(3)
                    has_executed = True
                except Exception as e:
                    print(f"Action '{action}' failed for script '{code_to_run}': {e}")
                    if raise_on_error:
                        raise Exception(f"Action '{action}' failed for script '{code_to_run}': {e}") from e
                continue
            
            if not xpath:
                print("Warning: Empty xpath in action configuration")
                continue
            
            element = self.page.locator(xpath)
            
            try:
                # Playwright's locator.count() resolves instantly. 
                # On a headless VPS, we must explicitly wait for the element to attach first.
                wait_timeout = item.get("timeout", 15000)
                try:
                    # Proactively dismiss any Pendo overlays that might intercept clicks or delay rendering
                    try:
                        await self.page.evaluate("""() => {
                            const pendo = document.querySelectorAll('[id^="pendo-"], ._pendo-backdrop');
                            pendo.forEach(el => el.remove());
                        }""")
                    except:
                        pass
                    await element.first.wait_for(state="attached", timeout=wait_timeout)
                    await element.first.wait_for(state="visible", timeout=wait_timeout)
                except Exception:
                    pass  # Let the count() check below handle the failure properly
                
                element_count = await element.count()
                
                if element_count > 0:
                    # Use .first when multiple elements match to avoid strict mode violations
                    target = element.first if element_count > 1 else element
                    
                    if action == "click":
                        try:
                            await target.click(timeout=5000, force=True)
                        except Exception:
                            # Fallback: JS click for elements invisible in headless (e.g. custom context menus)
                            await target.evaluate("el => el.click()")
                        print(f"Clicked element: {xpath}")
                    
                    elif action == "right_click":
                        try:
                            await target.click(button="right", timeout=5000, force=True)
                        except Exception:
                            # Fallback: dispatch a contextmenu event via JS
                            await target.evaluate("""el => {
                                el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
                            }""")
                        print(f"Right-clicked element: {xpath}")
                    
                    elif action == "input":
                        if value is not None:
                            await target.fill(str(value))
                            print(f"Input '{value}' into element: {xpath}")
                        else:
                            print(f"Warning: Action is 'input' but no value provided for: {xpath}")
                    else:
                        print(f"Unknown action '{action}' for xpath '{xpath}'")
                    
                    # Brief pause between actions for stability
                    await asyncio.sleep(3)
                    has_executed = True
                else:
                    print(f"Element count 0 for xpath: {xpath}")
                    if raise_on_error:
                        raise Exception(f"Element not found for xpath '{xpath}'")
            except Exception as e:
                print(f"Action '{action}' failed for xpath '{xpath}': {e}")
                if raise_on_error:
                    raise Exception(f"Action '{action}' failed for xpath '{xpath}': {e}") from e
        
        if not has_executed:
            print(f"Element not found or all actions failed for: {name or action_list}")
            if raise_on_error:
                raise Exception(f"Element not found or all actions failed for: {name or action_list}")
    
    def insert_locates(self, locates_data):
        """
        Insert scraped locates data via API.
        
        Args:
            locates_data: Dictionary containing work orders data
            
        Returns:
            bool: True if insertion successful, False otherwise
        """
        try:
            success = self.api_client.insert_locates(locates_data)
            return success
        except Exception as e:
            print(f"Database insertion error: {e}")
            return False
    
    def insert_work_order_today(self, work_orders):
        """
        Insert today's work orders with proper date/time formatting.
        
        Args:
            work_orders: List of work order dictionaries
            
        Returns:
            bool: True if all insertions successful, False otherwise
        """
        try:
            timezone = pytz.timezone('Etc/GMT+8')
            gmt_minus_8_time = datetime.now(timezone)
            
            for work_order in work_orders:
                # Add timestamp
                work_order['elapsed_time'] = gmt_minus_8_time.isoformat()
                
                # Format scheduled date
                scheduled_date = work_order.get('scheduled_date', '')
                if scheduled_date:
                    try:
                        date_obj = datetime.strptime(scheduled_date, '%m/%d/%Y')
                        work_order['scheduled_date'] = date_obj.replace(
                            hour=0, minute=0, second=0
                        ).isoformat()
                    except ValueError:
                        work_order['scheduled_date'] = None
                else:
                    work_order['scheduled_date'] = None
                
                # Insert via API
                if self.api_client.insert_work_order_today(work_order):
                    print(f"Work order {work_order.get('wo_number', 'N/A')} inserted.")
                else:
                    print(f"Failed to insert work order {work_order.get('wo_number', 'N/A')}.")
            
            return True
            
        except Exception as e:
            print(f"Database insertion error: {e}")
            return False
    
    async def cleanup(self):
        """Clean up browser resources."""
        try:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            print("Browser cleanup completed.")
        except Exception as e:
            print(f"Error during cleanup: {e}")