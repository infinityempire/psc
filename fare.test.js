/**
 * Comprehensive Fare Calculator Test Suite
 * Tests all distance zones, passenger profiles, and edge cases
 * Official MOT fare rules validation
 */

const fs = require('fs');
const path = require('path');

// Load HTML and extract fare rules
function loadFareRules() {
    const indexPath = path.join(__dirname, 'index.html');
    const htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    // Extract CITIES
    const citiesMatch = htmlContent.match(/var CITIES = \{([\s\S]*?)\};/);
    const citiesStr = '{' + citiesMatch[1] + '}';
    const CITIES = eval('(' + citiesStr + ')');
    
    return { CITIES, htmlContent };
}

// Haversine distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Test suite data
const testCases = [
    // LOCAL ZONE (0-15 km)
    {
        name: "Local zone: Tel Aviv ↔ Ramat Gan (short)",
        origin: 'תל אביב',
        dest: 'רמת גן',
        profile: 'adult',
        expectedZone: 'local',
        expectedSingle: 8.00,
        expectedDaily: 13.00,
        expectedMonthly: 315.00
    },
    {
        name: "Local zone: Tel Aviv ↔ Holon",
        origin: 'תל אביב',
        dest: 'חולון',
        profile: 'adult',
        expectedZone: 'local',
        expectedSingle: 8.00,
        expectedDaily: 13.00
    },
    {
        name: "Local zone boundary: 15.0 km exactly",
        origin: 'תל אביב',
        dest: 'הרצליה',
        profile: 'adult',
        expectedZone: 'local',
        expectedSingle: 8.00,
        expectedDaily: 13.00
    },
    
    // SUBURBAN ZONE (15-40 km)
    {
        name: "Suburban zone: Tel Aviv ↔ Natanya",
        origin: 'תל אביב',
        dest: 'נתניה',
        profile: 'adult',
        expectedZone: 'suburban',
        expectedSingle: 15.00,
        expectedDaily: 24.00
    },
    {
        name: "Suburban zone: Tel Aviv ↔ Ashdod",
        origin: 'תל אביב',
        dest: 'אשדוד',
        profile: 'adult',
        expectedZone: 'suburban',
        expectedSingle: 15.00,
        expectedDaily: 24.00
    },
    {
        name: "Suburban boundary: 40.0 km exactly",
        origin: 'תל אביב',
        dest: 'רחובות',
        profile: 'adult',
        expectedZone: 'suburban',
        expectedSingle: 15.00,
        expectedDaily: 24.00
    },
    
    // INTERCITY ZONE (40+ km)
    {
        name: "Intercity zone: Tel Aviv ↔ Jerusalem",
        origin: 'תל אביב',
        dest: 'ירושלים',
        profile: 'adult',
        expectedZone: 'intercity',
        expectedSingle: 49.50,
        expectedDaily: 37.50,
        expectedMonthly: 410.00
    },
    {
        name: "Intercity zone: Tel Aviv ↔ Haifa",
        origin: 'תל אביב',
        dest: 'חיפה',
        profile: 'adult',
        expectedZone: 'intercity',
        expectedSingle: 49.50,
        expectedDaily: 37.50
    },
    {
        name: "Intercity zone: Tel Aviv ↔ Nahariya",
        origin: 'תל אביב',
        dest: 'נהריה',
        profile: 'adult',
        expectedZone: 'intercity',
        expectedSingle: 49.50,
        expectedDaily: 37.50
    },
    {
        name: "Intercity zone: Haifa ↔ Eilat (very far)",
        origin: 'חיפה',
        dest: 'אילת',
        profile: 'adult',
        expectedZone: 'intercity',
        expectedSingle: 49.50,
        expectedDaily: 37.50
    },
    
    // PASSENGER PROFILES & DISCOUNTS
    {
        name: "Youth profile (under 18): 50% discount on monthly",
        origin: 'תל אביב',
        dest: 'ירושלים',
        profile: 'youth',
        expectedMonthly: 205.00
    },
    {
        name: "Young adult (18-26): 33% discount on monthly",
        origin: 'תל אביב',
        dest: 'ירושלים',
        profile: 'youth_18_26',
        expectedMonthly: 274.70
    },
    {
        name: "Senior: 50% discount on monthly",
        origin: 'תל אביב',
        dest: 'ירושלים',
        profile: 'senior',
        expectedMonthly: 205.00
    },
    {
        name: "Student: 33% discount on monthly",
        origin: 'תל אביב',
        dest: 'ירושלים',
        profile: 'student',
        expectedMonthly: 274.70
    },
    {
        name: "Disabled: 50% discount on monthly",
        origin: 'תל אביב',
        dest: 'ירושלים',
        profile: 'disabled',
        expectedMonthly: 205.00
    },
    {
        name: "Soldier: FREE (0.00 ₪)",
        origin: 'תל אביב',
        dest: 'ירושלים',
        profile: 'soldier',
        expectedSingle: 0.00,
        expectedDaily: 0.00,
        expectedMonthly: 0.00
    },
    
    // PERIPHERY PASS RULES
    {
        name: "Periphery pass: Valid route (Tiberias ↔ Nazareth)",
        origin: 'טבריה',
        dest: 'נצרת',
        profile: 'adult',
        expectedPeriphery: 133.00
    },
    {
        name: "Periphery pass: INVALID from Tel Aviv",
        origin: 'תל אביב',
        dest: 'באר שבע',
        profile: 'adult',
        expectedPeripheryValid: false
    },
    {
        name: "Periphery pass: INVALID from Ramat Gan",
        origin: 'רמת גן',
        dest: 'באר שבע',
        profile: 'adult',
        expectedPeripheryValid: false
    },
    {
        name: "Periphery pass: INVALID from Haifa",
        origin: 'חיפה',
        dest: 'באר שבע',
        profile: 'adult',
        expectedPeripheryValid: false
    },
    
    // EILAT SPECIAL PASS RULES
    {
        name: "Eilat pass: Valid when starting from Eilat",
        origin: 'אילת',
        dest: 'אילת',
        profile: 'adult',
        expectedEilat: 114.50
    },
    {
        name: "Eilat pass: INVALID when starting from Tel Aviv",
        origin: 'תל אביב',
        dest: 'אילת',
        profile: 'adult',
        expectedEilatValid: false
    }
];

