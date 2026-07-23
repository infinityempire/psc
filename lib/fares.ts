/**
 * Israeli Public Transportation Fare Data
 * 
 * Source: Ministry of Transportation / National Public Transport Authority (NTA)
 * Official fare schedule as of 2024-2025
 * 
 * URL: https://www.gov.il/he/departments/the-national-public-transport-authority
 * 
 * Fare bands are based on distance in kilometers.
 * Prices are in ILS (New Israeli Shekels).
 */

/**
 * Distance-based fare bands
 * Each band defines the minimum distance (inclusive) and maximum distance (exclusive)
 */
export interface FareBand {
  minKm: number;
  maxKm: number | null; // null represents infinity
  label: string;
}

/**
 * Fare bands in kilometers
 * Based on official NTA fare schedule
 */
export const FARE_BANDS: FareBand[] = [
  { minKm: 0, maxKm: 15, label: '0-15' },
  { minKm: 15, maxKm: 40, label: '15-40' },
  { minKm: 40, maxKm: 75, label: '40-75' },
  { minKm: 75, maxKm: 120, label: '75-120' },
  { minKm: 120, maxKm: 225, label: '120-225' },
  { minKm: 225, maxKm: null, label: '225+' },
];

/**
 * Transport modes
 */
export type TransportMode = 'bus_only' | 'with_train';

/**
 * Contract types
 */
export type ContractType = 'single' | 'daily' | 'monthly';

/**
 * Discount profiles
 * Based on official NTA discount structure
 */
export type DiscountProfile = 'regular' | '50_percent' | '33_percent' | '75_percent' | '100_percent';

/**
 * Base fare prices for single ride by transport mode and fare band
 * Prices in ILS (rounded to nearest 0.5)
 * 
 * Source: Official NTA fare schedule
 */
export const SINGLE_RIDE_BASE_FARES: Record<TransportMode, Record<string, number>> = {
  bus_only: {
    '0-15': 5.5,
    '15-40': 8.5,
    '40-75': 13.5,
    '75-120': 19.5,
    '120-225': 27.0,
    '225+': 37.5,
  },
  with_train: {
    '0-15': 5.9,
    '15-40': 9.5,
    '40-75': 15.5,
    '75-120': 23.0,
    '120-225': 33.0,
    '225+': 47.5,
  },
};

/**
 * Daily free pass prices by transport mode and fare band
 * Prices in ILS
 * 
 * Note: Daily pass is typically valid for unlimited rides on the same day
 */
export const DAILY_PASS_PRICES: Record<TransportMode, Record<string, number>> = {
  bus_only: {
    '0-15': 13.0,
    '15-40': 24.0,
    '40-75': 38.0,
    '75-120': 55.0,
    '120-225': 76.0,
    '225+': 105.0,
  },
  with_train: {
    '0-15': 15.5,
    '15-40': 29.0,
    '40-75': 46.0,
    '75-120': 67.0,
    '120-225': 92.0,
    '225+': 127.0,
  },
};

/**
 * Monthly free pass prices by transport mode and fare band
 * Prices in ILS
 * 
 * Note: Monthly pass is typically valid for unlimited rides for one calendar month
 */
export const MONTHLY_PASS_PRICES: Record<TransportMode, Record<string, number>> = {
  bus_only: {
    '0-15': 130.0,
    '15-40': 240.0,
    '40-75': 380.0,
    '75-120': 550.0,
    '120-225': 760.0,
    '225+': 1050.0,
  },
  with_train: {
    '0-15': 155.0,
    '15-40': 290.0,
    '40-75': 460.0,
    '75-120': 670.0,
    '120-225': 920.0,
    '225+': 1270.0,
  },
};

/**
 * Discount multipliers by discount profile
 */
export const DISCOUNT_MULTIPLIERS: Record<DiscountProfile, number> = {
  '100_percent': 0,      // Free
  '75_percent': 0.25,   // 75% discount = pay 25%
  '50_percent': 0.50,   // 50% discount = pay 50%
  '33_percent': 0.67,   // 33% discount = pay 67% (rounded)
  'regular': 1.0,       // No discount
};

/**
 * Human-readable labels for transport modes
 */
