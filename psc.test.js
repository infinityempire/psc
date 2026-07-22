// בדיקות יחידה ו-E2E עבור מחשבון PSC (תחבורה ציבורית)

const { computeTransportFare } = require('./psc.js');

describe('PSC Transport Fare Calculator Tests', () => {
    test('נסיעה בודדת - מדרגות מרחק בסיסיות (אוטובוס)', () => {
        expect(computeTransportFare({ distance: 10, ticket_type: 'single' }).finalFare).toBe(6.00);
        expect(computeTransportFare({ distance: 25, ticket_type: 'single' }).finalFare).toBe(12.00);
        expect(computeTransportFare({ distance: 50, ticket_type: 'single' }).finalFare).toBe(17.00);
        expect(computeTransportFare({ distance: 80, ticket_type: 'single' }).finalFare).toBe(28.00);
    });

    test('הנחת פריפריה (צדק תחבורתי) - 33% (ללא ציון קלסטר)', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            is_periphery: true
        });
        expect(res.appliedDiscount).toBe(0.33);
        expect(res.finalFare).toBe(8.04); // 12 * 0.67 = 8.04
    });

    test('בדיקת אי-זליגת מצב (State Leak Prevention)', () => {
        // ריצה 1: תושב פריפריה
        const res1 = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            is_periphery: true
        });
        expect(res1.finalFare).toBe(8.04);

        // ריצה 2: תושב מרכז (איפוס מפורש ל-false)
        const res2 = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            is_periphery: false
        });
        expect(res2.appliedDiscount).toBe(0.00);
        expect(res2.finalFare).toBe(12.00); // חייב לחזור ל-12 ש"ח מלאים
    });

    test('תיעוד הנחות פרופיל מול פריפריה (מניעת כפל הנחות)', () => {
        // נוער (50%) + פריפריה (33%) -> צריך לקבל 50% ולא 83%
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            profile: 'youth',
            is_periphery: true
        });
        expect(res.appliedDiscount).toBe(0.50);
        expect(res.finalFare).toBe(6.00);
    });

    test('אזרח ותיק פלוס (75+) - 100% הנחה', () => {
        const res = computeTransportFare({
            distance: 100,
            ticket_type: 'single',
            profile: 'senior_75'
        });
        expect(res.finalFare).toBe(0.00);
    });
});

// ============================================================
// Tzedek Tachburati (Socio-Economic Cluster) Discount Tests
// ============================================================

describe('Tzedek Tachburati Discount - Clusters 1-5 get 50%', () => {
    test('פריפריה עם קלסטר 1 - 50% הנחה', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            is_periphery: true,
            periphery_cluster: 1
        });
        expect(res.peripheryDiscount).toBe(0.50);
        expect(res.appliedDiscount).toBe(0.50);
        expect(res.finalFare).toBe(6.00); // 12 * 0.50 = 6.00
    });

    test('פריפריה עם קלסטר 3 - 50% הנחה', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            is_periphery: true,
            periphery_cluster: 3
        });
        expect(res.peripheryDiscount).toBe(0.50);
        expect(res.finalFare).toBe(6.00);
    });

    test('פריפריה עם קלסטר 5 - 50% הנחה (מקסימום)', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            is_periphery: true,
            periphery_cluster: 5
        });
        expect(res.peripheryDiscount).toBe(0.50);
        expect(res.finalFare).toBe(6.00);
    });

    test('פריפריה עם קלסטר 6 - 33% הנחה (מעל 5)', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            is_periphery: true,
            periphery_cluster: 6
        });
        expect(res.peripheryDiscount).toBe(0.33);
        expect(res.finalFare).toBe(8.04); // 12 * 0.67 = 8.04
    });

    test('פריפריה עם קלסטר 0 או ללא קלסטר - 33% הנחה', () => {
        const res1 = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            is_periphery: true,
            periphery_cluster: 0
        });
        expect(res1.peripheryDiscount).toBe(0.33);

        const res2 = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            is_periphery: true
        });
        expect(res2.peripheryDiscount).toBe(0.33);
    });

    test('פריפריה 50% + פרופיל נוער - לא מתקפל (50% מקסימום)', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            is_periphery: true,
            periphery_cluster: 3,
            profile: 'youth'
        });
        expect(res.peripheryDiscount).toBe(0.50);
        expect(res.profileDiscount).toBe(0.50);
        expect(res.appliedDiscount).toBe(0.50); // Math.max(0.50, 0.50) = 0.50
        expect(res.finalFare).toBe(6.00);
    });
});

// ============================================================
// Israel Railways Single Ride Pricing Tests
// ============================================================

describe('Israel Railways (Train) Single Ride Pricing', () => {
    test('רכבת - מרחק קצר (עד 15 ק"מ) - 50% פרימיום', () => {
        const busRes = computeTransportFare({ distance: 10, ticket_type: 'single' });
        const trainRes = computeTransportFare({ distance: 10, ticket_type: 'single', includes_rail: true });
        
        expect(busRes.baseFare).toBe(6.00);
        expect(trainRes.baseFare).toBe(8.50);
        expect(trainRes.trainPremium).toBe(true);
        expect(trainRes.finalFare).toBe(8.50);
    });

    test('רכבת - מרחק בינוני (16-40 ק"מ)', () => {
        const busRes = computeTransportFare({ distance: 25, ticket_type: 'single' });
        const trainRes = computeTransportFare({ distance: 25, ticket_type: 'single', includes_rail: true });
        
        expect(busRes.baseFare).toBe(12.00);
        expect(trainRes.baseFare).toBe(16.00);
        expect(trainRes.trainPremium).toBe(true);
    });

    test('רכבת - מרחק ארוך (41-75 ק"מ)', () => {
        const busRes = computeTransportFare({ distance: 50, ticket_type: 'single' });
        const trainRes = computeTransportFare({ distance: 50, ticket_type: 'single', includes_rail: true });
        
        expect(busRes.baseFare).toBe(17.00);
        expect(trainRes.baseFare).toBe(22.50);
        expect(trainRes.trainPremium).toBe(true);
    });

    test('רכבת - מרחק ארוך מאוד (מעל 75 ק"מ)', () => {
        const busRes = computeTransportFare({ distance: 80, ticket_type: 'single' });
        const trainRes = computeTransportFare({ distance: 80, ticket_type: 'single', includes_rail: true });
        
        expect(busRes.baseFare).toBe(28.00);
        expect(trainRes.baseFare).toBe(36.00);
        expect(trainRes.trainPremium).toBe(true);
    });

    test('רכבת + פריפריה 50% - חישוב נכון', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            includes_rail: true,
            is_periphery: true,
            periphery_cluster: 3
        });
        
        expect(res.baseFare).toBe(16.00);
        expect(res.peripheryDiscount).toBe(0.50);
        expect(res.finalFare).toBe(8.00); // 16 * 0.50 = 8.00
    });

    test('מנוי חודשי עם רכבת - ללא פרימיום לנסיעה בודדת', () => {
        const res = computeTransportFare({
            distance: 30,
            ticket_type: 'monthly',
            includes_rail: true
        });
        
        expect(res.baseFare).toBe(255.00); // Monthly with rail
        expect(res.trainPremium).toBe(false);
    });
});