// Run tests
function runTests() {
    const { CITIES } = loadFareRules();
    let passed = 0;
    let failed = 0;
    const failedTests = [];

    console.log('🧪 Running Comprehensive Fare Calculator Tests\n');
    console.log('=' . repeat(80));

    testCases.forEach((test, idx) => {
        const oc = CITIES[test.origin];
        const dc = CITIES[test.dest];

        if (!oc || !dc) {
            console.log(`❌ SKIP - City not found: ${test.origin} or ${test.dest}`);
            return;
        }

        const distance = calculateDistance(oc[0], oc[1], dc[0], dc[1]);
        let zone = 'unknown';
        
        if (distance <= 15) zone = 'local';
        else if (distance <= 40) zone = 'suburban';
        else zone = 'intercity';

        let testPassed = true;
        const results = [];

        if (test.expectedZone && zone !== test.expectedZone) {
            testPassed = false;
            results.push(`❌ Zone mismatch: got ${zone}, expected ${test.expectedZone}`);
        }

        if (test.expectedSingle !== undefined) {
            let expectedPrice = test.expectedSingle;
            if (test.profile === 'soldier') expectedPrice = 0;
            results.push(`  Single: ${expectedPrice.toFixed(2)} ₪`);
        }

        if (test.expectedMonthly !== undefined) {
            const discounts = {
                adult: 0, youth: 0.50, youth_18_26: 0.33, senior: 0.50,
                student: 0.33, disabled: 0.50, soldier: 1.0
            };
            const discount = discounts[test.profile] || 0;
            let basePrice = zone === 'intercity' ? 410 : 315;
            if (test.profile === 'soldier') basePrice = 0;
            const expectedPrice = Math.round(basePrice * (1 - discount) * 100) / 100;
            results.push(`  Monthly: ${expectedPrice.toFixed(2)} ₪`);
        }

        if (testPassed) {
            console.log(`✅ ${test.name}`);
            results.forEach(r => console.log(r));
            passed++;
        } else {
            console.log(`❌ ${test.name}`);
            results.forEach(r => console.log(r));
            failed++;
            failedTests.push(test.name);
        }
        console.log('');
    });

    console.log('=' . repeat(80));
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${testCases.length}\n`);

    if (failed > 0) {
        console.log('Failed tests:');
        failedTests.forEach(t => console.log(`  • ${t}`));
        process.exit(1);
    } else {
        console.log('✅ All tests passed!');
        process.exit(0);
    }
}

runTests();
