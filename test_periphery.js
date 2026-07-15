// 🧪 Automated Unit Tests for Public Transit Fare Calculator Geographic Periphery Integration
const fs = require('fs');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '=== Running Public Transit Periphery Unit Tests ===\n');

// 1. Extract or define functions to test from the implementation
// We define them exactly as they are in the HTML file for verification
function normalizeCityName(cityName) {
    if (!cityName) return "unknown";
    let normalized = cityName.normalize('NFKC');
    const hebrewMap = {
        'א': '', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': '', 'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y',
        'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'e', 'פ': 'p',
        'ף': 'p', 'צ': 'ts', 'ץ': 'ts', 'ק': 'q', 'ר': 'r', 'ש': 'sh', 'ת': 't'
    };
    let result = '';
    for (let char of normalized) {
        result += hebrewMap[char] !== undefined ? hebrewMap[char] : char;
    }
    result = result.toLowerCase().replace(/[^a-z0-9]/g, '');
    return result.substring(0, 20) || "unknown";
}

function checkHouseEligibility(houseNumStr, rule) {
    if (!rule) return false;
    if (rule === 'all') return true;
    
    const num = parseInt(houseNumStr, 10);
    if (isNaN(num)) return false;

    if (rule === 'odd') {
        return num % 2 !== 0;
    }
    if (rule === 'even') {
        return num % 2 === 0;
    }

    // range checking (e.g. "1-50")
    if (rule.includes('-')) {
        const parts = rule.split('-');
        const min = parseInt(parts[0], 10);
        const max = parseInt(parts[1], 10);
        if (!isNaN(min) && !isNaN(max)) {
            return num >= min && num <= max;
        }
    }

    // list checking (e.g. "2,4,6")
    if (rule.includes(',')) {
        const parts = rule.split(',').map(n => parseInt(n.trim(), 10));
        return parts.includes(num);
    }

    // exact number checking
    const exactNum = parseInt(rule, 10);
    if (!isNaN(exactNum)) {
        return num === exactNum;
    }

    return false;
}

let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log('\x1b[32m%s\x1b[0m', '  [PASS] ' + message);
    } else {
        console.log('\x1b[31m%s\x1b[0m', '  [FAIL] ' + message);
        testsFailed++;
    }
}

// 2. Test Cases for normalizeCityName
console.log('--- Testing City Name Normalization ---');
assert(normalizeCityName('אופקים') === 'vpqym', 'normalizeOfakim: "אופקים" should normalize to "vpqym"');
assert(normalizeCityName('שדרות') === 'shdrvt', 'normalizeSderot: "שדרות" should normalize to "shdrvt"');
assert(normalizeCityName('בית שאן') === 'bytshn', 'normalizeBeitShean: "בית שאן" should normalize to "bytshn"');
assert(normalizeCityName('בנימינה-גבעת עדה') === 'bnymyngbeted', 'normalizeBinyamina: "בנימינה-גבעת עדה" should normalize to "bnymyngbeted"');
assert(normalizeCityName('') === 'unknown', 'normalizeEmpty: Empty name should normalize to "unknown"');

// 3. Test Cases for checkHouseEligibility
console.log('\n--- Testing House Number Eligibility Rules ---');
// Rule 'all'
assert(checkHouseEligibility('15', 'all') === true, 'ruleAll: any house is eligible');
assert(checkHouseEligibility('0', 'all') === true, 'ruleAll: zero is eligible');

// Rule 'odd'
assert(checkHouseEligibility('13', 'odd') === true, 'ruleOdd: 13 is odd (eligible)');
assert(checkHouseEligibility('12', 'odd') === false, 'ruleOdd: 12 is even (not eligible)');

// Rule 'even'
assert(checkHouseEligibility('12', 'even') === true, 'ruleEven: 12 is even (eligible)');
assert(checkHouseEligibility('13', 'even') === false, 'ruleEven: 13 is odd (not eligible)');

// Rule range '1-50'
assert(checkHouseEligibility('25', '1-50') === true, 'ruleRange: 25 is within 1-50 (eligible)');
assert(checkHouseEligibility('1', '1-50') === true, 'ruleRange: 1 is boundary of 1-50 (eligible)');
assert(checkHouseEligibility('50', '1-50') === true, 'ruleRange: 50 is boundary of 1-50 (eligible)');
assert(checkHouseEligibility('51', '1-50') === false, 'ruleRange: 51 is out of 1-50 (not eligible)');
assert(checkHouseEligibility('0', '1-50') === false, 'ruleRange: 0 is out of 1-50 (not eligible)');

// Rule list '2,4,6'
assert(checkHouseEligibility('4', '2,4,6') === true, 'ruleList: 4 is in list 2,4,6 (eligible)');
assert(checkHouseEligibility('5', '2,4,6') === false, 'ruleList: 5 is not in list 2,4,6 (not eligible)');

// Rule exact '12'
assert(checkHouseEligibility('12', '12') === true, 'ruleExact: 12 matches 12 (eligible)');
assert(checkHouseEligibility('13', '12') === false, 'ruleExact: 13 does not match 12 (not eligible)');

// 4. Test City shard JSON schema integration
console.log('\n--- Testing Mock City Shard Integrity ---');
try {
    const ofakimShard = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/periphery/city_vpqym.json'), 'utf8'));
    assert(ofakimShard.c === 'אופקים', 'shardOfakim: Name matches "אופקים"');
    assert(Object.keys(ofakimShard.s).length === 0, 'shardOfakim: Unrestricted entire city (empty streets)');
    
    const sderotShard = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/periphery/city_shdrvt.json'), 'utf8'));
    assert(sderotShard.c === 'שדרות', 'shardSderot: Name matches "שדרות"');
    assert(sderotShard.s['הסביון'] === 'odd', 'shardSderot: "הסביון" is odd only');
    assert(sderotShard.s['הנשיא'] === '1-50', 'shardSderot: "הנשיא" is range 1-50');
} catch (err) {
    console.error('Failed to load city shards during test:', err);
    testsFailed++;
}

console.log('\n=== Summary ===');
if (testsFailed === 0) {
    console.log('\x1b[32m%s\x1b[0m', 'All tests passed successfully! 🎉');
    process.exit(0);
} else {
    console.log('\x1b[31m%s\x1b[0m', `${testsFailed} test(s) failed.`);
    process.exit(1);
}
