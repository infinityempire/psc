/**
 * PSC - מחשבון תעריפי תחבורה ציבורית
 * לוגיקת חישוב טהורה - מאפשרת שימוש חוזר בטסטים ובממשק
 * 
 * Updated with:
 * - Tzedek Tachburati 50%/33% discount based on socio-economic cluster
 * - Israel Railways single ride pricing tiers
 * - Corrected fare tiers per official schedule
 */

// Bus fare tiers (base)
const BUS_FARE_TIERS = [
    { maxDistance: 15, single: 6.00, daily: 13.50 },
    { maxDistance: 40, single: 12.00, daily: 24.00 },
    { maxDistance: 75, single: 17.00, daily: 32.50 },
    { maxDistance: Infinity, single: 28.00, daily: 50.00 }
];

// Train fare tiers (with rail premium)
const TRAIN_FARE_TIERS = [
    { maxDistance: 15, single: 8.50, daily: 19.00 },
    { maxDistance: 40, single: 16.00, daily: 32.00 },
    { maxDistance: 75, single: 22.50, daily: 42.50 },
    { maxDistance: Infinity, single: 36.00, daily: 68.00 }
];

// Monthly pass prices (standardized)
const MONTHLY_PASS_PRICES = {
    bus: 310.00,    // Nationwide Monthly Pass
    rail: 610.00    // Combined Rail Monthly Pass
};

/**
 * Calculate fare for a given distance and ticket type
 * @param {number} distance - Distance in km
 * @param {string} ticketType - 'single', 'daily', or 'monthly'
 * @param {boolean} includesRail - Whether route includes train
 * @returns {object} Fare object with single, daily, monthly prices
 */
function calculateTierFare(distance, includesRail = false) {
    const tiers = includesRail ? TRAIN_FARE_TIERS : BUS_FARE_TIERS;
    
    for (const tier of tiers) {
        if (distance <= tier.maxDistance) {
            return {
                singleFare: tier.single,
                dailyFare: tier.daily,
                monthlyFare: includesRail ? MONTHLY_PASS_PRICES.rail : MONTHLY_PASS_PRICES.bus
            };
        }
    }
    
    // Default to longest distance tier
    const lastTier = tiers[tiers.length - 1];
    return {
        singleFare: lastTier.single,
        dailyFare: lastTier.daily,
        monthlyFare: includesRail ? MONTHLY_PASS_PRICES.rail : MONTHLY_PASS_PRICES.bus
    };
}

function getBaseFare(distance, ticketType, includesRail) {
    const fares = calculateTierFare(distance, includesRail);
    
    switch (ticketType) {
        case 'single':
            return fares.singleFare;
        case 'daily':
            return fares.dailyFare;
        case 'monthly':
            return fares.monthlyFare;
        default:
            return 0;
    }
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
        trainPremium: includesRail && ticketType === 'single',
        // Include all fares for UI display
        allFares: calculateTierFare(distance, includesRail)
    };
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { computeTransportFare, calculateTierFare };
}
