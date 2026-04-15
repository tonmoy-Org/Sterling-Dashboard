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
        
        # Load scraping rules
        self.rules = self._load_rules()
    
    def _load_rules(self):
        """
        Load scraping rules from JSON configuration file.
        
        Returns:
            dict: Parsed rules configuration or empty dict on error.
        """
        try:
            with open(RULES_FILE_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if len(data) > 0:
                return data[0]  # Assuming single config object in array
            
            return {}
            
        except FileNotFoundError:
            print(f"Rules file not found at: {RULES_FILE_PATH}")
            return {}
        except json.JSONDecodeError as e:
            print(f"Error parsing rules JSON: {e}")
            return {}
        except Exception as e:
            print(f"Unexpected error loading rules: {e}")
            return {}
    
    async def initialize(self):
        """
        Launch and configure the browser instance.
        Uses non-headless mode with slight delay for stability.
        """
        try:
            self.playwright = await async_playwright().start()
            
            # Launch browser with explicit viewport to prevent responsive layout breaks in headless mode
            self.browser = await self.playwright.chromium.launch(
                headless=False,
                slow_mo=50,
                args=["--start-maximized", "--window-size=1920,1080"]
            )
            
            self.context = await self.browser.new_context(
                viewport={"width": 1220, "height": 680},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
            self.page = await self.context.new_page()
            
            print("Browser initialized successfully.")
            
        except Exception as e:
            print(f"Failed to initialize browser: {e}")
            raise
    
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
                    await element.first.wait_for(state="attached", timeout=wait_timeout)
                except Exception:
                    pass  # Let the count() check below handle the failure properly
                
                element_count = await element.count()
                
                if element_count > 0:
                    if action == "click":
                        await element.click(timeout=5000)
                        print(f"Clicked element: {xpath}")
                    
                    elif action == "right_click":
                        await element.click(button="right", timeout=5000)
                        print(f"Right-clicked element: {xpath}")
                    
                    elif action == "input":
                        if value is not None:
                            await element.fill(str(value))
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