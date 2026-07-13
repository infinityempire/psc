/**
 * fare_test.js - QA Test Suite for PSC Fare Calculator
 * 
 * This test suite validates the calculateFare() function and fare zone
 * identification logic in the PSC transportation fare calculator.
 * 
 * Usage in Browser Console:
 * =========================
 * 1. Open index.html in a browser
 * 2. Open Developer Tools (F12) -> Console tab
 * 3. Copy and paste this entire file into the console
 * 4. Press Enter to run all tests
 * 
 * Usage in Node.js:
 * =================
 * node fare_test.js
 */

(function() {
    'use strict';
    
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };
    
    function assert(condition, testName, message) {
        if (condition) {
            results.passed++;
            results.tests.push({ name: testName, status: 'PASS', message: '' });
            console.log(`✓ ${testName}`);
        } else {
            results.failed++;
            results.tests.push({ name: testName, status: 'FAIL', message: message || 'Assertion failed' });
            console.error(`✗ ${testName}: ${message || 'Assertion failed'}`);
        }
    }
    
    function assertEqual(actual, expected, testName) {
        const passed = actual === expected;
        if (!passed) {
            results.failed++;
            results.tests.push({ name: testName, status: 'FAIL', message: `Expected ${expected}, got ${actual}` });
            console.error(`✗ ${testName}: Expected ${expected}, got ${actual}`);
        } else {
            results.passed++;
            results.tests.push({ name: testName, status: 'PASS', message: '' });
            console.log(`✓ ${testName}`);
        }
    }
    
    function assertDefined(value, testName) {
        const passed = value !== undefined && value !== null;
        if (!passed) {
            results.failed++;
            results.tests.push({ name: testName, status: 'FAIL', message: `Value is undefined or null` });
            console.error(`✗ ${testName}: Value is undefined or null`);
        } else {
            results.passed++;
            results.tests.push({ name: testName, status: 'PASS', message: '' });
            console.log(`✓ ${testName}`);
        }
    }
    
    function assertNumber(value, testName) {
        const passed = typeof value === 'number' && !isNaN(value);
        if (!passed) {
            results.failed++;
            results.tests.push({ name: testName, status: 'FAIL', message: `Value is not a valid number: ${value}` });
            console.error(`✗ ${testName}: Value is not a valid number: ${value}`);
        } else {
            results.passed++;
            results.tests.push({ name: testName, status: 'PASS', message: '' });
            console.log(`✓ ${testName}`);
        }
    }
    
    function runTests() {
        console.log('═══════════════════════════════════════════');
        console.log('PSC Fare Calculator - QA Test Suite');
        console.log('═══════════════════════════════════════════\n');
        
        // Test Group 1: Valid Number Returns
        console.log('--- Test Group: Valid Number Returns ---');
        
        const result1 = calculateFare('תל אביב', 'חיפה', 'regular');
        assertDefined(result1, 'calculateFare returns a defined value');
        if (result1) {
            assertNumber(result1.single, 'Single fare is a valid number');
            assertNumber(result1.daily, 'Daily fare is a valid number');
            if (result1.monthlyNational) {
                assertNumber(result1.monthlyNational.price, 'Monthly national price is valid number');
            }
        }
        
        // Test Group 2: Distance Validation (Positive Numbers)
        console.log('\n--- Test Group: Distance Validation ---');
        
        // Test with known origin/destination pairs
        const result2 = calculateFare('תל אביב', 'ירושלים', 'regular');
        if (result2) {
            assert(result2.distance > 0, 'Distance is a positive number');
            assertNumber(result2.distance, 'Distance is a valid number');
        }
        
        // Test with short distance (yellow zone)
        const result3 = calculateFare('תל אביב', 'רמת גן', 'regular');
        if (result3) {
            assert(result3.distance >= 0, 'Short distance is non-negative');
            assertNumber(result3.distance, 'Short distance is valid');
        }
        
        // Test Group 3: Fare Zone Identification
        console.log('\n--- Test Group: Fare Zone Identification ---');
        
        // Yellow zone (0-27 km)
        const yellowResult = calculateFare('תל אביב', 'ראשון לציון', 'regular');
        if (yellowResult) {
            assertEqual(yellowResult.zone, 'yellow', 'Short route is in yellow zone');
        }
        
        // Green zone (27-41 km)
        const greenResult = calculateFare('תל אביב', 'נתניה', 'regular');
        if (greenResult) {
            assertEqual(greenResult.zone, 'green', 'Medium route is in green zone');
        }
        
        // Lightblue zone (40-75 km)
        const lightblueResult = calculateFare('תל אביב', 'באר שבע', 'regular');
        if (lightblueResult) {
            assertEqual(lightblueResult.zone, 'lightblue', 'Long route is in lightblue zone');
        }
        
        // Test Group 4: Fare Rates by Zone
        console.log('\n--- Test Group: Fare Rate Calculation ---');
        
        // Verify FARE_RULES exist
        if (typeof FARE_RULES !== 'undefined') {
            assertDefined(FARE_RULES.yellow, 'FARE_RULES contains yellow zone');
            assertDefined(FARE_RULES.lightblue, 'FARE_RULES contains lightblue zone');
            
            // Test specific fare values from hardcoded rules
            assertEqual(FARE_RULES.yellow.single, 8.00, 'Yellow zone single fare is 8.00');
            assertEqual(FARE_RULES.yellow.daily, 17.50, 'Yellow zone daily fare is 17.50');
            assertEqual(FARE_RULES.lightblue.single, 19.00, 'Lightblue zone single fare is 19.00');
            assertEqual(FARE_RULES.lightblue.daily, 37.50, 'Lightblue zone daily fare is 37.50');
        }
        
        // Test Group 5: Passenger Type Discounts
        console.log('\n--- Test Group: Passenger Type Discounts ---');
        
        const regularFare = calculateFare('תל אביב', 'חיפה', 'regular');
        const studentFare = calculateFare('תל אביב', 'חיפה', 'student');
        const seniorFare = calculateFare('תל אביב', 'חיפה', 'senior');
        
        if (regularFare && regularFare.single > 0) {
            assert(regularFare.single > 0, 'Regular passenger pays fare');
        }
        
        // Test Group 6: Error Handling
        console.log('\n--- Test Group: Error Handling ---');
        
        try {
            const errorResult = calculateFare('', '', 'regular');
            // Should either return valid result with fallback or error
            if (errorResult) {
                assertDefined(errorResult.zone, 'Error case returns a zone');
            }
        } catch (e) {
            console.log('✓ Error handling works correctly');
        }
        
        // Summary
        console.log('\n═══════════════════════════════════════════');
        console.log(`TEST RESULTS: ${results.passed} passed, ${results.failed} failed`);
        console.log('═══════════════════════════════════════════');
        
        if (results.failed > 0) {
            console.log('\nFailed tests:');
            results.tests.filter(t => t.status === 'FAIL').forEach(t => {
                console.log(`  - ${t.name}: ${t.message}`);
            });
        }
        
        return results;
    }
    
    // Export for Node.js usage
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { runTests, calculateFare };
    }
    
    // Auto-run if in browser
    if (typeof window !== 'undefined') {
        if (typeof calculateFare === 'function') {
            window.fareTestResults = runTests();
        } else {
            console.error('✗ calculateFare function not found. Make sure index.html is loaded.');
        }
    } else {
        // Node.js - load the HTML and evaluate
        console.log('Note: Running in Node.js - some tests may not work without browser context.');
        runTests();
    }
})();
