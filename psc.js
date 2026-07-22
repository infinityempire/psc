/**
 * PSC - מחשבון תעריפי תחבורה ציבורית
 * לוגיקת חישוב טהורה - מאפשרת שימוש חוזר בטסטים ובממשק
 * 
 * Updated with:
 * - Tzedek Tachburati 50%/33% discount based on socio-economic cluster
 * - Israel Railways single ride pricing tiers
 */

// Train single-ride fare tiers (higher minimum than bus)
const TRAIN_SINGLE_FARE_TIERS = [
    { maxDistance: 15, fare: 8.50 },      // Short distance - train premium
    { maxDistance: 40, fare: 16.00 },     // Medium distance
    { maxDistance: 75, fare: 22.50 },     // Long distance
    { maxDistance: Infinity, fare: 36.00 } // Very long distance
];

// Bus single-ride fare tiers
const BUS_SINGLE_FARE_TIERS = [
    { maxDistance: 15, fare: 6.00 },
    { maxDistance: 40, fare: 12.00 },
    { maxDistance: 75, fare: 17.00 },
    { maxDistance: Infinity, fare: 28.00 }
];

function getBaseFare(distance, ticketType, includesRail) {
    if (ticketType === 'single') {
        const tiers = includesRail ? TRAIN_SINGLE_FARE_TIERS : BUS_SINGLE_FARE_TIERS;
        for (const tier of tiers) {
            if (distance <= tier.maxDistance) {
                return tier.fare;
            }
        }
        return tiers[tiers.length - 1].fare;
    } else if (ticketType === 'monthly') {
        if (!includesRail) {
            return (distance <= 40) ? 99.00 : 236.00;
        } else {
            return (distance <= 40) ? 255.00 : 630.00;
        }
    }
    return 0;
}

function computeTransportFare(params) {
    // 1. פירוק ואיפוס מוחלט של ה-State למניעת זליגת מצב (State Leak)
    const distance = Number(params.distance) || 0;
    const ticketType = params.ticket_type || 'single';
    const profile = params.profile || 'regular';
    const isPeriphery = Boolean(params.is_periphery);
    const peripheryCluster = Number(params.periphery_cluster) || 0; // 1-5 for 50% discount
    const includesRail = Boolean(params.includes_rail);

    // 2. חישוב מחיר בסיס לפי סוג כרטיס ומרחק (כולל תעריפי רכבת)
    const baseFare = getBaseFare(distance, ticketType, includesRail);

    // 3. חישוב הנחת פרופיל
    let profileDiscount = 0;
    if (profile === 'senior_75') {
        profileDiscount = 1.00;
    } else if (['youth', 'student_extended', 'senior_67_74', 'social_eligible'].includes(profile)) {
        profileDiscount = 0.50;
    } else if (profile === 'student_regular') {
        profileDiscount = 0.33;
    }

    // 4. חישוב הנחת פריפריה / צדק תחבורתי
    // Clusters 1-5 get 50% discount, others get 33%
    let peripheryDiscount = 0.00;
    if (isPeriphery) {
        // Check if it's a socio-economic cluster 1-5 (eligible for 50% Tzedek Tachburati)
        if (peripheryCluster >= 1 && peripheryCluster <= 5) {
            peripheryDiscount = 0.50;
        } else {
            peripheryDiscount = 0.33;
        }
    }

    // 5. קביעת ההנחה הגבוהה ביותר (ללא כפל הנחות שגוי)
    const appliedDiscount = Math.max(profileDiscount, peripheryDiscount);

    // 6. חישוב מחיר סופי
    const finalFare = baseFare * (1 - appliedDiscount);

    return {
        baseFare: baseFare,
        profileDiscount: profileDiscount,
        peripheryDiscount: peripheryDiscount,
        appliedDiscount: appliedDiscount,
        finalFare: Math.round(finalFare * 100) / 100,
        trainPremium: includesRail && ticketType === 'single'
    };
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { computeTransportFare };
}
