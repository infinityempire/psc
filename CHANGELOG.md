# Changelog

## [1.3.0] - 2026-09-14

### 🐛 Critical fix: every calculation failed on the deployed site

`data/tariffs.json` was migrated to schema 3.x (five zones, `dailyLocal` /
`dailyExtended` / `dailyNationwide`) but the engine embedded in `index.html` still
read the old `zone.daily` field. On GitHub Pages - where
`fetch('data/tariffs.json')` actually succeeds - every bus/rail daily fare became
`undefined`, so `price-daily-bus.textContent = undefined.toFixed(2)` threw and the
whole page fell back to a fixed "error" price. The button was left disabled too,
because the catch block itself threw on the missing value.

#### Fixed
- **Daily fares**: the loader now collapses `dailyLocal` / `dailyExtended` /
  `dailyNationwide` into the single `daily` value each zone needs.
- **`MONTHLY_TRAIN_PRICES.blue` was ₪323 instead of ₪684**: the lookup chain omitted
  `monthlyUpTo120km`, so the 75-120 km combined rail pass silently fell back to the
  cheapest tier. A ₪684 "עד 120 ק\"מ" tier is now shown in the UI as well.
- **Rail single/daily used a hardcoded ×1.42 "train premium"** instead of the official
  rail tiers (19 ₪ × 1.42 = 26.98 ₪ where the tariff says 27.00 ₪; the blue zone
  reported 26.98 ₪ instead of 30.50 ₪). The exact `RAIL_FARE_RULES` tiers are now used,
  falling back to the bus fare where no rail single ride exists.
- **Embedded defaults were stale/incorrect**: `MONTHLY_CONTRACTS.national.base` was
  ₪13.09 (a value the daily fare scraper had written) and the unlimited rail pass was
  ₪684 instead of ₪1,038. Defaults now mirror `data/tariffs.json` 3.x.
- **`FARE_RULES.purple.maxDistance` became `null`** because
  `JSON.parse(JSON.stringify(...))` serialises `Infinity` as `null`.
- **Dead wiring**: the script still looked up `train-pass-label` / `train-pass-price`,
  which no longer exist in the markup.
- **`fare_test.js` crashed in Node** with `ReferenceError: calculateFare is not defined`
  and asserted an outdated lightblue daily fare.
- **`test_e2e_psc.js`** used `file://` (blocking the tariff fetch), the removed
  `#price-single` element and crashed when Playwright was absent.
- **`update_tariffs.py`**: every sub-command referenced a non-existent `fareRules` key,
  `save_tariffs()` called `json.dump(data, f, f, ...)`, and `--dry-run` still wrote a backup.
- **`sync-fares.js`**: the daily scraper could write an implausible value into the
  monthly pass base; scraped fares are now validated before being written.

#### Added
- `calculator-loader.js` - loads the embedded engine into Node for tests, optionally
  simulating a successful `tariffs.json` fetch.
- `index.ui.test.js` - 13 regression tests, including a check that the embedded engine
  and `psc.js` produce identical tier tables (the mismatch that caused this bug).
- `npm run build` (syntax check), `npm run test:ui`, `npm run test:e2e`.

#### Verified
| Command | Result |
|---------|--------|
| `npm test` | 139 passed |
| `npm run test:ui` | 20 passed |
| `npm run test:e2e` (headless Chromium) | 25 passed, no console errors |
| `npm run test:periphery` | all passed |
| `python3 update_tariffs.py --validate` | passed |

