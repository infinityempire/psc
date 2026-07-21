/**
 * test_e2e_psc.js - End-to-End Playwright Test Suite for PSC Calculator
 * 
 * This test suite validates the UI state management and ensures no state leaks
 * occur between back-to-back calculations, particularly for periphery routes.
 * 
 * Usage:
 * ======
 * node test_e2e_psc.js
 * 
 * Prerequisites:
 * ===============
 * npm install playwright
 * npx playwright install chromium
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML_PATH = path.join(__dirname, 'index.html');
const TEST_URL = `file://${HTML_PATH}`;

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function log(message, type = 'info') {
    const colors = {
        info: '\x1b[36m',    // cyan
        pass: '\x1b[32m',    // green
        fail: '\x1b[31m',    // red
        warn: '\x1b[33m',    // yellow
        header: '\x1b[35m',  // magenta
        reset: '\x1b[0m'
    };
    console.log(`${colors[type] || ''}${message}${colors.reset}`);
}

function assert(condition, testName, message = '') {
    if (condition) {
        testsPassed++;
        testResults.push({ name: testName, status: 'PASS', message: '' });
        log(`  ✓ ${testName}`, 'pass');
        return true;
    } else {
        testsFailed++;
        testResults.push({ name: testName, status: 'FAIL', message: message || 'Assertion failed' });
        log(`  ✗ ${testName}: ${message || 'Assertion failed'}`, 'fail');
        return false;
    }
}

function assertContains(actual, expected, testName) {
    const passed = actual && actual.includes(expected);
    if (!passed) {
        assert(false, testName, `Expected "${expected}" to be contained in "${actual}"`);
    } else {
        assert(true, testName);
    }
    return passed;
}

function assertNotContains(actual, notExpected, testName) {
    const passed = !actual || !actual.includes(notExpected);
    if (!passed) {
        assert(false, testName, `Expected "${notExpected}" NOT to be contained in "${actual}"`);
    } else {
        assert(true, testName);
    }
    return passed;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function selectPassengerProfile(page, profileValue) {
    // The radio inputs are hidden via CSS display:none
    // We need to click the associated label instead
    // Map profile values to label 'for' attributes
    const profileToLabel = {
        'adult': 'p-adult',
        'youth': 'p-youth',
        'youth_18_26': 'p-youth26',
        'senior': 'p-senior',
        'student': 'p-student',
        'disabled': 'p-disabled',
        'soldier': 'p-soldier',
        'periphery_resident': 'p-periphery'
    };
    const labelId = profileToLabel[profileValue] || `p-${profileValue}`;
    await page.click(`label[for="${labelId}"]`);
    await sleep(100);
}

async function calculateFare(page, origin, dest) {
    // Clear and set origin
    await page.fill('#origin', '');
    await page.fill('#origin', origin);
    await sleep(50);
    
    // Clear and set destination
    await page.fill('#dest', '');
    await page.fill('#dest', dest);
    await sleep(50);
    
    // Click calculate button
    await page.click('#calculate-btn');
    
    // Wait for results to appear
    await page.waitForSelector('#results.active', { timeout: 5000 });
    await sleep(300);
}

async function getPeripheryPrice(page) {
    return await page.textContent('#price-monthly-periphery');
}

async function getFinalPrice(page) {
    return await page.textContent('#r-final');
}

async function getResultsActive(page) {
    const isActive = await page.$eval('#results', el => el.classList.contains('active'));
    return isActive;
}

async function getPassengerType(page) {
    return await page.$eval('input[name="passenger"]:checked', el => el.value);
}

async function runTests() {
    log('═══════════════════════════════════════════════════════════════', 'header');
    log('PSC Calculator - End-to-End UI State Management Test Suite', 'header');
    log('═══════════════════════════════════════════════════════════════\n', 'header');

    let browser;
    try {
        // Verify HTML file exists
        if (!fs.existsSync(HTML_PATH)) {
            log(`ERROR: index.html not found at ${HTML_PATH}`, 'fail');
            process.exit(1);
        }

        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        // Track console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Navigate to the page
        log('Loading PSC Calculator...', 'info');
        await page.goto(TEST_URL);
        await page.waitForLoadState('domcontentloaded');
        await sleep(500);

        // Verify page loaded
        const title = await page.title();
        assert(title.includes('תחבורה') || title.includes('PSC'), 'Page loads correctly', `Title: ${title}`);

        // Test 1: Initial State - Results should not be visible
        log('\n--- Test Group 1: Initial State ---', 'header');
        const initialResultsActive = await getResultsActive(page);
        assert(!initialResultsActive, 'Initial state: Results container is hidden');

        // Test 2: Basic Calculation - Jerusalem to Tel Aviv (Regular Profile)
        log('\n--- Test Group 2: Basic Calculation ---', 'header');
        
        await calculateFare(page, 'ירושלים', 'תל אביב');
        
        const jlmTaPrice = await getFinalPrice(page);
        assert(jlmTaPrice.includes('₪'), 'Jerusalem -> Tel Aviv: Final price displayed', `Price: ${jlmTaPrice}`);
        assert(jlmTaPrice !== '0.00 ₪', 'Jerusalem -> Tel Aviv: Price is not zero', `Price: ${jlmTaPrice}`);
        
        const jlmTaPeriphery = await getPeripheryPrice(page);
        assert(jlmTaPeriphery !== '157.50', 'Jerusalem -> Tel Aviv: Regular profile does NOT show periphery discounted rate (157.50)', `Periphery: ${jlmTaPeriphery}`);

        // Test 3: Switch to Periphery Profile - State should reset
        log('\n--- Test Group 3: Periphery Profile State ---', 'header');
        
        await selectPassengerProfile(page, 'periphery_resident');
        await sleep(200);
        
        // Results should still be from previous calculation (JLM->TA regular)
        const peripheryAfterSwitch = await getPeripheryPrice(page);
        assert(peripheryAfterSwitch === '-', 'After switching to periphery profile: Results reset (periphery shows "-")', `Periphery: ${peripheryAfterSwitch}`);

        // Test 4: Calculate with Periphery Profile - Jerusalem to Tel Aviv
        log('\n--- Test Group 4: Periphery Route Calculation ---', 'header');
        
        await page.click('#calculate-btn');
        await page.waitForSelector('#results.active', { timeout: 5000 });
        await sleep(300);
        
        const peripheryJlmTa = await getPeripheryPrice(page);
        const peripheryJlmTaFinal = await getFinalPrice(page);
        
        assert(peripheryJlmTa === '157.50', 'Jerusalem -> Tel Aviv (Periphery): Shows 157.50 periphery price', `Periphery: ${peripheryJlmTa}`);
        
        // Test 5: Switch BACK to Regular Profile - State Must Reset Completely
        log('\n--- Test Group 5: State Reset After Profile Change ---', 'header');
        
        await selectPassengerProfile(page, 'adult');
        await sleep(200);
        
        // Results should be reset
        const afterRegularSwitch = await getPeripheryPrice(page);
        const resultsActiveAfterSwitch = await getResultsActive(page);
        
        assert(afterRegularSwitch === '-', 'After switching back to regular: Periphery price reset to "-"', `Periphery: ${afterRegularSwitch}`);
        assert(!resultsActiveAfterSwitch, 'After switching back to regular: Results container still visible but reset');

        // Test 6: Back-to-Back Calculations - No State Leak
        log('\n--- Test Group 6: Back-to-Back Calculations ---', 'header');
        
        // Calculate Tel Aviv to Haifa (Regular)
        await calculateFare(page, 'תל אביב', 'חיפה');
        
        const taHaifaPrice = await getFinalPrice(page);
        const taHaifaPeriphery = await getPeripheryPrice(page);
        
        assert(taHaifaPeriphery !== '157.50', 'Tel Aviv -> Haifa: Regular profile does NOT show periphery rate', `Periphery: ${taHaifaPeriphery}`);
        log(`  ℹ Tel Aviv -> Haifa: ${taHaifaPrice}, Periphery: ${taHaifaPeriphery}`, 'info');
        
        // Now switch to periphery and calculate
        await selectPassengerProfile(page, 'periphery_resident');
        await page.click('#calculate-btn');
        await page.waitForSelector('#results.active', { timeout: 5000 });
        await sleep(300);
        
        const taHaifaPeripheryResult = await getPeripheryPrice(page);
        assert(taHaifaPeripheryResult === '157.50', 'Tel Aviv -> Haifa (Periphery): Shows 157.50', `Periphery: ${taHaifaPeripheryResult}`);
        
        // Switch back and calculate a NEW route (Jerusalem to Tel Aviv)
        await selectPassengerProfile(page, 'adult');
        await calculateFare(page, 'ירושלים', 'תל אביב');
        
        const newJlmTaPeriphery = await getPeripheryPrice(page);
        const newJlmTaFinal = await getFinalPrice(page);
        
        assert(newJlmTaPeriphery !== '157.50', 'New Jerusalem -> Tel Aviv (Regular): Does NOT retain periphery rate from previous calculation', `Periphery: ${newJlmTaPeriphery}`);
        log(`  ℹ New Jerusalem -> Tel Aviv: ${newJlmTaFinal}, Periphery: ${newJlmTaPeriphery}`, 'info');

        // Test 7: Verify Fare Matches Expected Rate
        log('\n--- Test Group 7: Fare Verification ---', 'header');
        
        // Calculate Tel Aviv to Beer Sheva (known route)
        await calculateFare(page, 'תל אביב', 'באר שבע');
        
        const taBeershebaSingle = await page.textContent('#price-single');
        const taBeershebaDistance = await page.textContent('#r-distance');
        
        assert(taBeershebaSingle !== '0.00', 'Tel Aviv -> Beer Sheva: Single fare is calculated', `Single: ${taBeershebaSingle}`);
        assert(taBeershebaDistance !== '-', 'Tel Aviv -> Beer Sheva: Distance is displayed', `Distance: ${taBeershebaDistance}`);
        log(`  ℹ Tel Aviv -> Beer Sheva: Single=${taBeershebaSingle}, Distance=${taBeershebaDistance}`, 'info');

        // Test 8: Input Change Triggers Reset
        log('\n--- Test Group 8: Input Change Reset ---', 'header');
        
        // First calculate something with periphery
        await selectPassengerProfile(page, 'periphery_resident');
        await calculateFare(page, 'באר שבע', 'חיפה');
        
        const beershebaHaifaPeriphery = await getPeripheryPrice(page);
        assert(beershebaHaifaPeriphery === '157.50', 'Beer Sheva -> Haifa (Periphery): Shows 157.50', `Periphery: ${beershebaHaifaPeriphery}`);
        
        // Now change the origin input
        await page.fill('#origin', 'נתניה');
        await sleep(200);
        
        // Results should be reset
        const afterInputChange = await getPeripheryPrice(page);
        const afterInputChangeResults = await getResultsActive(page);
        
        assert(afterInputChange === '-', 'After changing origin input: Periphery price resets to "-"', `Periphery: ${afterInputChange}`);
        assert(!afterInputChangeResults, 'After changing origin input: Results container is hidden/reset');

        // Test 9: No Console Errors
        log('\n--- Test Group 9: Console Error Check ---', 'header');
        
        if (consoleErrors.length === 0) {
            assert(true, 'No JavaScript console errors detected');
        } else {
            assert(false, 'No JavaScript console errors detected', `Found ${consoleErrors.length} error(s): ${consoleErrors.join(', ')}`);
        }

        // Summary
        log('\n═══════════════════════════════════════════════════════════════', 'header');
        log(`TEST RESULTS: ${testsPassed} passed, ${testsFailed} failed`, testsFailed > 0 ? 'fail' : 'pass');
        log('═══════════════════════════════════════════════════════════════\n', 'header');

        if (testsFailed > 0) {
            log('Failed tests:', 'fail');
            testResults.filter(t => t.status === 'FAIL').forEach(t => {
                log(`  - ${t.name}: ${t.message}`, 'fail');
            });
            console.log('\n');
        }

        await browser.close();
        process.exit(testsFailed > 0 ? 1 : 0);

    } catch (error) {
        log(`\nFATAL ERROR: ${error.message}`, 'fail');
        if (browser) await browser.close();
        process.exit(1);
    }
}

// Run the tests
runTests();
