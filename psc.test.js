// בדיקות יחידה ו-E2E עבור מחשבון PSC (תחבורה ציבורית)
// Official Ministry of Transport ("Derech Shaveh" / "Tachburah Tzedek") tariff structure

const { computeTransportFare } = require('./psc.js');

describe('PSC Transport Fare Calculator Tests - Official Fare Matrix', () => {
    test('נסיעה בודדת - מדרגות מרחק בסיסיות (אוטובוס) - Official Tariff', () => {
        // 0-15 km: ₪8.00
        expect(computeTransportFare({ distance: 10, ticket_type: 'single' }).finalFare).toBe(8.00);
        // 15.1-40 km: ₪14.50
        expect(computeTransportFare({ distance: 25, ticket_type: 'single' }).finalFare).toBe(14.50);
        // 40.1-75 km: ₪19.00
        expect(computeTransportFare({ distance: 50, ticket_type: 'single' }).finalFare).toBe(19.00);
        // 75.1-120 km: ₪19.00
        expect(computeTransportFare({ distance: 80, ticket_type: 'single' }).finalFare).toBe(19.00);
        // 120.1-225 km: ₪30.50
        expect(computeTransportFare({ distance: 130, ticket_type: 'single' }).finalFare).toBe(30.50);
        // 225.1+ km: ₪74.00
        expect(computeTransportFare({ distance: 230, ticket_type: 'single' }).finalFare).toBe(74.00);
    });

    test('חופשי יומי - מדרגות מרחק (אוטובוס)', () => {
        // 0-15 km: ₪17.50
        expect(computeTransportFare({ distance: 10, ticket_type: 'daily' }).bus.daily).toBe(17.50);
        // 15.1-40 km: ₪29.00
        expect(computeTransportFare({ distance: 25, ticket_type: 'daily' }).bus.daily).toBe(29.00);
        // 40.1-75 km: ₪37.50
        expect(computeTransportFare({ distance: 50, ticket_type: 'daily' }).bus.daily).toBe(37.50);
        // 75.1-120 km: ₪37.50
        expect(computeTransportFare({ distance: 80, ticket_type: 'daily' }).bus.daily).toBe(37.50);
        // 120.1-225 km: ₪60.50
        expect(computeTransportFare({ distance: 130, ticket_type: 'daily' }).bus.daily).toBe(60.50);
        // 225.1+ km: ₪79.50
        expect(computeTransportFare({ distance: 230, ticket_type: 'daily' }).bus.daily).toBe(79.50);
    });

    test('מנוי חודשי לאומי (אוטובוס)', () => {
        // All distances: ₪315.00
        expect(computeTransportFare({ distance: 10, ticket_type: 'monthly' }).bus.monthlyNational).toBe(315.00);
        expect(computeTransportFare({ distance: 50, ticket_type: 'monthly' }).bus.monthlyNational).toBe(315.00);
        expect(computeTransportFare({ distance: 130, ticket_type: 'monthly' }).bus.monthlyNational).toBe(315.00);
    });

    test('מנוי חודשי מקומי (אוטובוס) - לא קיים בתעריפים החדשים', () => {
        // 0-15 km: null (no local monthly pass in new tariff)
        expect(computeTransportFare({ distance: 10, ticket_type: 'monthlyLocal' }).bus.monthlyLocal).toBeNull();
        // 15.1-40 km: null
        expect(computeTransportFare({ distance: 25, ticket_type: 'monthlyLocal' }).bus.monthlyLocal).toBeNull();
    });

    test('הנחת פריפריה (צדק תחבורתי) על מנוי חודשי - 33% (ללא ציון קלסטר)', () => {
        const res = computeTransportFare({
            distance: 50,
            ticket_type: 'monthly',
            is_periphery: true
        });
        expect(res.peripheryDiscount).toBe(0.33);
        expect(res.finalFare).toBe(211.05); // 315 * 0.67 = 211.05
    });

    test('בדיקת אי-זליגת מצב (State Leak Prevention)', () => {
        // ריצה 1: תושב פריפריה
        const res1 = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            is_periphery: true
        });
        expect(res1.finalFare).toBe(14.50);

        // ריצה 2: תושב מרכז (איפוס מפורש ל-false)
        const res2 = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            is_periphery: false
        });
        expect(res2.appliedDiscount).toBe(0.00);
        expect(res2.finalFare).toBe(14.50);
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
        expect(res.finalFare).toBe(7.25); // 14.50 * 0.50 = 7.25
    });

    test('אזרח ותיק פלוס (75+) - 100% הנחה', () => {
        const res = computeTransportFare({
            distance: 100,
            ticket_type: 'single',
            profile: 'senior_75'
        });
        expect(res.finalFare).toBe(0.00);
    });

    test('נוער - 50% הנחה על נסיעה בודדת', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            profile: 'youth'
        });
        expect(res.profileDiscount).toBe(0.50);
        expect(res.finalFare).toBe(7.25); // 14.50 * 0.50 = 7.25
    });

    test('סטודנט - 33% הנחה על נסיעה בודדת/יומי, 50% על מנוי', () => {
        const singleRes = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            profile: 'student'
        });
        expect(singleRes.profileDiscount).toBe(0.33);
        expect(singleRes.finalFare).toBe(9.72); // 14.50 * 0.67 = 9.715 ≈ 9.72

        const monthlyRes = computeTransportFare({
            distance: 25,
            ticket_type: 'monthly',
            profile: 'student'
        });
        expect(monthlyRes.profileDiscount).toBe(0.50);
        expect(monthlyRes.finalFare).toBe(157.50); // 315 * 0.50 = 157.50
    });

    test('מבוגר צעיר (18-26) - 33% הנחה על מנוי חודשי בלבד', () => {
        const singleRes = computeTransportFare({
            distance: 25,
            ticket_type: 'single',
            profile: 'young_adult'
        });
        expect(singleRes.profileDiscount).toBe(0);
        expect(singleRes.finalFare).toBe(14.50); // No discount on single

        const monthlyRes = computeTransportFare({
            distance: 25,
            ticket_type: 'monthly',
            profile: 'young_adult'
        });
        expect(monthlyRes.profileDiscount).toBe(0.33);
        expect(monthlyRes.finalFare).toBe(211.05); // 315 * 0.67 = 211.05
    });

    test('נכה - 50% הנחה על נסיעה בודדת/יומי', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'daily',
            profile: 'disabled'
        });
        expect(res.profileDiscount).toBe(0.50);
        expect(res.finalFare).toBe(14.50); // 29.00 * 0.50 = 14.50
    });
});

