/**
 * PSC - מחשבון תעריפי תחבורה ציבורית
 * לוגיקת חישוב טהורה - מאפשרת שימוש חוזר בטסטים ובממשק
 * 
 * Official Ministry of Transport ("Derech Shaveh" / "Tachburah Tzedek") tariff structure
 * Direct mapping to national distance-tier matrix for both Bus/Light Rail and Rail routes
 */

// Official Distance-Tier Tariff Matrix
// Bus / Light Rail / Metronit / Cable (ללא רכבת ישראל)
const BUS_FARE_TIERS = [
    { minDistance: 0, maxDistance: 15, single: 8.00, daily: 17.50, monthlyLocal: null, monthlyNational: 315.00 },
    { minDistance: 15.1, maxDistance: 40, single: 14.50, daily: 29.00, monthlyLocal: null, monthlyNational: 315.00 },
    { minDistance: 40.1, maxDistance: 75, single: 19.00, daily: 37.50, monthlyLocal: null, monthlyNational: 315.00 },
    { minDistance: 75.1, maxDistance: 120, single: 19.00, daily: 37.50, monthlyLocal: null, monthlyNational: 315.00 },
    { minDistance: 120.1, maxDistance: 225, single: 30.50, daily: 60.50, monthlyLocal: null, monthlyNational: 315.00 },
    { minDistance: 225.1, maxDistance: Infinity, single: 74.00, daily: 79.50, monthlyLocal: null, monthlyNational: 315.00 }
];

// Including Israel Railways (כולל רכבת ישראל)
const RAIL_FARE_TIERS = [
    { minDistance: 0, maxDistance: 15, single: 11.50, daily: 23.00, monthlyUpTo40km: 323.00 },
    { minDistance: 15.1, maxDistance: 40, single: 21.00, daily: 32.50, monthlyUpTo40km: 323.00 },
    { minDistance: 40.1, maxDistance: 75, single: 27.00, daily: 42.00, monthlyUpTo75km: 464.00 },
    { minDistance: 75.1, maxDistance: 120, single: 30.50, daily: 47.00, monthlyUnlimited: 684.00 },
    { minDistance: 120.1, maxDistance: Infinity, single: 52.50, daily: 80.50, monthlyUnlimited: 684.00 }
];

// Monthly pass base prices
const MONTHLY_PASS_BASE = {
    busLocal: null,
    busNational: 315.00,
    railUpTo40km: 323.00,
    railUpTo75km: 464.00,
    railUnlimited: 684.00,
    peripheryRegional: 139.00
};

/**
 * Find the appropriate fare tier based on distance
 * @param {number} distance - Distance in km
 * @param {Array} tiers - Array of fare tiers
 * @returns {object} The matching tier
 */
function findFareTier(distance, tiers) {
    for (const tier of tiers) {
        if (distance >= tier.minDistance && distance <= tier.maxDistance) {
            return tier;
        }
    }
    // Default to longest distance tier
    return tiers[tiers.length - 1];
}

/**
 * Calculate fare for a given distance and ticket type
 * Returns both bus and rail tiers for UI display
 * @param {number} distance - Distance in km
 * @param {boolean} includesRail - Whether route includes train
 * @returns {object} Fare object with bus and rail tier prices
 */
function calculateTierFare(distance, includesRail = false) {
    const busTier = findFareTier(distance, BUS_FARE_TIERS);
    const railTier = findFareTier(distance, RAIL_FARE_TIERS);
    
    const result = {
        // Bus tiers
        bus: {
            single: busTier.single,
            daily: busTier.daily,
            monthlyLocal: busTier.monthlyLocal,
            monthlyNational: busTier.monthlyNational
        },
        // Rail tiers (including train) - distance-based monthly passes
        rail: {
            single: railTier.single,
            daily: railTier.daily,
            monthlyUpTo40km: railTier.monthlyUpTo40km,
            monthlyUpTo75km: railTier.monthlyUpTo75km,
            monthlyUnlimited: railTier.monthlyUnlimited
        },
        // Get appropriate rail monthly pass based on distance
        getRailMonthlyPass: function(dist) {
            if (dist <= 40) return railTier.monthlyUpTo40km;
            if (dist <= 75) return railTier.monthlyUpTo75km;
            return railTier.monthlyUnlimited;
        },
        // Distance metadata
        distance: distance,
        zoneLabel: getZoneLabel(distance)
    };
    
    return result;
}

/**
 * Get zone label based on distance
 * @param {number} distance - Distance in km
 * @returns {string} Zone label in Hebrew
 */
function getZoneLabel(distance) {
    if (distance <= 15) return 'אזור 1 (0-15 ק"מ)';
    if (distance <= 40) return 'אזור 2 (15.1-40 ק"מ)';
    if (distance <= 75) return 'אזור 3 (40.1-75 ק"מ)';
    if (distance <= 120) return 'אזור 4 (75.1-120 ק"מ)';
    if (distance <= 225) return 'אזור 5 (120.1-225 ק"מ)';
    return 'אזור 6 (225.1+ ק"מ)';
}

/**
 * Get base fare for a specific ticket type
 * @param {number} distance - Distance in km
 * @param {string} ticketType - 'single', 'daily', 'monthly', 'monthlyLocal', 'monthlyNational', 'monthlyRail'
 * @param {boolean} includesRail - Whether route includes train
 * @returns {number} Base fare amount
 */
function getBaseFare(distance, ticketType, includesRail = false) {
    const fares = calculateTierFare(distance, includesRail);
    
    switch (ticketType) {
        case 'single':
            return includesRail ? fares.rail.single : fares.bus.single;
        case 'daily':
            return includesRail ? fares.rail.daily : fares.bus.daily;
        case 'monthly':
            return includesRail ? fares.getRailMonthlyPass(distance) : fares.bus.monthlyNational;
        case 'monthlyLocal':
            return fares.bus.monthlyLocal;
        case 'monthlyNational':
            return fares.bus.monthlyNational;
        case 'monthlyRail':
            return fares.getRailMonthlyPass(distance);
        default:
            return 0;
    }
}

