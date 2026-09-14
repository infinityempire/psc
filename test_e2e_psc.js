/**
 * test_e2e_psc.js - End-to-End UI test for the PSC calculator (headless Chromium).
 *
 * Drives the real page: fills the inputs, clicks "חשב תעריף" and reads the prices
 * that the UI renders. This covers what the Jest suites cannot - the DOM wiring,
 * the click handler and the async render path.
 *
 * Playwright is an optional test dependency:
 *   npm install --no-save playwright && npx playwright install chromium
 * Without it the suite skips cleanly (exit 0).
 *
 * Usage: node test_e2e_psc.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try {
    ({ chromium } = require('playwright'));
} catch (e) {
    console.log('SKIP: test_e2e_psc.js requires Playwright, which is not installed.');
    console.log('      Install with: npm install --no-save playwright && npx playwright install chromium');
    process.exit(0);
}

const PROJECT_DIR = __dirname;
const HTML_PATH = path.join(PROJECT_DIR, 'index.html');

// Serve over HTTP: fetch('data/tariffs.json') is blocked on the file:// scheme,
// which would make the page log a console error and fall back to stale defaults.
function startStaticServer() {
    const MIME = {
        '.html': 'text/html; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
    };
    const server = http.createServer((req, res) => {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        const filePath = path.join(PROJECT_DIR, urlPath === '/' ? 'index.html' : urlPath);
        if (!filePath.startsWith(PROJECT_DIR)) {
            res.writeHead(403);
            return res.end('forbidden');
        }
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                return res.end('not found');
            }
            res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
            res.end(data);
        });
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
    if (actual === expected) {
        console.log(`  \u2713 ${name}`);
        passed++;
    } else {
        console.log(`  \u2717 ${name}: expected "${expected}", got "${actual}"`);
        failed++;
    }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function selectProfile(page, labelId) {
    await page.click(`label[for="${labelId}"]`);
    await sleep(120);
}

async function calculate(page, origin, dest) {
    await page.fill('#origin', '');
    await page.fill('#origin', origin);
    await page.fill('#dest', '');
    await page.fill('#dest', dest);
    await page.click('#calculate-btn');
    await page.waitForSelector('#results.active', { timeout: 10000 });
    await sleep(250);
}

async function readPrices(page) {
    return page.evaluate(() => {
        const text = id => {
            const el = document.getElementById(id);
            return el ? el.textContent.trim() : '<missing>';
        };
        const btn = document.getElementById('calculate-btn');
        return {
            singleBus: text('price-single-bus'),
            singleRail: text('price-single-rail'),
            dailyBus: text('price-daily-bus'),
            dailyRail: text('price-daily-rail'),
            monthlyNational: text('price-monthly-national'),
            rail40: text('price-monthly-rail-40'),
            rail75: text('price-monthly-rail-75'),
            rail120: text('price-monthly-rail-120'),
            railUnlimited: text('price-monthly-rail-unlimited'),
            final: text('r-final'),
            distance: text('r-distance'),
            type: text('r-type'),
            fallbackVisible: document.getElementById('fallback').style.display,
            buttonDisabled: btn.disabled,
            buttonText: btn.textContent.trim(),
        };
    });
}

async function run() {
    console.log('=== PSC calculator - end-to-end UI test ===');

    if (!fs.existsSync(HTML_PATH)) {
        console.error(`index.html not found at ${HTML_PATH}`);
        process.exit(1);
    }

    const server = await startStaticServer();
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));

    await page.goto(`${baseUrl}/index.html`);
    await page.waitForLoadState('domcontentloaded');
    await sleep(800);

    check('page title loads', (await page.title()).includes('תחבורה'), true);

    // --- 1. Jerusalem <-> Tel Aviv (53.9 km, lightblue) ---
    console.log('\n-- Jerusalem -> Tel Aviv (53.9 km) --');
    await calculate(page, 'ירושלים', 'תל אביב');
    let out = await readPrices(page);
    check('distance shown', out.distance, '53.9 ק"מ');
    check('bus single', out.singleBus, '19.00');
    check('rail single', out.singleRail, '27.00');
    check('bus daily (extended)', out.dailyBus, '29.00');
    check('rail daily (extended)', out.dailyRail, '32.50');
    check('monthly bus national', out.monthlyNational, '315.00');
    check('monthly rail up to 75 km', out.rail75, '464.00');
    check('final price', out.final, '27.00 ₪');
    check('fallback notice hidden', out.fallbackVisible, 'none');
    check('calculate button re-enabled', out.buttonDisabled, false);

    // --- 2. Eilat <-> Metula (417.7 km, purple) ---
    console.log('\n-- Eilat -> Metula (417.7 km) --');
    await calculate(page, 'אילת', 'מטולה');
    out = await readPrices(page);
    check('distance shown', out.distance, '417.7 ק"מ');
    check('bus single above 120 km', out.singleBus, '27.00');
    check('no daily pass above 120 km', out.dailyBus, '\u2014');
    check('monthly rail unlimited', out.railUnlimited, '1038.00');
    check('final price', out.final, '27.00 ₪');
    check('calculate button re-enabled', out.buttonDisabled, false);

    // --- 3. Tel Aviv -> Haifa (81.2 km, blue) ---
    console.log('\n-- Tel Aviv -> Haifa (81.2 km) --');
    await calculate(page, 'תל אביב', 'חיפה');
    out = await readPrices(page);
    check('rail single', out.singleRail, '30.50');
    check('rail daily (nationwide)', out.dailyRail, '47.00');
    check('monthly rail up to 120 km', out.rail120, '684.00');
    check('final price', out.final, '30.50 ₪');
    check('calculate button re-enabled', out.buttonDisabled, false);

    // --- 4. State reset when an input changes ---
    console.log('\n-- State reset on input change --');
    await page.fill('#origin', 'נתניה');
    await sleep(200);
    const resultsActive = await page.$eval('#results', el => el.classList.contains('active'));
    check('results hidden after input change', resultsActive, false);

    // --- 5. Periphery profile still calculates ---
    console.log('\n-- Geographic periphery profile --');
    await selectProfile(page, 'p-periphery');
    await calculate(page, 'שדרות', 'תל אביב');
    const periphery = await page.textContent('#price-monthly-periphery');
    check('periphery monthly price', periphery.trim(), '157.50');

    console.log('\n-- Console errors --');
    check('no console/page errors', consoleErrors.length, 0);
    if (consoleErrors.length) consoleErrors.slice(0, 5).forEach(e => console.log('    - ' + e));

    await browser.close();
    server.close();

    console.log(`\nTEST RESULTS: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('FATAL ERROR: ' + err.message);
    process.exit(1);
});
