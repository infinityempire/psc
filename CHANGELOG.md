# Changelog

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
- **Fallback Mechanism**: When cities are not found, calculator uses intercity prices (49.50 ₪ single)
- **Free Profiles**: Soldiers, national service, blind persons, and seniors 75+ always pay 0.00 ₪
- **Monthly Pass Restrictions**: 
  - Periphery pass unavailable from/to Gush Dan (Tel Aviv area) and major metros
  - Eilat pass only available for routes involving Eilat
  - Train pass only for intercity routes (40+ km)