/**
 * Compute transport fare with profile discounts
 * Implements official Ministry of Transport tariff structure
 * 
 * Profile Discount Rules:
 * - Regular: 0% discount (1.0)
 * - Youth (up to 18): 50% discount (0.5) on Single/Daily
 * - Young Adult (18-26): 33% discount (0.67) on Monthly Pass
 * - Senior Citizen (67-74): 50% discount (0.5)
 * - Senior Citizen Plus (75+): 100% discount (Free)
 * - Student: 33% discount (0.67) on Single/Daily, 50% on Extended Semester Pass
 * - Disabled: 50% discount (0.5)
 * - Geographic Periphery (Clusters 1-5): 50% discount on Monthly Pass
 * - Geographic Periphery (Cluster 6+): 33% discount on Monthly Pass
 * 
 * @param {object} params - Fare calculation parameters
 * @param {number} params.distance - Distance in km
 * @param {string} params.ticket_type - 'single', 'daily', 'monthly', 'monthlyLocal', 'monthlyNational', 'monthlyNationalRail'
 * @param {string} params.profile - 'regular', 'youth', 'young_adult', 'senior_67_74', 'senior_75', 'student', 'disabled'
 * @param {boolean} params.is_periphery - Whether route is in geographic periphery
 * @param {number} params.periphery_cluster - Socio-economic cluster (1-10)
 * @param {boolean} params.includes_rail - Whether route includes Israel Railways
 * @returns {object} Fare calculation result with all tiers and discounts
 */
function computeTransportFare(params) {
    // Parse and validate inputs
    const distance = Number(params.distance) || 0;
    const ticketType = params.ticket_type || 'single';
    const profile = params.profile || 'regular';
    const isPeriphery = Boolean(params.is_periphery);
    const peripheryCluster = Number(params.periphery_cluster) || 0;
    const includesRail = Boolean(params.includes_rail);

    // Calculate base fares for both bus and rail
    const allFares = calculateTierFare(distance, includesRail);
    
    // Determine base fare for selected ticket type
    const baseFare = getBaseFare(distance, ticketType, includesRail);

    // Calculate profile discount based on ticket type and profile
    let profileDiscount = 0;
    const isMonthlyPass = ticketType.startsWith('monthly');
    const isSingleOrDaily = ticketType === 'single' || ticketType === 'daily';
    
    if (profile === 'senior_75') {
        // 100% discount for seniors 75+
        profileDiscount = 1.00;
    } else if (profile === 'youth') {
        // 50% discount for youth (up to 18)
        profileDiscount = isSingleOrDaily ? 0.50 : 0;
    } else if (profile === 'young_adult') {
        // 33% discount for young adults (18-26) on monthly passes only
        profileDiscount = isMonthlyPass ? 0.33 : 0;
    } else if (profile === 'senior_67_74' || profile === 'disabled') {
        // 50% discount for seniors 67-74 and disabled
        profileDiscount = isSingleOrDaily ? 0.50 : 0;
    } else if (profile === 'student') {
        // 33% discount for students on Single/Daily
        // 50% discount on Extended Semester Pass
        if (ticketType === 'monthly') {
            profileDiscount = 0.50;
        } else if (isSingleOrDaily) {
            profileDiscount = 0.33;
        }
    }

    // Calculate periphery discount for monthly passes only
    // Clusters 1-5 get 50%, clusters 6+ get 33%
    let peripheryDiscount = 0;
    if (isPeriphery && isMonthlyPass) {
        if (peripheryCluster >= 1 && peripheryCluster <= 5) {
            peripheryDiscount = 0.50;
        } else {
            peripheryDiscount = 0.33;
        }
    }

    // Apply the higher discount (profile or periphery) - no discount stacking
    const appliedDiscount = Math.max(profileDiscount, peripheryDiscount);

    // Calculate final fare
    const finalFare = baseFare * (1 - appliedDiscount);

    // Build comprehensive result object for UI
    const result = {
        // Base fares
        baseFare: baseFare,
        
        // All tier fares for UI display
        bus: {
            single: allFares.bus.single,
            daily: allFares.bus.daily,
            monthlyLocal: allFares.bus.monthlyLocal,
            monthlyNational: allFares.bus.monthlyNational
        },
        rail: {
            single: allFares.rail.single,
            daily: allFares.rail.daily,
            monthlyUpTo40km: allFares.rail.monthlyUpTo40km,
            monthlyUpTo75km: allFares.rail.monthlyUpTo75km,
            monthlyUnlimited: allFares.rail.monthlyUnlimited,
            getMonthlyPass: allFares.getRailMonthlyPass
        },
        
        // Discount information
        profileDiscount: profileDiscount,
        peripheryDiscount: peripheryDiscount,
        appliedDiscount: appliedDiscount,
        
        // Final calculated fare
        finalFare: Math.round(finalFare * 100) / 100,
        
        // Metadata
        distance: distance,
        zoneLabel: allFares.zoneLabel,
        ticketType: ticketType,
        profile: profile,
        includesRail: includesRail,
        trainPremium: includesRail && ticketType === 'single',
        
        // Flattened allFares for backward compatibility
        allFares: allFares
    };

    return result;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        computeTransportFare, 
        calculateTierFare,
        getBaseFare,
        getZoneLabel,
        findFareTier,
        BUS_FARE_TIERS,
        RAIL_FARE_TIERS,
        MONTHLY_PASS_BASE
    };
}