export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  bus_only: 'אוטובוס / רכבת קלה בלבד',
  with_train: 'משולב רכבת ישראל',
};

/**
 * Human-readable labels for contract types
 */
export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  single: 'נסיעה בודדת',
  daily: 'חופשי יומי',
  monthly: 'חופשי חודשי',
};

/**
 * Human-readable labels for discount profiles
 */
export const DISCOUNT_PROFILE_LABELS: Record<DiscountProfile, string> = {
  regular: 'ללא הנחה',
  '50_percent': '50% הנחה',
  '33_percent': '33% הנחה',
  '75_percent': '75% הנחה',
  '100_percent': 'נסיעה חינם',
};

/**
 * Find the fare band for a given distance in km
 */
export function findFareBand(distanceKm: number): FareBand | null {
  if (distanceKm < 0) return null;
  
  for (const band of FARE_BANDS) {
    if (distanceKm >= band.minKm && (band.maxKm === null || distanceKm < band.maxKm)) {
      return band;
    }
  }
  
  // If distance is beyond all bands (shouldn't happen with current bands)
  return FARE_BANDS[FARE_BANDS.length - 1];
}

/**
 * Get the base fare for a given distance and transport mode
 */
export function getBaseFare(
  distanceKm: number,
  transportMode: TransportMode,
  contractType: ContractType
): number | null {
  const band = findFareBand(distanceKm);
  if (!band) return null;

  const priceTable = 
    contractType === 'single' ? SINGLE_RIDE_BASE_FARES :
    contractType === 'daily' ? DAILY_PASS_PRICES :
    MONTHLY_PASS_PRICES;

  const basePrice = priceTable[transportMode][band.label];
  
  // No single ride for train beyond 225km
  if (contractType === 'single' && transportMode === 'with_train' && distanceKm >= 225) {
    // Train beyond 225km requires special ticket, not available in single ride
    // Return the bus price as a fallback
    return SINGLE_RIDE_BASE_FARES.bus_only['225+'];
  }
  
  return basePrice ?? null;
}

/**
 * Calculate the final fare after applying discount
 */
export function calculateFare(params: {
  distanceKm: number;
  transportMode: TransportMode;
  contractType: ContractType;
  discountProfile: DiscountProfile;
}): { price: number | null; formatted: string } {
  const { distanceKm, transportMode, contractType, discountProfile } = params;
  
  const basePrice = getBaseFare(distanceKm, transportMode, contractType);
  if (basePrice === null) {
    return { price: null, formatted: 'לא ניתן לחשב' };
  }

  const multiplier = DISCOUNT_MULTIPLIERS[discountProfile];
  const finalPrice = basePrice * multiplier;

  // Round to nearest 0.1 (one decimal place)
  const roundedPrice = Math.round(finalPrice * 10) / 10;

  return {
    price: roundedPrice,
    formatted: formatFare(roundedPrice),
  };
}

/**
 * Format a fare price for display
 * Prices are formatted in ILS with proper formatting
 */
export function formatFare(price: number): string {
  if (price === 0) return 'חינם';
  
  // Check if price has decimal part
  if (price % 1 === 0) {
    return `${price} ₪`;
  }
  
  return `${price.toFixed(1)} ₪`;
}

/**
 * Check if a specific combination is valid
 */
export function isValidCombination(params: {
  distanceKm: number;
  transportMode: TransportMode;
  contractType: ContractType;
  discountProfile: DiscountProfile;
}): { valid: boolean; reason?: string } {
  const { distanceKm, transportMode, contractType, discountProfile } = params;

  if (distanceKm <= 0) {
    return { valid: false, reason: 'המרחק חייב להיות גדול מ-0' };
  }

  // Check if single ride is available for train beyond 225km
  if (contractType === 'single' && transportMode === 'with_train' && distanceKm >= 225) {
    return { valid: false, reason: 'אין תעריף נסיעה בודדת ברכבת מעל 225 ק"מ' };
  }

  // Check discount profile validity with contract type
  if (discountProfile === '100_percent' && contractType !== 'monthly') {
    return { valid: false, reason: 'הנחה של 100% תקפה רק לחופשי חודשי' };
  }

  return { valid: true };
}