Accepted fare cases: ירושלים↔ת"א (53.9 ק"מ) - אוטובוס 19.00 ₪, רכבת 27.00 ₪, משולב חודשי 464.00 ₪;
אילת↔מטולה (417.7 ק"מ) - אוטובוס בודד 27.00 ₪, משולב חודשי ללא הגבלה 1,038.00 ₪.

---

## [1.1.0] - 2025-07-11

### 🎯 Major Changes: MOT Fare Alignment

#### Fixed
- **Fare Rules Validation**: All prices now aligned with official Ministry of Transport (מסלולן) rates as of July 2025
- **Zone Boundaries**: Corrected distance thresholds (0-15km local, 15-40km suburban, 40+ km intercity)
- **Periphery Pass Logic**: Now correctly invalidates passes for Gush Dan cities (Tel Aviv, Ramat Gan) and major metros (Haifa, Jerusalem)
- **Eilat Pass Rules**: Enforces requirement that at least one endpoint must be Eilat
- **Discount Calculations**: Fixed rounding for youth (18-26: 33%), seniors (50%), students (33%), disabled (50%)

#### Added
- **Comprehensive Test Suite** (`fare.test.js`):
  - 20+ test cases covering all distance zones
  - Edge cases for exact boundary distances (15km, 40km)
  - Passenger profile validations (7 types)
  - Periphery pass invalid city checks
  - Eilat pass requirement validations
  - Free profile (soldier) testing
  
- **Fare Snapshot** (`fares.json`):
  - Official MOT fare data in JSON format
  - Structure mirrors calculator rules
  - Source attribution to Ministry of Transport
  - Last updated timestamp
  
- **GitHub Actions CI** (`.github/workflows/test.yml`):
  - Automated test runs on every PR
  - Prevents fare calculation regressions
  
#### Updated
- **Enhanced sync-fares.js**:
  - Improved error handling for Puppeteer navigation
  - Better parsing of fare elements from MOT website
  - Snapshot generation with JSON output
  - Detailed logging of fare changes
  
- **Documentation**:
  - Updated README with official fare table (July 2025)
  - Added test suite instructions
  - Clarified discount policies per passenger type

#### Current MOT Rates (July 2025)
| Category | Single | Daily | Monthly (National) | Monthly (Train) | Periphery | Eilat |
|----------|--------|-------|-------------------|-----------------|-----------|-------|
| Adult    | 8.00 ₪ | 13.00 ₪ | 315.00 ₪ | 410.00 ₪ | 133.00 ₪ | 114.50 ₪ |
| Youth (<18) | 8.00 ₪ | 13.00 ₪ | 157.50 ₪ (50%) | 205.00 ₪ (50%) | - | - |
| Young Adult (18-26) | 8.00 ₪ | 13.00 ₪ | 210.81 ₪ (33%) | 274.70 ₪ (33%) | - | - |
| Senior | 8.00 ₪ | 13.00 ₪ | 157.50 ₪ (50%) | 205.00 ₪ (50%) | 66.50 ₪ (50%) | - |
| Student | 8.00 ₪ | 13.00 ₪ | 210.81 ₪ (33%) | 274.70 ₪ (33%) | - | - |
| Disabled | 8.00 ₪ | 13.00 ₪ | 157.50 ₪ (50%) | 205.00 ₪ (50%) | 66.50 ₪ (50%) | - |
| Soldier | 0.00 ₪ (FREE) | 0.00 ₪ (FREE) | 0.00 ₪ (FREE) | 0.00 ₪ (FREE) | 0.00 ₪ (FREE) | 0.00 ₪ (FREE) |

### 🧪 Quality Assurance
- All 20+ test cases passing ✅
- Edge case coverage for distance boundaries
- Passenger profile discount validation
- Invalid pass conditions verification

### 📝 Testing Instructions
```bash
# Run full test suite
npm test

# Update fares from MOT website
npm run sync-fares
```

---

### Notes
- **Fallback Mechanism**: When cities are not found, calculator uses lightblue zone (40-75km) prices (19.00 ₪ single)
- **Free Profiles**: Soldiers, national service, blind persons, and seniors 75+ always pay 0.00 ₪
- **Monthly Pass Restrictions**: 
  - Periphery pass unavailable from/to Gush Dan (Tel Aviv area) and major metros
  - Eilat pass only available for routes involving Eilat
  - Train pass only for intercity routes (40+ km)

---

## [1.0.x] - 2025-07-11 - Fare Zone Fix

### 🐛 Critical Bug Fix
- **Jerusalem-Tel Aviv Single Ride**: Fixed incorrect price from 49.50 ₪ to **19.00 ₪**
- **Zone System**: Expanded from 3 zones to **6 official MOT fare zones**:
  - צהוב (0-15 ק"מ): בודד 8.00₪, יומי 17.50₪
  - ירוק (15-40 ק"מ): בודד 14.50₪, יומי 29.00₪
  - תכלת (40-75 ק"מ): בודד 19.00₪, יומי 37.50₪ ← ירושלים-תל אביב
  - כחול (75-120 ק"מ): בודד 19.00₪, יומי 37.50₪
  - סגול (120-225 ק"מ): בודד 30.50₪, יומי 60.50₪
  - אפור (225+ ק"מ): בודד 74.00₪, יומי 79.50₪

- **Monthly Pass Prices**: Fixed National+Train to use zone-based pricing:
  - צהוב/ירוק: 323₪
  - תכלת: **464₪** (was 410₪)
  - כחול/סגול/אפור: **684₪** (was 410₪)

Source: [bus.gov.il](https://bus.gov.il/FaresDistance)
