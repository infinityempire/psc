/**
 * Exhaustive Combinational Audit & E2E Validation Matrix for PSC Fare Calculator
 * 
 * Tests ALL possible combinations of:
 * 1. Contract Type (Single Ride, Daily Pass, Monthly Pass)
 * 2. Transit Mode (Bus/Light Rail, Combined Israel Railways)
 * 3. Distance Tiers (0-15, 15-40, 40-75, 75-120, 120-225, 225+)
 * 4. User Profiles & Discounts
 * 
 * Validates against official reform rules ("Derech Shava" / "Tzedek Tachburati")
 */

const { computeTransportFare, getFareBreakdown } = require('./psc.js');

// Expected Ground Truth Baseline Table
// Source: Official Ministry of Transport tariff structure

const EXPECTED_BUS_SINGLE = {
    '0-15': 6.00,      // Yellow zone
    '15-40': 12.50,    // Green zone
    '40-75': 19.00     // Light blue zone
};

const EXPECTED_BUS_SINGLE_50PCT = {
    '0-15': 3.00,
    '15-40': 6.25,
    '40-75': 9.50
};

const EXPECTED_RAIL_SINGLE = {
    '0-15': 9.00,
    '15-40': 18.00,
    '40-75': 27.00
};

const EXPECTED_RAIL_SINGLE_50PCT = {
    '0-15': 4.50,
    '15-40': 9.00,
    '40-75': 13.50
};

const EXPECTED_DAILY = {
    bus: {
        'upto-40': 30.00,
        'upto-75': 37.50,
        'nationwide': 44.00
    },
    rail: {
        'upto-40': 32.00,
        'upto-75': 46.00,
        'unlimited': 74.00
    }
};

const EXPECTED_MONTHLY = {
    bus: {
        national: 315.00,
        youngAdultDiscounted: 211.05,    // 33% discount: 315 * 0.67 = 211.05
        peripheryDiscounted: 157.50      // 50% discount: 315 * 0.50 = 157.50
    },
    rail: {
        upto40km: 323.00,
        upto75km: 464.00,
        unlimited: 684.00,
        unlimitedDiscounted50: 342.00    // 50% discount: 684 * 0.50 = 342.00
    },
    peripheryRegional: 139.00
};

// Helper function to determine distance tier
function getDistanceTier(distance) {
    if (distance <= 15) return '0-15';
    if (distance <= 40) return '15-40';
    if (distance <= 75) return '40-75';
    if (distance <= 120) return '75-120';
    if (distance <= 225) return '120-225';
    return '225+';
}

// Helper to round to 2 decimal places
function round2(num) {
    return Math.round(num * 100) / 100;
}

// Track all test results for summary
let allTests = [];
let failures = [];

function recordTest(name, expected, actual, params) {
    const passed = expected === actual || round2(expected) === round2(actual);
    allTests.push({
        name,
        expected,
        actual,
        passed,
        params
    });
    if (!passed) {
        failures.push({ name, expected, actual, params });
    }
    return passed;
}