// ============================================================
// Tzedek Tachburati (Socio-Economic Cluster) Discount Tests
// ============================================================

describe('Tzedek Tachburati Discount - Monthly Pass Only', () => {
    test('פריפריה עם קלסטר 1 - 50% הנחה על מנוי חודשי', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'monthly',
            is_periphery: true,
            periphery_cluster: 1
        });
        expect(res.peripheryDiscount).toBe(0.50);
        expect(res.appliedDiscount).toBe(0.50);
        expect(res.finalFare).toBe(157.50); // 315 * 0.50 = 157.50
    });

    test('פריפריה עם קלסטר 3 - 50% הנחה', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'monthly',
            is_periphery: true,
            periphery_cluster: 3
        });
        expect(res.peripheryDiscount).toBe(0.50);
        expect(res.finalFare).toBe(157.50);
    });

    test('פריפריה עם קלסטר 5 - 50% הנחה (מקסימום)', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'monthly',
            is_periphery: true,
            periphery_cluster: 5
        });
        expect(res.peripheryDiscount).toBe(0.50);
        expect(res.finalFare).toBe(157.50);
    });

    test('פריפריה עם קלסטר 6 - 33% הנחה (מעל 5)', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'monthly',
            is_periphery: true,
            periphery_cluster: 6
        });
        expect(res.peripheryDiscount).toBe(0.33);
        expect(res.finalFare).toBe(211.05); // 315 * 0.67 = 211.05
    });

    test('פריפריה עם קלסטר 0 או ללא קלסטר - 33% הנחה', () => {
        const res1 = computeTransportFare({
            distance: 25,
            ticket_type: 'monthly',
            is_periphery: true,
            periphery_cluster: 0
        });
        expect(res1.peripheryDiscount).toBe(0.33);

        const res2 = computeTransportFare({
            distance: 25,
            ticket_type: 'monthly',
            is_periphery: true
        });
        expect(res2.peripheryDiscount).toBe(0.33);
    });

    test('פריפריה 50% + פרופיל נוער - לא מתקפל (50% מקסימום)', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'monthly',
            is_periphery: true,
            periphery_cluster: 3,
            profile: 'youth'
        });
        expect(res.peripheryDiscount).toBe(0.50);
        expect(res.profileDiscount).toBe(0);
        expect(res.appliedDiscount).toBe(0.50);
        expect(res.finalFare).toBe(157.50);
    });
});

