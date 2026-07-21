// בדיקות יחידה ו-E2E עבור מחשבון PSC (תחבורה ציבורית)

const { computeTransportFare } = require('./psc.js');

describe('PSC Transport Fare Calculator Tests', () => {
    test('נסיעה בודדת - מדרגות מרחק בסיסיות', () => {
        expect(computeTransportFare({ distance: 10, ticket_type: 'single' }).finalFare).toBe(6.00);
        expect(computeTransportFare({ distance: 25, ticket_type: 'single' }).finalFare).toBe(12.00);
        expect(computeTransportFare({ distance: 50, ticket_type: 'single' }).finalFare).toBe(17.00);
        expect(computeTransportFare({ distance: 80, ticket_type: 'single' }).finalFare).toBe(28.00);
    });

    test('הנחת פריפריה (צדק תחבורתי) - 33%', () => {
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
