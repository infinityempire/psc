/**
 * calculator-loader.js - Run the calculator embedded in index.html outside a browser.
 *
 * index.html keeps its whole fare engine inline. This helper extracts that inline
 * <script>, executes it in a Node VM with a minimal DOM stub, and returns the
 * resulting context so tests can call calculateFare() / inspect FARE_RULES.
 *
 * Pass `tariffs` to simulate a successful fetch('data/tariffs.json'). That is the
 * path the deployed app (GitHub Pages) takes, and testing only the embedded
 * defaults previously hid a schema mismatch that broke every daily fare.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DEFAULT_HTML_PATH = path.join(__dirname, 'index.html');

function extractInlineScripts(html) {
    const scripts = [];
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = re.exec(html)) !== null) scripts.push(match[1]);
    return scripts;
}

/**
 * Minimal stand-in for the DOM. Reading or calling any unknown member returns the
 * stub itself and writes are swallowed, so the script's top-level wiring
 * (getElementById, addEventListener, ...) runs without a real document.
 */
function makeDomStub() {
    const target = function () { return stub; };
    const stub = new Proxy(target, {
        get(_t, prop) {
            if (prop === Symbol.toPrimitive) return () => '';
            if (prop === 'toString') return () => '';
            if (prop === 'valueOf') return () => '';
            if (prop === 'then') return undefined; // must not look like a Promise
            if (prop === 'length') return 0;
            if (prop === 'checked') return false;
            if (prop === 'value') return '';
            return stub;
        },
        set() { return true; },
        apply() { return stub; },
        construct() { return stub; },
        has() { return true; },
    });
    return stub;
}

function readCalculatorSource(htmlPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const scripts = extractInlineScripts(html);
    if (scripts.length === 0) {
        throw new Error(`No inline <script> found in ${htmlPath}`);
    }
    return scripts[scripts.length - 1];
}

/**
 * Build the VM context for index.html and run its inline script in it.
 * @param {object} options
 * @param {string} [options.htmlPath]
 * @param {object} [options.tariffs] - when provided, fetch('data/tariffs.json')
 *                                     resolves with it (the production path).
 * @returns {object} sandbox
 */
function buildSandbox(options) {
    const htmlPath = options.htmlPath || DEFAULT_HTML_PATH;
    const code = readCalculatorSource(htmlPath);

    const sandbox = {};
    sandbox.globalThis = sandbox;
    sandbox.console = console;
    sandbox.setTimeout = (fn) => { if (typeof fn === 'function') fn(); return 0; };
    sandbox.clearTimeout = () => {};
    sandbox.setInterval = () => 0;
    sandbox.clearInterval = () => {};
    sandbox.CustomEvent = function CustomEvent() {};
    sandbox.Date = Date;
    sandbox.JSON = JSON;
    sandbox.Math = Math;
    sandbox.Promise = Promise;
    sandbox.performance = { now: () => 0 };
    sandbox.alert = () => {};
    sandbox.navigator = { onLine: true, geolocation: makeDomStub() };
    sandbox.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    sandbox.document = makeDomStub();
    sandbox.window = sandbox;
    // window === sandbox, so the script's window.dispatchEvent(...) needs real stubs;
    // otherwise the tariff loader would abort half-way through.
    sandbox.addEventListener = () => {};
    sandbox.removeEventListener = () => {};
    sandbox.dispatchEvent = () => true;

    if (options.tariffs) {
        sandbox.fetch = function (url) {
            if (String(url).indexOf('tariffs.json') === -1) {
                return Promise.reject(new Error('unexpected fetch in tests: ' + url));
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(options.tariffs),
            });
        };
    } else {
        // Never resolves: the engine keeps using its embedded default rules.
        sandbox.fetch = () => new Promise(() => {});
    }

    vm.runInContext(code, vm.createContext(sandbox), { filename: 'index.html<script>' });
    return sandbox;
}

/**
 * @param {object} [options] - see buildSandbox()
 * @returns {Promise<object>} The VM context: calculateFare, FARE_RULES, ...
 */
async function loadCalculator(options = {}) {
    const sandbox = buildSandbox(options);
    if (options.tariffs) {
        // Let the fetch().then().then() chain (and the tariffsLoaded event) settle.
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setImmediate(resolve));
        }
    }
    return sandbox;
}

/**
 * Synchronous variant for callers that only need the embedded default rules.
 * @param {object} [options] - see buildSandbox(); `tariffs` is not supported.
 * @returns {object} The VM context.
 */
function loadCalculatorSync(options = {}) {
    if (options.tariffs) {
        throw new Error('loadCalculatorSync() cannot resolve a tariffs.json fetch; use loadCalculator()');
    }
    return buildSandbox(options);
}

function loadTariffsFile(relativePath = 'data/tariffs.json') {
    return JSON.parse(fs.readFileSync(path.join(__dirname, relativePath), 'utf8'));
}

module.exports = { loadCalculator, loadCalculatorSync, loadTariffsFile, extractInlineScripts, DEFAULT_HTML_PATH };