// ============================================================
// Israel Railways (Train) Single Ride Pricing Tests - Official Tariff
// ============================================================

describe('Israel Railways (Train) Official Tariff', () => {
    test('רכבת - מרחק קצר (0-15 ק"מ)', () => {
        const busRes = computeTransportFare({ distance: 10, ticket_type: 'single' });
        const railRes = computeTransportFare({ distance: 10, ticket_type: 'single', includes_rail: true });
        
        expect(busRes.baseFare).toBe(8.00);
        expect(railRes.baseFare).toBe(11.50);
        expect(railRes.rail.single).toBe(11.50);
        expect(railRes.trainPremium).toBe(true);
        expect(railRes.finalFare).toBe(11.50);
    });

    test('רכבת - מרחק בינוני (15.1-40 ק"מ)', () => {
        const busRes = computeTransportFare({ distance: 25, ticket_type: 'single' });
        const railRes = computeTransportFare({ distance: 25, ticket_type: 'single', includes_rail: true });
        
        expect(busRes.baseFare).toBe(14.50);
        expect(busRes.rail.single).toBe(21.00);
        expect(railRes.baseFare).toBe(21.00);
        expect(railRes.trainPremium).toBe(true);
    });

    test('רכבת - מרחק ארוך (40.1-75 ק"מ)', () => {
        const busRes = computeTransportFare({ distance: 50, ticket_type: 'single' });
        const railRes = computeTransportFare({ distance: 50, ticket_type: 'single', includes_rail: true });
        
        expect(busRes.baseFare).toBe(19.00);
        expect(railRes.baseFare).toBe(27.00);
        expect(railRes.rail.single).toBe(27.00);
        expect(railRes.trainPremium).toBe(true);
    });

    test('רכבת - מרחק ארוך מאוד (75.1-120 ק"מ)', () => {
        const busRes = computeTransportFare({ distance: 80, ticket_type: 'single' });
        const railRes = computeTransportFare({ distance: 80, ticket_type: 'single', includes_rail: true });
        
        expect(busRes.baseFare).toBe(19.00);
        expect(railRes.baseFare).toBe(30.50);
        expect(railRes.rail.single).toBe(30.50);
        expect(railRes.trainPremium).toBe(true);
    });

    test('רכבת - מרחק מקסימלי (120.1+ ק"מ)', () => {
        const busRes = computeTransportFare({ distance: 130, ticket_type: 'single' });
        const railRes = computeTransportFare({ distance: 130, ticket_type: 'single', includes_rail: true });
        
        expect(busRes.baseFare).toBe(30.50);
        expect(railRes.baseFare).toBe(52.50); // Rail has higher fare for 120.1+ km
        expect(railRes.rail.single).toBe(52.50);
    });

    test('רכבת - חופשי יומי', () => {
        const busRes = computeTransportFare({ distance: 50, ticket_type: 'daily' });
        const railRes = computeTransportFare({ distance: 50, ticket_type: 'daily', includes_rail: true });
        
        expect(busRes.baseFare).toBe(37.50);
        expect(railRes.baseFare).toBe(42.00);
        expect(railRes.rail.daily).toBe(42.00);
    });

    test('רכבת + פריפריה 50% - חישוב נכון על מנוי חודשי (up to 40km)', () => {
        const res = computeTransportFare({
            distance: 25,
            ticket_type: 'monthly',
            includes_rail: true,
            is_periphery: true,
            periphery_cluster: 3
        });
        
        expect(res.baseFare).toBe(323.00); // Monthly National Rail up to 40km
        expect(res.rail.monthlyUpTo40km).toBe(323.00);
        expect(res.peripheryDiscount).toBe(0.50);
        expect(res.finalFare).toBe(161.50); // 323 * 0.50 = 161.50
    });

    test('מנוי חודשי עם רכבת - ללא פרימיום לנסיעה בודדת', () => {
        const res = computeTransportFare({
            distance: 30,
            ticket_type: 'monthly',
            includes_rail: true
        });
        
        expect(res.baseFare).toBe(323.00); // Combined Rail Monthly Pass up to 40km
        expect(res.rail.monthlyUpTo40km).toBe(323.00);
        expect(res.trainPremium).toBe(false);
    });

    test('מנוי חודשי עם רכבת עד 75 ק"מ', () => {
        const res = computeTransportFare({
            distance: 50,
            ticket_type: 'monthly',
            includes_rail: true
        });
        
        expect(res.baseFare).toBe(464.00); // Combined Rail Monthly Pass up to 75km
        expect(res.rail.monthlyUpTo75km).toBe(464.00);
        expect(res.rail.getMonthlyPass(50)).toBe(464.00);
    });

    test('מנוי חודשי עם רכבת ללא הגבלה (120+ ק"מ)', () => {
        const res = computeTransportFare({
            distance: 130,
            ticket_type: 'monthly',
            includes_rail: true
        });
        
        expect(res.baseFare).toBe(684.00); // Combined Rail Monthly Pass Unlimited
        expect(res.rail.monthlyUnlimited).toBe(684.00);
        expect(res.rail.getMonthlyPass(130)).toBe(684.00);
    });
});