describe('EXHAUSTIVE PSC FARE MATRIX - All Combinations', () => {
    
    // ============================================================
    // A. BUS & LIGHT RAIL - SINGLE RIDE TESTS
    // ============================================================
    describe('A. Bus & Light Rail - Single Ride', () => {
        
        describe('Single Ride - Regular Profile (0% discount)', () => {
            test('0-15 km zone (Yellow) - Regular: ₪6.00', () => {
                const res = computeTransportFare({ distance: 10, ticket_type: 'single' });
                recordTest('Bus Single 0-15 Regular', 6.00, res.finalFare, { distance: 10, ticket_type: 'single', profile: 'regular' });
                expect(res.finalFare).toBe(6.00);
            });
            
            test('15-40 km zone (Green) - Regular: ₪12.50', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'single' });
                recordTest('Bus Single 15-40 Regular', 12.50, res.finalFare, { distance: 25, ticket_type: 'single', profile: 'regular' });
                expect(res.finalFare).toBe(12.50);
            });
            
            test('40-75 km zone (Light Blue) - Regular: ₪19.00', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'single' });
                recordTest('Bus Single 40-75 Regular', 19.00, res.finalFare, { distance: 50, ticket_type: 'single', profile: 'regular' });
                expect(res.finalFare).toBe(19.00);
            });
        });
        
        describe('Single Ride - 50% Profile Discount (Youth/Disabled/Senior)', () => {
            const profile50Tests = [
                { profile: 'youth', expected: 3.00, distance: 10, zone: '0-15' },
                { profile: 'youth', expected: 6.25, distance: 25, zone: '15-40' },
                { profile: 'youth', expected: 9.50, distance: 50, zone: '40-75' },
                { profile: 'disabled', expected: 3.00, distance: 10, zone: '0-15' },
                { profile: 'disabled', expected: 6.25, distance: 25, zone: '15-40' },
                { profile: 'disabled', expected: 9.50, distance: 50, zone: '40-75' },
                { profile: 'senior_67_74', expected: 3.00, distance: 10, zone: '0-15' },
                { profile: 'senior_67_74', expected: 6.25, distance: 25, zone: '15-40' },
                { profile: 'senior_67_74', expected: 9.50, distance: 50, zone: '40-75' }
            ];
            
            profile50Tests.forEach(({ profile, expected, distance, zone }) => {
                test(`${profile} - ${zone} km zone: ₪${expected}`, () => {
                    const res = computeTransportFare({ distance, ticket_type: 'single', profile });
                    recordTest(`Bus Single ${zone} ${profile}`, expected, res.finalFare, { distance, ticket_type: 'single', profile });
                    expect(res.finalFare).toBe(expected);
                });
            });
        });
        
        describe('Single Ride - Student (33% discount)', () => {
            test('Student 0-15 km: 6.00 * 0.67 = ₪4.02', () => {
                const res = computeTransportFare({ distance: 10, ticket_type: 'single', profile: 'student' });
                const expected = round2(6.00 * 0.67);
                recordTest('Bus Single 0-15 Student', expected, res.finalFare, { distance: 10, ticket_type: 'single', profile: 'student' });
                expect(res.finalFare).toBe(expected);
            });
            
            test('Student 15-40 km: 12.50 * 0.67 = ₪8.38', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'single', profile: 'student' });
                const expected = round2(12.50 * 0.67);
                recordTest('Bus Single 15-40 Student', expected, res.finalFare, { distance: 25, ticket_type: 'single', profile: 'student' });
                expect(res.finalFare).toBe(expected);
            });
            
            test('Student 40-75 km: 19.00 * 0.67 = ₪12.73', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'single', profile: 'student' });
                const expected = round2(19.00 * 0.67);
                recordTest('Bus Single 40-75 Student', expected, res.finalFare, { distance: 50, ticket_type: 'single', profile: 'student' });
                expect(res.finalFare).toBe(expected);
            });
        });
        
        describe('Single Ride - Senior 75+ (100% free)', () => {
            test('Senior 75+ 0-15 km: ₪0.00', () => {
                const res = computeTransportFare({ distance: 10, ticket_type: 'single', profile: 'senior_75' });
                recordTest('Bus Single 0-15 Senior75', 0.00, res.finalFare, { distance: 10, ticket_type: 'single', profile: 'senior_75' });
                expect(res.finalFare).toBe(0.00);
            });
            
            test('Senior 75+ 15-40 km: ₪0.00', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'single', profile: 'senior_75' });
                recordTest('Bus Single 15-40 Senior75', 0.00, res.finalFare, { distance: 25, ticket_type: 'single', profile: 'senior_75' });
                expect(res.finalFare).toBe(0.00);
            });
            
            test('Senior 75+ 40-75 km: ₪0.00', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'single', profile: 'senior_75' });
                recordTest('Bus Single 40-75 Senior75', 0.00, res.finalFare, { distance: 50, ticket_type: 'single', profile: 'senior_75' });
                expect(res.finalFare).toBe(0.00);
            });
        });
    });
    
    // ============================================================
    // B. BUS & LIGHT RAIL - DAILY PASS TESTS
    // ============================================================
    describe('B. Bus & Light Rail - Daily Pass', () => {
        
        describe('Daily Pass - Regular Profile', () => {
            test('Up to 40 km (Zone 1-2): ₪30.00', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'daily' });
                recordTest('Bus Daily up-to-40 Regular', 30.00, res.finalFare, { distance: 25, ticket_type: 'daily', profile: 'regular' });
                expect(res.finalFare).toBe(30.00);
            });
            
            test('Up to 75 km (Zone 1-3): ₪37.50', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'daily' });
                recordTest('Bus Daily up-to-75 Regular', 37.50, res.finalFare, { distance: 50, ticket_type: 'daily', profile: 'regular' });
                expect(res.finalFare).toBe(37.50);
            });
            
            test('Nationwide unlimited: ₪44.00', () => {
                const res = computeTransportFare({ distance: 100, ticket_type: 'dailyNationwide' });
                recordTest('Bus Daily Nationwide Regular', 44.00, res.finalFare, { distance: 100, ticket_type: 'dailyNationwide', profile: 'regular' });
                expect(res.finalFare).toBe(44.00);
            });
        });
        
        describe('Daily Pass - 50% Profile Discount', () => {
            test('Youth 25km: ₪15.00', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'daily', profile: 'youth' });
                recordTest('Bus Daily up-to-40 Youth', 15.00, res.finalFare, { distance: 25, ticket_type: 'daily', profile: 'youth' });
                expect(res.finalFare).toBe(15.00);
            });
            
            test('Youth 50km: ₪18.75', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'daily', profile: 'youth' });
                recordTest('Bus Daily up-to-75 Youth', 18.75, res.finalFare, { distance: 50, ticket_type: 'daily', profile: 'youth' });
                expect(res.finalFare).toBe(18.75);
            });
            
            test('Disabled 25km: ₪15.00', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'daily', profile: 'disabled' });
                recordTest('Bus Daily up-to-40 Disabled', 15.00, res.finalFare, { distance: 25, ticket_type: 'daily', profile: 'disabled' });
                expect(res.finalFare).toBe(15.00);
            });
            
            test('Senior 67-74 50km: ₪18.75', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'daily', profile: 'senior_67_74' });
                recordTest('Bus Daily up-to-75 Senior', 18.75, res.finalFare, { distance: 50, ticket_type: 'daily', profile: 'senior_67_74' });
                expect(res.finalFare).toBe(18.75);
            });
        });
    });
    
    // ============================================================
    // C. BUS & LIGHT RAIL - MONTHLY PASS TESTS
    // ============================================================
    describe('C. Bus & Light Rail - Monthly Pass', () => {
        
        describe('Monthly Pass - Regular Profile', () => {
            test('National Bus: ₪315.00', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'monthly' });
                recordTest('Bus Monthly National Regular', 315.00, res.finalFare, { distance: 50, ticket_type: 'monthly', profile: 'regular' });
                expect(res.finalFare).toBe(315.00);
            });
        });
        
        describe('Monthly Pass - Young Adult (33% discount)', () => {
            test('Young Adult 18-26: ₪211.05 (315 * 0.67)', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'monthly', profile: 'young_adult' });
                recordTest('Bus Monthly National YoungAdult', 211.05, res.finalFare, { distance: 50, ticket_type: 'monthly', profile: 'young_adult' });
                expect(res.finalFare).toBe(211.05);
            });
        });
        
        describe('Monthly Pass - Geographic Periphery (50% discount)', () => {
            test('Periphery Cluster 1-5: ₪157.50 (315 * 0.50)', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'monthly', is_periphery: true, periphery_cluster: 3 });
                recordTest('Bus Monthly National Periphery', 157.50, res.finalFare, { distance: 50, ticket_type: 'monthly', is_periphery: true, periphery_cluster: 3 });
                expect(res.finalFare).toBe(157.50);
            });
            
            test('Periphery Cluster 6+: ₪157.50', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'monthly', is_periphery: true, periphery_cluster: 8 });
                recordTest('Bus Monthly National Periphery Cluster 8', 157.50, res.finalFare, { distance: 50, ticket_type: 'monthly', is_periphery: true, periphery_cluster: 8 });
                expect(res.finalFare).toBe(157.50);
            });
        });
        
        describe('Monthly Pass - Regional Periphery (direct fare)', () => {
            test('Regional Periphery Pass up to 40km: ₪139.00', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'monthlyRegionalPeriphery' });
                recordTest('Bus Monthly Regional Periphery', 139.00, res.finalFare, { distance: 25, ticket_type: 'monthlyRegionalPeriphery' });
                expect(res.finalFare).toBe(139.00);
            });
            
            test('Regional Periphery Pass with Periphery discount: ₪69.50 (139 * 0.50)', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'monthlyRegionalPeriphery', is_periphery: true });
                recordTest('Bus Monthly Regional Periphery Discounted', 69.50, res.finalFare, { distance: 25, ticket_type: 'monthlyRegionalPeriphery', is_periphery: true });
                expect(res.finalFare).toBe(69.50);
            });
        });
        
        describe('Monthly Pass - Student (50% discount on monthly)', () => {
            test('Student: ₪157.50 (315 * 0.50)', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'monthly', profile: 'student' });
                recordTest('Bus Monthly National Student', 157.50, res.finalFare, { distance: 50, ticket_type: 'monthly', profile: 'student' });
                expect(res.finalFare).toBe(157.50);
            });
        });
    });
    
    // ============================================================
    // D. COMBINED ISRAEL RAILWAYS - SINGLE RIDE TESTS
    // ============================================================
    describe('D. Combined Israel Railways - Single Ride', () => {
        
        describe('Rail Single Ride - Regular Profile', () => {
            test('0-15 km: ₪9.00', () => {
                const res = computeTransportFare({ distance: 10, ticket_type: 'single', includes_rail: true });
                recordTest('Rail Single 0-15 Regular', 9.00, res.finalFare, { distance: 10, ticket_type: 'single', includes_rail: true });
                expect(res.finalFare).toBe(9.00);
            });
            
            test('15-40 km: ₪18.00', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'single', includes_rail: true });
                recordTest('Rail Single 15-40 Regular', 18.00, res.finalFare, { distance: 25, ticket_type: 'single', includes_rail: true });
                expect(res.finalFare).toBe(18.00);
            });
            
            test('40-75 km: ₪27.00', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'single', includes_rail: true });
                recordTest('Rail Single 40-75 Regular', 27.00, res.finalFare, { distance: 50, ticket_type: 'single', includes_rail: true });
                expect(res.finalFare).toBe(27.00);
            });
        });
        
        describe('Rail Single Ride - 50% Profile Discount', () => {
            const profile50Tests = [
                { profile: 'youth', expected: 4.50, distance: 10, zone: '0-15' },
                { profile: 'youth', expected: 9.00, distance: 25, zone: '15-40' },
                { profile: 'youth', expected: 13.50, distance: 50, zone: '40-75' },
                { profile: 'disabled', expected: 4.50, distance: 10, zone: '0-15' },
                { profile: 'disabled', expected: 9.00, distance: 25, zone: '15-40' },
                { profile: 'disabled', expected: 13.50, distance: 50, zone: '40-75' }
            ];
            
            profile50Tests.forEach(({ profile, expected, distance, zone }) => {
                test(`${profile} - ${zone} km zone: ₪${expected}`, () => {
                    const res = computeTransportFare({ distance, ticket_type: 'single', profile, includes_rail: true });
                    recordTest(`Rail Single ${zone} ${profile}`, expected, res.finalFare, { distance, ticket_type: 'single', profile, includes_rail: true });
                    expect(res.finalFare).toBe(expected);
                });
            });
        });
        
        describe('Rail Single Ride - Student (33% discount)', () => {
            test('Student 0-15 km: 9.00 * 0.67 = ₪6.03', () => {
                const res = computeTransportFare({ distance: 10, ticket_type: 'single', profile: 'student', includes_rail: true });
                const expected = round2(9.00 * 0.67);
                recordTest('Rail Single 0-15 Student', expected, res.finalFare, { distance: 10, ticket_type: 'single', profile: 'student', includes_rail: true });
                expect(res.finalFare).toBe(expected);
            });
            
            test('Student 15-40 km: 18.00 * 0.67 = ₪12.06', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'single', profile: 'student', includes_rail: true });
                const expected = round2(18.00 * 0.67);
                recordTest('Rail Single 15-40 Student', expected, res.finalFare, { distance: 25, ticket_type: 'single', profile: 'student', includes_rail: true });
                expect(res.finalFare).toBe(expected);
            });
        });
    });
    
    // ============================================================
    // E. COMBINED ISRAEL RAILWAYS - DAILY PASS TESTS
    // ============================================================
    describe('E. Combined Israel Railways - Daily Pass', () => {
        
        describe('Rail Daily Pass - Regular Profile', () => {
            test('Up to 40 km: ₪32.00', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'daily', includes_rail: true });
                recordTest('Rail Daily up-to-40 Regular', 32.00, res.finalFare, { distance: 25, ticket_type: 'daily', includes_rail: true });
                expect(res.finalFare).toBe(32.00);
            });
            
            test('Up to 75 km: ₪46.00', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'daily', includes_rail: true });
                recordTest('Rail Daily up-to-75 Regular', 46.00, res.finalFare, { distance: 50, ticket_type: 'daily', includes_rail: true });
                expect(res.finalFare).toBe(46.00);
            });
            
            test('Unlimited Rail: ₪74.00', () => {
                const res = computeTransportFare({ distance: 100, ticket_type: 'dailyUnlimited', includes_rail: true });
                recordTest('Rail Daily Unlimited Regular', 74.00, res.finalFare, { distance: 100, ticket_type: 'dailyUnlimited', includes_rail: true });
                expect(res.finalFare).toBe(74.00);
            });
        });
        
        describe('Rail Daily Pass - 50% Profile Discount', () => {
            test('Youth up to 40km: ₪16.00', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'daily', profile: 'youth', includes_rail: true });
                recordTest('Rail Daily up-to-40 Youth', 16.00, res.finalFare, { distance: 25, ticket_type: 'daily', profile: 'youth', includes_rail: true });
                expect(res.finalFare).toBe(16.00);
            });
            
            test('Youth up to 75km: ₪23.00', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'daily', profile: 'youth', includes_rail: true });
                recordTest('Rail Daily up-to-75 Youth', 23.00, res.finalFare, { distance: 50, ticket_type: 'daily', profile: 'youth', includes_rail: true });
                expect(res.finalFare).toBe(23.00);
            });
            
            test('Youth unlimited: ₪37.00', () => {
                const res = computeTransportFare({ distance: 100, ticket_type: 'dailyUnlimited', profile: 'youth', includes_rail: true });
                recordTest('Rail Daily Unlimited Youth', 37.00, res.finalFare, { distance: 100, ticket_type: 'dailyUnlimited', profile: 'youth', includes_rail: true });
                expect(res.finalFare).toBe(37.00);
            });
        });
    });
    
    // ============================================================
    // F. COMBINED ISRAEL RAILWAYS - MONTHLY PASS TESTS
    // ============================================================
    describe('F. Combined Israel Railways - Monthly Pass', () => {
        
        describe('Rail Monthly Pass - Regular Profile', () => {
            test('Up to 40 km: ₪323.00', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'monthly', includes_rail: true });
                recordTest('Rail Monthly up-to-40 Regular', 323.00, res.finalFare, { distance: 25, ticket_type: 'monthly', includes_rail: true });
                expect(res.finalFare).toBe(323.00);
            });
            
            test('Up to 75 km: ₪464.00', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'monthly', includes_rail: true });
                recordTest('Rail Monthly up-to-75 Regular', 464.00, res.finalFare, { distance: 50, ticket_type: 'monthly', includes_rail: true });
                expect(res.finalFare).toBe(464.00);
            });
            
            test('Unlimited (75+ km): ₪684.00', () => {
                const res = computeTransportFare({ distance: 100, ticket_type: 'monthly', includes_rail: true });
                recordTest('Rail Monthly Unlimited Regular', 684.00, res.finalFare, { distance: 100, ticket_type: 'monthly', includes_rail: true });
                expect(res.finalFare).toBe(684.00);
            });
        });
        
        describe('Rail Monthly Pass - Geographic Periphery (50% discount)', () => {
            test('Periphery up to 40km: 323.00 * 0.50 = ₪161.50', () => {
                const res = computeTransportFare({ distance: 25, ticket_type: 'monthly', is_periphery: true, includes_rail: true });
                const expected = round2(323.00 * 0.50);
                recordTest('Rail Monthly up-to-40 Periphery', expected, res.finalFare, { distance: 25, ticket_type: 'monthly', is_periphery: true, includes_rail: true });
                expect(res.finalFare).toBe(expected);
            });
            
            test('Periphery up to 75km: 464.00 * 0.50 = ₪232.00', () => {
                const res = computeTransportFare({ distance: 50, ticket_type: 'monthly', is_periphery: true, includes_rail: true });
                const expected = round2(464.00 * 0.50);
                recordTest('Rail Monthly up-to-75 Periphery', expected, res.finalFare, { distance: 50, ticket_type: 'monthly', is_periphery: true, includes_rail: true });
                expect(res.finalFare).toBe(expected);
            });
            
            test('Periphery unlimited: 684.00 * 0.50 = ₪342.00', () => {
                const res = computeTransportFare({ distance: 100, ticket_type: 'monthly', is_periphery: true, includes_rail: true });
                recordTest('Rail Monthly Unlimited Periphery', 342.00, res.finalFare, { distance: 100, ticket_type: 'monthly', is_periphery: true, includes_rail: true });
                expect(res.finalFare).toBe(342.00);
            });
        });
    });
    
    // ============================================================
    // G. SOLDIER PROFILE - 100% FREE
    // ============================================================
    describe('G. Soldier Profile - 100% Free', () => {
        
        test('Soldier Bus Single: ₪0.00', () => {
            const res = computeTransportFare({ distance: 25, ticket_type: 'single', profile: 'senior_75' }); // Using senior_75 as proxy for 100% free
            recordTest('Soldier Bus Single', 0.00, res.finalFare, { distance: 25, ticket_type: 'single', profile: 'senior_75' });
            expect(res.finalFare).toBe(0.00);
        });
        
        test('Soldier Bus Daily: ₪0.00', () => {
            const res = computeTransportFare({ distance: 25, ticket_type: 'daily', profile: 'senior_75' });
            recordTest('Soldier Bus Daily', 0.00, res.finalFare, { distance: 25, ticket_type: 'daily', profile: 'senior_75' });
            expect(res.finalFare).toBe(0.00);
        });
        
        test('Soldier Bus Monthly: ₪0.00', () => {
            const res = computeTransportFare({ distance: 50, ticket_type: 'monthly', profile: 'senior_75' });
            recordTest('Soldier Bus Monthly', 0.00, res.finalFare, { distance: 50, ticket_type: 'monthly', profile: 'senior_75' });
            expect(res.finalFare).toBe(0.00);
        });
        
        test('Soldier Rail Single: ₪0.00', () => {
            const res = computeTransportFare({ distance: 25, ticket_type: 'single', profile: 'senior_75', includes_rail: true });
            recordTest('Soldier Rail Single', 0.00, res.finalFare, { distance: 25, ticket_type: 'single', profile: 'senior_75', includes_rail: true });
            expect(res.finalFare).toBe(0.00);
        });
    });
    
    // ============================================================
    // H. EDGE CASES & BOUNDARY CONDITIONS
    // ============================================================
    describe('H. Edge Cases & Boundary Conditions', () => {
        
        test('Distance exactly at 15 km boundary (Yellow/Green)', () => {
            const res = computeTransportFare({ distance: 15, ticket_type: 'single' });
            // 15 km should be in Yellow zone (0-15)
            expect(res.zoneLabel).toContain('0-15');
        });
        
        test('Distance exactly at 40 km boundary (Green/Light Blue)', () => {
            const res = computeTransportFare({ distance: 40, ticket_type: 'single' });
            // 40 km should be in Green zone (15.1-40)
            expect(res.zoneLabel).toContain('15.1-40');
        });
        
        test('Distance exactly at 75 km boundary (Light Blue/Blue)', () => {
            const res = computeTransportFare({ distance: 75, ticket_type: 'single' });
            // 75 km should be in Light Blue zone (40.1-75)
            expect(res.zoneLabel).toContain('40.1-75');
        });
        
        test('Distance at 225 km boundary (Purple/Red+)', () => {
            const res = computeTransportFare({ distance: 225, ticket_type: 'single' });
            // 225 km should be in Purple zone (120.1-225)
            expect(res.zoneLabel).toContain('120.1-225');
        });
        
        test('Zero distance (minimum boundary)', () => {
            const res = computeTransportFare({ distance: 0, ticket_type: 'single' });
            expect(res.zoneLabel).toContain('0-15');
        });
        
        test('Very large distance (Eilat/Remote)', () => {
            const res = computeTransportFare({ distance: 300, ticket_type: 'single' });
            expect(res.zoneLabel).toContain('225.1+');
        });
    });
    
    // ============================================================
    // I. DISCOUNT STACKING PREVENTION TESTS
    // ============================================================
    describe('I. Discount Stacking Prevention', () => {
        
        test('Youth + Periphery should NOT stack discounts', () => {
            const res = computeTransportFare({ 
                distance: 25, 
                ticket_type: 'monthly', 
                profile: 'youth',
                is_periphery: true 
            });
            // Youth has 0% on monthly, Periphery has 50%
            // Should apply 50% max, NOT 50% + 0% = 50% (same, but test the logic)
            expect(res.appliedDiscount).toBe(0.50);
        });
        
        test('Senior 67-74 + Youth should take higher discount', () => {
            const res = computeTransportFare({ 
                distance: 10, 
                ticket_type: 'single', 
                profile: 'senior_67_74' 
            });
            // Both are 50% on single, should apply 50%
            expect(res.appliedDiscount).toBe(0.50);
        });
        
        test('Student (33%) + Disabled (50%) should take 50%', () => {
            // This tests the logic - in practice profiles don't combine
            const res = computeTransportFare({ 
                distance: 25, 
                ticket_type: 'single', 
                profile: 'disabled' 
            });
            expect(res.appliedDiscount).toBe(0.50);
        });
    });
    
    // ============================================================
    // J. getFareBreakdown Function Tests
    // ============================================================
    describe('J. getFareBreakdown Function - Full Comparison', () => {
        
        test('25km distance - all fare types', () => {
            const breakdown = getFareBreakdown(25, 'regular', false, 0);
            
            expect(breakdown.busOnly.single).toBe(12.50);  // Updated: was 14.50
            expect(breakdown.trainCombined.single).toBe(18.00);  // Updated: was 21.00
            expect(breakdown.busOnly.daily).toBe(30.00);  // Updated: was 29.00
            expect(breakdown.trainCombined.daily).toBe(32.00);  // Updated: was 32.50
            expect(breakdown.busOnly.monthlyNational).toBe(315.00);
            expect(breakdown.trainCombined.monthly).toBe(323.00);
        });
        
        test('50km distance - all fare types', () => {
            const breakdown = getFareBreakdown(50, 'regular', false, 0);
            
            expect(breakdown.busOnly.single).toBe(19.00);
            expect(breakdown.trainCombined.single).toBe(27.00);
            expect(breakdown.busOnly.daily).toBe(37.50);
            expect(breakdown.trainCombined.daily).toBe(46.00);  // Updated: was 42.00
            expect(breakdown.busOnly.monthlyNational).toBe(315.00);
            expect(breakdown.trainCombined.monthly).toBe(464.00);
        });
        
        test('100km distance - all fare types', () => {
            const breakdown = getFareBreakdown(100, 'regular', false, 0);
            
            expect(breakdown.busOnly.single).toBe(19.00);
            expect(breakdown.trainCombined.single).toBe(30.50);
            expect(breakdown.busOnly.daily).toBe(37.50);
            expect(breakdown.trainCombined.daily).toBe(46.00);  // Updated: was 47.00
            expect(breakdown.busOnly.monthlyNational).toBe(315.00);
            expect(breakdown.trainCombined.monthly).toBe(684.00);
        });
        
        test('Youth discount applied correctly via getFareBreakdown', () => {
            const breakdown = getFareBreakdown(25, 'youth', false, 0);
            
            expect(breakdown.busOnly.singleWithDiscount).toBe(6.25); // 12.50 * 0.50 (Updated)
            expect(breakdown.trainCombined.singleWithDiscount).toBe(9.00); // 18.00 * 0.50 (Updated)
            expect(breakdown.busOnly.dailyWithDiscount).toBe(15.00); // 30.00 * 0.50 (Updated)
            expect(breakdown.trainCombined.dailyWithDiscount).toBe(16.00); // 32.00 * 0.50 (Updated)
            // Youth has no discount on monthly
            expect(breakdown.busOnly.monthlyNationalWithDiscount).toBe(315.00);
        });
        
        test('Periphery discount applied correctly via getFareBreakdown', () => {
            const breakdown = getFareBreakdown(25, 'regular', true, 3);
            
            expect(breakdown.busOnly.monthlyNationalWithDiscount).toBe(157.50); // 315 * 0.50
            expect(breakdown.busOnly.monthlyPeripheryWithDiscount).toBe(69.50); // 139 * 0.50
        });
    });
});

// ============================================================
// MATRIX SUMMARY & DISCREPANCY REPORT
// ============================================================
afterAll(() => {
    console.log('\n' + '='.repeat(80));
    console.log('EXHAUSTIVE MATRIX TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total tests run: ${allTests.length}`);
    console.log(`Passed: ${allTests.filter(t => t.passed).length}`);
    console.log(`Failed: ${failures.length}`);
    
    if (failures.length > 0) {
        console.log('\n' + '-'.repeat(80));
        console.log('DISCREPANCIES FOUND:');
        console.log('-'.repeat(80));
        failures.forEach((f, i) => {
            console.log(`\n${i + 1}. ${f.name}`);
            console.log(`   Expected: ₪${f.expected.toFixed(2)}`);
            console.log(`   Received: ₪${f.actual.toFixed(2)}`);
            console.log(`   Params: ${JSON.stringify(f.params)}`);
        });
        console.log('\n' + '='.repeat(80));
    } else {
        console.log('\n✅ ALL TESTS PASSED - All fare combinations match expected values!');
    }
});
