/**
 * Exhaustive Combinational Audit & E2E Validation Matrix for PSC Fare Calculator
 *
 * Tests ALL possible combinations of:
 * 1. Contract Type (Single Ride, Daily Pass, Monthly Pass)
 * 2. Transit Mode (Bus/Light Rail, Combined Israel Railways)
 * 3. Distance Tiers (0-15, 15-40, 40-75, 75-120, 120+)
 * 4. User Profiles & Discounts
 *
 * Validates against Derech Shaveh Reform rules (Updated 2026-07-27)
 */

const { computeTransportFare, getFareBreakdown } = require('./psc.js');

// Expected Ground Truth Baseline Table - Derech Shaveh Reform
const EXPECTED_BUS_SINGLE = {
    '0-15': 8.00,
    '15-40': 14.50,
    '40-75': 19.00,
    '75-120': 19.00,
    '120+': 27.00
};

const EXPECTED_BUS_SINGLE_50PCT = {
    '0-15': 4.00,
    '15-40': 7.25,
    '40-75': 9.50,
    '75-120': 9.50,
    '120+': 13.50
};

const EXPECTED_RAIL_SINGLE = {
    '0-15': 11.50,
    '15-40': 21.00,
    '40-75': 27.00,
    '75-120': 30.50,
    '120+': null
};

const EXPECTED_DAILY = {
    bus: { 'upto-40': 17.50, 'upto-75': 29.00, 'nationwide': 37.50 },
    rail: { 'upto-40': 23.00, 'upto-75': 32.50, 'unlimited': 47.00 }
};

const round2 = num => Math.round(num * 100) / 100;

function getDistanceTier(distance) {
    if (distance <= 15) return '0-15';
    if (distance <= 40) return '15-40';
    if (distance <= 75) return '40-75';
    if (distance <= 120) return '75-120';
    return '120+';
}

describe('A. Bus Single Ride', () => {
    const zones = [
        { distance: 10 }, { distance: 25 }, { distance: 50 }, { distance: 80 }, { distance: 150 }
    ];
    const profiles = ['regular', 'youth', 'senior_67_74', 'disabled'];

    zones.forEach(({ distance }) => {
        const tier = getDistanceTier(distance);
        profiles.forEach(profile => {
            const base = EXPECTED_BUS_SINGLE[tier];
            const expected = profile === 'regular' ? base : EXPECTED_BUS_SINGLE_50PCT[tier];
            test(`Bus Single ${tier} ${profile}: ₪${expected}`, () => {
                expect(computeTransportFare({ distance, ticket_type: 'single', profile }).finalFare).toBe(expected);
            });
        });
        test(`Bus Single ${tier} Student`, () => {
            expect(computeTransportFare({ distance, ticket_type: 'single', profile: 'student' }).finalFare).toBe(round2(EXPECTED_BUS_SINGLE[tier] * 0.67));
        });
    });
});

describe('B. Bus Daily Pass', () => {
    const cases = [
        { distance: 25, key: 'upto-40' },
        { distance: 50, key: 'upto-75' },
        { distance: 100, key: 'nationwide' }
    ];
    const profiles = ['regular', 'youth', 'senior_67_74', 'disabled'];

    cases.forEach(({ distance, key }) => {
        profiles.forEach(profile => {
            const base = EXPECTED_DAILY.bus[key];
            const expected = round2(base * (profile === 'regular' ? 1 : 0.5));
            test(`Bus Daily ${key} ${profile}: ₪${expected}`, () => {
                expect(computeTransportFare({ distance, ticket_type: 'daily', profile }).finalFare).toBe(expected);
            });
        });
    });
});

describe('C. Bus Monthly Pass', () => {
    [25, 50, 100].forEach(d => {
        test(`Monthly National Bus ${d}km: ₪315`, () => {
            expect(computeTransportFare({ distance: d, ticket_type: 'monthly' }).finalFare).toBe(315.00);
        });
    });
    test('Young Adult 33% discount', () => {
        expect(computeTransportFare({ distance: 25, ticket_type: 'monthly', profile: 'young_adult' }).finalFare).toBe(211.05);
    });
    test('Student 50% discount', () => {
        expect(computeTransportFare({ distance: 25, ticket_type: 'monthly', profile: 'student' }).finalFare).toBe(157.50);
    });
    test('Geographic Profile 50%', () => {
        expect(computeTransportFare({ distance: 25, ticket_type: 'monthly', is_periphery: true }).finalFare).toBe(157.50);
    });
});