// ============================================================
// Jerusalem <-> Tel Aviv Specific Test Case (53.9 km)
// ============================================================

describe('Jerusalem <-> Tel Aviv (53.9 km) - Official Tariff Verification', () => {
    test('Bus Single Ride MUST output ₪19.00', () => {
        const res = computeTransportFare({ distance: 53.9, ticket_type: 'single' });
        expect(res.baseFare).toBe(19.00);
        expect(res.bus.single).toBe(19.00);
        expect(res.finalFare).toBe(19.00);
    });

    test('Rail Single Ride MUST output ₪27.00', () => {
        const res = computeTransportFare({ distance: 53.9, ticket_type: 'single', includes_rail: true });
        expect(res.baseFare).toBe(27.00);
        expect(res.rail.single).toBe(27.00);
        expect(res.finalFare).toBe(27.00);
    });

    test('Bus Daily Pass MUST output ₪37.50', () => {
        const res = computeTransportFare({ distance: 53.9, ticket_type: 'daily' });
        expect(res.baseFare).toBe(37.50);
        expect(res.bus.daily).toBe(37.50);
        expect(res.finalFare).toBe(37.50);
    });

    test('Rail Daily Pass MUST output ₪42.00', () => {
        const res = computeTransportFare({ distance: 53.9, ticket_type: 'daily', includes_rail: true });
        expect(res.baseFare).toBe(42.00);
        expect(res.rail.daily).toBe(42.00);
        expect(res.finalFare).toBe(42.00);
    });

    test('Monthly National Bus MUST output ₪315.00', () => {
        const res = computeTransportFare({ distance: 53.9, ticket_type: 'monthly' });
        expect(res.baseFare).toBe(315.00);
        expect(res.bus.monthlyNational).toBe(315.00);
        expect(res.finalFare).toBe(315.00);
    });

    test('Monthly National + Rail (up to 75km) MUST output ₪464.00', () => {
        const res = computeTransportFare({ distance: 53.9, ticket_type: 'monthly', includes_rail: true });
        expect(res.baseFare).toBe(464.00);
        expect(res.rail.monthlyUpTo75km).toBe(464.00);
        expect(res.finalFare).toBe(464.00);
    });

    test('Monthly National Bus with 33% Periphery MUST output ₪211.05', () => {
        const res = computeTransportFare({ 
            distance: 53.9, 
            ticket_type: 'monthly',
            is_periphery: true,
            periphery_cluster: 6
        });
        expect(res.peripheryDiscount).toBe(0.33);
        expect(res.finalFare).toBe(211.05); // 315 * 0.67 = 211.05
    });
});
