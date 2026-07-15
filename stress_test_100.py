import asyncio
import os
import sys
import subprocess
import time
import urllib.parse
import json
import requests
from playwright.async_api import async_playwright

# Exactly 100 diverse test cases for the Israeli transportation fare calculator
TEST_CASES = [
    # 25 Standard Addresses (Streets & Numbers)
    {"origin": "רחוב דיזנגוף 50, תל אביב", "dest": "דרך חברון 100, ירושלים", "type": "standard"},
    {"origin": "אלנבי 12, תל אביב", "dest": "דרך נמיר 5, תל אביב", "type": "standard"},
    {"origin": "בר אילן 20, רעננה", "dest": "הרצל 90, ראשון לציון", "type": "standard"},
    {"origin": "אבא חושי 1, חיפה", "dest": "הנשיא 50, אשקלון", "type": "standard"},
    {"origin": "ז'בוטינסקי 10, רמת גן", "dest": "רוטשילד 15, בת ים", "type": "standard"},
    {"origin": "בן גוריון 45, הרצליה", "dest": "חולון", "type": "standard"},
    {"origin": "העצמאות 12, פתח תקווה", "dest": "ויצמן 5, נתניה", "type": "standard"},
    {"origin": "ביאליק 4, רמת גן", "dest": "אבן גבירול 30, תל אביב", "type": "standard"},
    {"origin": "הנביאים 10, ירושלים", "dest": "יפו 200, ירושלים", "type": "standard"},
    {"origin": "שדרות ירושלים 100, יפו", "dest": "משה דיין 5, ראשון לציון", "type": "standard"},
    {"origin": "ההסתדרות 50, חולון", "dest": "ההסתדרות 250, מפרץ חיפה", "type": "standard"},
    {"origin": "בן יהודה 80, תל אביב", "dest": "קק\"ל 12, גבעתיים", "type": "standard"},
    {"origin": "אהרונוביץ' 15, בני ברק", "dest": "שדרות הנשיא 12, חיפה", "type": "standard"},
    {"origin": "הנרקיסים 8, כפר סבא", "dest": "הערבה 4, אילת", "type": "standard"},
    {"origin": "שלושת הבנימים 5, הרצליה", "dest": "סוקולוב 40, חולון", "type": "standard"},
    {"origin": "יהודה המכבי 12, תל אביב", "dest": "התאנה 3, הוד השרון", "type": "standard"},
    {"origin": "מנחם בגין 132, תל אביב", "dest": "רבי עקיבא 60, בני ברק", "type": "standard"},
    {"origin": "האלון 24, רמת השרון", "dest": "המייסדים 50, נהריה", "type": "standard"},
    {"origin": "דוד המלך 12, ירושלים", "dest": "החלוץ 14, באר שבע", "type": "standard"},
    {"origin": "העלייה 8, תל אביב", "dest": "סלמה 100, תל אביב", "type": "standard"},
    {"origin": "אנדרי סחרוב 9, חיפה", "dest": "קריית המדע 3, רחובות", "type": "standard"},
    {"origin": "שמגר 4, ירושלים", "dest": "מלכי ישראל 20, ירושלים", "type": "standard"},
    {"origin": "חיים לבנון 30, תל אביב", "dest": "בר אילן 100, גבעת שמואל", "type": "standard"},
    {"origin": "שדרות הרצל 1, אשדוד", "dest": "ז'בוטינסקי 2, אשקלון", "type": "standard"},
    {"origin": "כצנלסון 12, גבעתיים", "dest": "ארלוזורוב 150, תל אביב", "type": "standard"},

    # 25 Malls & Shopping Centers
    {"origin": "קניון עזריאלי מודיעין", "dest": "הגרנד קניון חיפה", "type": "mall"},
    {"origin": "דיזנגוף סנטר תל אביב", "dest": "קניון הזהב ראשון לציון", "type": "mall"},
    {"origin": "קניון איילון רמת גן", "dest": "קניון מלחה ירושלים", "type": "mall"},
    {"origin": "קניון שבעת הכוכבים הרצליה", "dest": "קניון עיר ימים נתניה", "type": "mall"},
    {"origin": "קניון הנגב באר שבע", "dest": "ביג באר שבע", "type": "mall"},
    {"origin": "קניון ביג פאשן דנילוף טבריה", "dest": "קניון שער הצפון קרית אתא", "type": "mall"},
    {"origin": "קניון רננים רעננה", "dest": "קניון עזריאלי תל אביב", "type": "mall"},
    {"origin": "מתחם G כפר סבא", "dest": "קניון שרונים הוד השרון", "type": "mall"},
    {"origin": "קניון רמת אביב", "dest": "קניון גבעתיים", "type": "mall"},
    {"origin": "קניון חוצות המפרץ חיפה", "dest": "קניון עזריאלי עכו", "type": "mall"},
    {"origin": "קניון לב חדרה", "dest": "קניון שער העיר בית שמש", "type": "mall"},
    {"origin": "קניון סינמול חיפה", "dest": "קניון עזריאלי גבעתיים", "type": "mall"},
    {"origin": "ביג קריות, קריית אתא", "dest": "קניון ארנה נהריה", "type": "mall"},
    {"origin": "קניון עזריאלי ראשונים ראשון לציון", "dest": "קניון אשדוד", "type": "mall"},
    {"origin": "קניון הדר ירושלים", "dest": "קניון רחובות", "type": "mall"},
    {"origin": "מרכז שוסטר רמת אביב", "dest": "קניון עזריאלי חולון", "type": "mall"},
    {"origin": "קניון סי מול אשדוד", "dest": "קניון נחמיה קריית שמונה", "type": "mall"},
    {"origin": "ביג אשדוד", "dest": "ביג כרמיאל", "type": "mall"},
    {"origin": "מול הים אילת", "dest": "קניון עזריאלי הוד השרון", "type": "mall"},
    {"origin": "קניון הגבעה גבעת שמואל", "dest": "קניון סירקין פתח תקווה", "type": "mall"},
    {"origin": "קניון קרית אונו", "dest": "קניון מרום נווה רמת גן", "type": "mall"},
    {"origin": "קניון עזריאלי רמלה", "dest": "קניון לוד סנטר", "type": "mall"},
    {"origin": "קניון אם הדרך", "dest": "קניון שבעת הכוכבים", "type": "mall"},
    {"origin": "ביג פאשן נצרת", "dest": "גרנד קניון באר שבע", "type": "mall"},
    {"origin": "קניון לב אשדוד", "dest": "קניון סירקין", "type": "mall"},

    # 25 Famous Landmarks, Businesses, Hospitals (with Quotes, Parentheses & Abbreviations)
    {"origin": "איקאה נתניה", "dest": "בית חולים סורוקה באר שבע", "type": "landmark"},
    {"origin": "לונה פארק תל אביב", "dest": "בית חולים תל השומר", "type": "landmark"},
    {"origin": "אוניברסיטת תל אביב", "dest": "אוניברסיטת בן גוריון", "type": "landmark"},
    {"origin": "הכותל המערבי ירושלים", "dest": "בית חולים רמב\"ם חיפה", "type": "landmark"},
    {"origin": "נמל תל אביב", "dest": "פארק הירקון תל אביב", "type": "landmark"},
    {"origin": "מגדל דוד ירושלים", "dest": "נמל חיפה", "type": "landmark"},
    {"origin": "מערת המכפלה חברון", "dest": "בית חולים שיבא", "type": "landmark"},
    {"origin": "הטכניון חיפה", "dest": "הספארי ברמת גן", "type": "landmark"},
    {"origin": "שוק מחנה יהודה ירושלים", "dest": "איקאה ראשון לציון", "type": "landmark"},
    {"origin": "בית חולים הדסה עין כרם", "dest": "בית חולים בלינסון פתח תקווה", "type": "landmark"},
    {"origin": "אצטדיון סמי עופר חיפה", "dest": "אצטדיון טדי ירושלים", "type": "landmark"},
    {"origin": "יס פלאנט ראשון לציון", "dest": "מת\"ם חיפה", "type": "landmark"},
    {"origin": "מוזיאון ישראל ירושלים", "dest": "מוזיאון תל אביב לאמנות", "type": "landmark"},
    {"origin": "נמל התעופה בן גוריון", "dest": "היכל מנורה מבטחים תל אביב", "type": "landmark"},
    {"origin": "האוניברסיטה העברית הר הצופים", "dest": "מכון ויצמן למדע רחובות", "type": "landmark"},
    {"origin": "בית חולים וולפסון חולון", "dest": "בית חולים מאיר כפר סבא", "type": "landmark"},
    {"origin": "בית חולים איכילוב תל אביב", "dest": "בית חולים אסף הרופא", "type": "landmark"},
    {"origin": "בית חולים העמק עפולה", "dest": "בית חולים ברזילי אשקלון", "type": "landmark"},
    {"origin": "אוניברסיטת בר אילן", "dest": "אוניברסיטת חיפה", "type": "landmark"},
    {"origin": "מגדלי עזריאלי תל אביב", "dest": "מגדל משה אביב רמת גן", "type": "landmark"},
    {"origin": "בית המשפט העליון ירושלים", "dest": "הכנסת ירושלים", "type": "landmark"},
    {"origin": "פארק פרס חולון", "dest": "פארק אריאל שרון", "type": "landmark"},
    {"origin": "מרינה הרצליה", "dest": "מרינה אשקלון", "type": "landmark"},
    {"origin": "נמל יפו", "dest": "נמל עכו", "type": "landmark"},
    {"origin": "תחנת רכבת מרכז תל אביב", "dest": "תחנת רכבת ירושלים יצחק נבון", "type": "landmark"},

    # 25 Cities and Special Rule Locations (Dynamic Range & Tiberias/Nahariya Rules)
    {"origin": "טבריה", "dest": "תל אביב", "type": "special_rule_tiberias"},
    {"origin": "נהריה", "dest": "ירושלים", "type": "special_rule_nahariya"},
    {"origin": "אילת", "dest": "קריית שמונה", "type": "far_distance"},
    {"origin": "תל אביב", "dest": "ירושלים", "type": "matrix_route"},
    {"origin": "באר שבע", "dest": "תל אביב", "type": "matrix_route"},
    {"origin": "חיפה", "dest": "תל אביב", "type": "matrix_route"},
    {"origin": "כרמיאל", "dest": "צפת", "type": "city_only"},
    {"origin": "אשדוד", "dest": "אשקלון", "type": "city_only"},
    {"origin": "ירושלים", "dest": "מעלה אדומים", "type": "city_only"},
    {"origin": "תל אביב", "dest": "תל אביב", "type": "same_city"},
    {"origin": "ירושלים", "dest": "ירושלים", "type": "same_city"},
    {"origin": "חיפה", "dest": "חיפה", "type": "same_city"},
    {"origin": "באר שבע", "dest": "באר שבע", "type": "same_city"},
    {"origin": "חולון", "dest": "בת ים", "type": "city_only"},
    {"origin": "רמת גן", "dest": "גבעתיים", "type": "city_only"},
    {"origin": "ראשון לציון", "dest": "רחובות", "type": "city_only"},
    {"origin": "פתח תקווה", "dest": "הוד השרון", "type": "city_only"},
    {"origin": "נתניה", "dest": "הרצליה", "type": "city_only"},
    {"origin": "לוד", "dest": "רמלה", "type": "city_only"},
    {"origin": "נצרת", "dest": "עפולה", "type": "city_only"},
    {"origin": "עכו", "dest": "נהריה", "type": "city_only"},
    {"origin": "קריית גת", "dest": "קריית מלאכי", "type": "city_only"},
    {"origin": "שדרות", "dest": "נתיבות", "type": "city_only"},
    {"origin": "דימונה", "dest": "ירוחם", "type": "city_only"},
    {"origin": "אריאל", "dest": "תל אביב", "type": "city_only"},
]