describe('D. Rail Single Ride', () => {
    const zones = [{ distance: 10 }, { distance: 25 }, { distance: 50 }, { distance: 80 }, { distance: 150 }];
    
    zones.forEach(({ distance }) => {
        const tier = getDistanceTier(distance);
        test(`Rail Single ${tier}: ₪${EXPECTED_RAIL_SINGLE[tier]}`, () => {
            const expected = EXPECTED_RAIL_SINGLE[tier];
            if (expected === null) {
                expect(computeTransportFare({ distance, ticket_type: 'single', includes_rail: true }).baseFare).toBeNull();
            } else {
                expect(computeTransportFare({ distance, ticket_type: 'single', includes_rail: true }).finalFare).toBe(expected);
            }
        });
    });
});

describe('E. Rail Daily Pass', () => {
    test('Up to 40 km: ₪23', () => expect(computeTransportFare({ distance: 25, ticket_type: 'daily', includes_rail: true }).finalFare).toBe(23.00));
    test('Up to 75 km: ₪32.50', () => expect(computeTransportFare({ distance: 50, ticket_type: 'daily', includes_rail: true }).finalFare).toBe(32.50));
    test('Nationwide: ₪47', () => expect(computeTransportFare({ distance: 100, ticket_type: 'daily', includes_rail: true }).finalFare).toBe(47.00));
});

describe('F. Rail Monthly Pass', () => {
    test('Up to 40km: ₪323', () => expect(computeTransportFare({ distance: 25, ticket_type: 'monthly', includes_rail: true }).finalFare).toBe(323.00));
    test('Up to 75km: ₪464', () => expect(computeTransportFare({ distance: 50, ticket_type: 'monthly', includes_rail: true }).finalFare).toBe(464.00));
    test('Up to 120km: ₪684', () => expect(computeTransportFare({ distance: 100, ticket_type: 'monthly', includes_rail: true }).finalFare).toBe(684.00));
    test('Unlimited (120+ km): ₪1,038', () => expect(computeTransportFare({ distance: 150, ticket_type: 'monthly', includes_rail: true }).finalFare).toBe(1038.00));
});

describe('G. Critical Routes', () => {
    describe('Jerusalem <-> Tel Aviv (53.9 km)', () => {
        test('Bus Single: ₪19', () => expect(computeTransportFare({ distance: 53.9, ticket_type: 'single' }).finalFare).toBe(19.00));
        test('Rail Single: ₪27', () => expect(computeTransportFare({ distance: 53.9, ticket_type: 'single', includes_rail: true }).finalFare).toBe(27.00));
        test('Monthly Rail: ₪464', () => expect(computeTransportFare({ distance: 53.9, ticket_type: 'monthly', includes_rail: true }).finalFare).toBe(464.00));
    });
    describe('Eilat <-> Metula (417.7 km)', () => {
        test('Bus Single: ₪27 (NOT ₪74)', () => {
            const res = computeTransportFare({ distance: 417.7, ticket_type: 'single' });
            expect(res.finalFare).toBe(27.00);
            expect(res.finalFare).not.toBe(74.00);
        });
        test('Rail Single: null', () => expect(computeTransportFare({ distance: 417.7, ticket_type: 'single', includes_rail: true }).baseFare).toBeNull());
        test('Monthly Rail Unlimited: ₪1,038', () => expect(computeTransportFare({ distance: 417.7, ticket_type: 'monthly', includes_rail: true }).finalFare).toBe(1038.00));
    });
});

describe('H. getFareBreakdown', () => {
    test('25km - all fare types', () => {
        const b = getFareBreakdown(25, 'regular', false, 0);
        expect(b.busOnly.single).toBe(14.50);
        expect(b.trainCombined.single).toBe(21.00);
        expect(b.busOnly.dailyLocal).toBe(17.50);
        expect(b.trainCombined.monthly).toBe(323.00);
    });
    test('50km - all fare types', () => {
        const b = getFareBreakdown(50, 'regular', false, 0);
        expect(b.busOnly.single).toBe(19.00);
        expect(b.trainCombined.single).toBe(27.00);
        expect(b.busOnly.dailyExtended).toBe(29.00);
        expect(b.trainCombined.monthly).toBe(464.00);
    });
    test('417.7km - long route', () => {
        const b = getFareBreakdown(417.7, 'regular', false, 0);
        expect(b.busOnly.single).toBe(27.00);
        expect(b.trainCombined.monthlyUnlimited).toBe(1038.00);
    });
});