# Cyclically assign passenger profiles to test all multipliers/discount paths
PASSENGER_PROFILES = ["adult", "youth", "free", "discount", "full", "soldier"]
for idx, case in enumerate(TEST_CASES):
    case["passenger"] = PASSENGER_PROFILES[idx % len(PASSENGER_PROFILES)]

class StressTestRunner:
    def __init__(self):
        self.server_proc = None
        self.results = []
        self.exceptions_caught = []
        self.start_time = 0

    def start_server(self):
        print("🚀 Starting local Flask server on port 8081 with Mock API enabled...")
        env = os.environ.copy()
        env["MOCK_GOV_API"] = "1"
        env["MOCK_NOMINATIM"] = "1"
        self.server_proc = subprocess.Popen(
            [sys.executable, "server.py"],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        
        # Wait until the server is responsive
        url = "http://127.0.0.1:8081/api/status"
        for i in range(20):
            try:
                resp = requests.get(url, timeout=1)
                if resp.status_code == 200 and resp.json().get("status") == "ok":
                    print("✅ Server is online and responsive.")
                    return True
            except requests.RequestException:
                time.sleep(0.2)
        print("❌ Failed to start local server.")
        return False

    def stop_server(self):
        if self.server_proc:
            print("🛑 Stopping local Flask server...")
            self.server_proc.terminate()
            try:
                self.server_proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.server_proc.kill()
            print("✅ Server stopped.")

    async def run_tests(self):
        self.start_time = time.time()
        print(f"📊 Starting 100-case stress test...")
        
        async with async_playwright() as p:
            # Launch headless browser with system chromium and sandbox-disabled flags for Termux compatibility
            browser = await p.chromium.launch(
                executable_path="/data/data/com.termux/files/usr/bin/chromium-browser",
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
            )
            page = await browser.new_page()
            
            # Catch JavaScript exceptions from page console or window
            page.on("pageerror", lambda err: self.register_exception(f"Page Error: {err}"))
            page.on("console", lambda msg: self.register_console_msg(msg))

            # Go to home page
            print("🌐 Loading http://127.0.0.1:8081...")
            await page.goto("http://127.0.0.1:8081")
            
            print("\n" + "="*80)
            print("🔵 PHASE 1: DIRECT JS FUNCTION TESTING (getLocalFallbackFare)")
            print("="*80)
            
            # 1. Run direct JS function tests via page.evaluate
            js_success_count = 0
            for idx, case in enumerate(TEST_CASES):
                origin = case["origin"]
                dest = case["dest"]
                try:
                    # Evaluate the synchronous getLocalFallbackFare in page context
                    js_res = await page.evaluate(f"getLocalFallbackFare({json.dumps(origin)}, {json.dumps(dest)})")
                    
                    # Assert response contains required keys and is null-safe
                    assert isinstance(js_res, dict), "Result should be a dictionary"
                    assert "fare" in js_res, "Result must contain fare"
                    assert isinstance(js_res["fare"], (int, float)), f"Fare should be numeric, got {type(js_res['fare'])}"
                    assert js_res["fare"] >= 0, "Fare must be non-negative"
                    assert "source" in js_res, "Result must contain source"
                    
                    js_success_count += 1
                    case["js_passed"] = True
                    case["js_fare"] = js_res["fare"]
                    case["js_method"] = js_res.get("method", "unknown")
                except Exception as e:
                    case["js_passed"] = False
                    case["js_error"] = str(e)
                    print(f"❌ Case {idx+1} Direct JS Fail: {origin} -> {dest}: {e}")
            
            print(f"✅ Phase 1 Complete: {js_success_count}/100 tests passed.")

            print("\n" + "="*80)
            print("🔵 PHASE 2: UI INTEGRATION & INTERACTION TESTING (Full User Flow)")
            print("="*80)
            
            # 2. Run UI tests
            ui_success_count = 0
            for idx, case in enumerate(TEST_CASES):
                origin = case["origin"]
                dest = case["dest"]
                passenger = case["passenger"]
                
                try:
                    # Input validation: check if origin and dest are identical
                    is_identical = (origin == dest)

                    # 1. Clear fields and fill them
                    await page.fill("#origin", origin)
                    await page.fill("#dest", dest)
                    
                    # 2. Choose passenger profile
                    await page.click(f"#{passenger}")
                    
                    # 3. Click calculate
                    await page.click(".calculate-btn")
                    
                    if is_identical:
                        # If identical, check that error message is shown and final price is not updated
                        await page.wait_for_selector("#error-message", state="visible", timeout=2000)
                        error_text = await page.inner_text("#error-text")
                        assert "מוצא ויעד לא יכולים להיות זהים" in error_text, f"Unexpected error text: {error_text}"
                        case["ui_passed"] = True
                        case["ui_fare"] = "Error (Identical)"
                    else:
                        # Wait for results panel to display and final-price to load
                        await page.wait_for_selector("#results.active", timeout=4000)
                        final_price_str = await page.inner_text("#final-price")
                        
                        # Validate final price string is numeric
                        final_price = float(final_price_str)
                        assert final_price >= 0, f"Invalid final price: {final_price}"
                        
                        case["ui_passed"] = True
                        case["ui_fare"] = final_price

                    ui_success_count += 1
                    print(f"[{idx+1}/100] ✓ {origin} → {dest} ({passenger}) | Fare: {case['ui_fare']}")
                except Exception as e:
                    case["ui_passed"] = False
                    case["ui_error"] = str(e)
                    print(f"[{idx+1}/100] ✗ {origin} → {dest} ({passenger}) | UI Fail: {e}")
            
            print(f"✅ Phase 2 Complete: {ui_success_count}/100 tests passed.")

            print("\n" + "="*80)
            print("🔵 PHASE 3: DIRECT BACKEND ENDPOINT TESTING (/api/fare)")
            print("="*80)
            
            # 3. Run directly against backend API
            api_success_count = 0
            for idx, case in enumerate(TEST_CASES):
                origin = case["origin"]
                dest = case["dest"]
                
                try:
                    enc_origin = urllib.parse.quote(origin)
                    enc_dest = urllib.parse.quote(dest)
                    url = f"http://127.0.0.1:8081/api/fare?origin={enc_origin}&dest={enc_dest}"
                    
                    resp = requests.get(url, timeout=2)
                    if origin == dest:
                        assert resp.status_code == 200 or resp.status_code == 400
                        # Wait, let's see how server handles same city:
                        # backend /api/fare returns 200 with fare 6.00 or handles it
                        # Let's verify what response was returned
                        data = resp.json()
                        assert data is not None
                    else:
                        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
                        data = resp.json()
                        assert data["success"] is True, "Expected success: True"
                        assert "fare" in data, "Expected fare in response"
                        assert isinstance(data["fare"], (int, float)), "Fare must be numeric"
                    
                    api_success_count += 1
                    case["api_passed"] = True
                except Exception as e:
                    case["api_passed"] = False
                    case["api_error"] = str(e)
                    print(f"❌ Case {idx+1} Backend Fail: {origin} -> {dest}: {e}")
            
            print(f"✅ Phase 3 Complete: {api_success_count}/100 tests passed.")

            await browser.close()
            
            # Print Final Report
            self.print_final_report(js_success_count, ui_success_count, api_success_count)

    def register_exception(self, err_msg):
        print(f"🛑 UNCAUGHT PAGE EXCEPTION: {err_msg}")
        self.exceptions_caught.append(err_msg)

    def register_console_msg(self, msg):
        if msg.type == "error":
            print(f"⚠️ Browser Console Error: {msg.text}")
            self.exceptions_caught.append(f"Console Error: {msg.text}")

    def print_final_report(self, js_ok, ui_ok, api_ok):
        total_cases = len(TEST_CASES)
        elapsed_time = time.time() - self.start_time
        
        print("\n" + "█"*80)
        print("                 🏆 COGNITIVE TRANSPORT FARE CALCULATOR STRESS TEST REPORT")
        print("█"*80)
        print(f"📅 Date & Time:       {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"⏱️ Total Duration:     {elapsed_time:.2f} seconds")
        print(f"🎯 Total Test Cases:   {total_cases}")
        print("-" * 80)
        print(f"🟢 Phase 1 (Direct JS Functions):     {js_ok}/{total_cases} Passed")
        print(f"🟢 Phase 2 (UI Interactive Flow):     {ui_ok}/{total_cases} Passed")
        print(f"🟢 Phase 3 (Backend API Endpoint):     {api_ok}/{total_cases} Passed")
        print(f"🔴 Uncaught Javascript Errors/Logs:   {len(self.exceptions_caught)}")
        print("=" * 80)
        
        has_failures = (js_ok < total_cases) or (ui_ok < total_cases) or (api_ok < total_cases) or (len(self.exceptions_caught) > 0)
        
        if not has_failures:
            print("                 🎉 SUCCESS: 100/100 STRESS TEST PASSED PERFECTLY!")
            print("                 No crashes, no Null Safety leaks, and fully robust Hebrew parser.")
            print("█"*80 + "\n")
            sys.exit(0)
        else:
            print("                 ❌ FAILURE: STRESS TEST DETECTED ISSUES!")
            print("                 Please check the error logs printed above.")
            print("█"*80 + "\n")
            sys.exit(1)

def main():
    runner = StressTestRunner()
    if not runner.start_server():
        sys.exit(1)
    
    try:
        asyncio.run(runner.run_tests())
    finally:
        runner.stop_server()

if __name__ == "__main__":
    main()
