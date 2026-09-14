# 🚌 מחשבון תעריפי תחבורה ציבורית

**אפליקציית חישוב תעריפי נסיעה בתחבורה ציבורית ישראלית - 100% חינם ופתוח לכולם!**

## 🌐 גישה ישירה

**🔗 https://infinityempire.github.io/psc/**

## ✨ תכונות

- **3 סוגי כרטיסיות:** נסיעה בודדת, חופשי יומי, חופשי חודשי
- **6 פרופילי נוסעים עם הנחות:**
  - מבוגר: מחיר מלא
  - נוער: 50% הנחה
  - ותיק/ות: 50% הנחה
  - סטודנט: 33% הנחה
  - נכה: 50% הנחה
  - חייל/שירות לאומי: חינם
- **חישוב לפי מרחק** - מרחק אווירי בין ערים
- **מנגנון Fallback מובנה** - מחיר בסיס 8.00 ₪ כאשר לא ניתן לחשב

## 💰 תעריפים

התעריפים המלאים נמצאים ב-`data/tariffs.json` (מקור הנתונים) ובברירות המחדל של `index.html`.

| מדרגת מרחק | נסיעה בודדת (אוטובוס / רכבת) | חופשי יומי (אוטובוס / רכבת) | חודשי אוטובוס | חודשי משולב רכבת |
|-------------|------------------------------|------------------------------|----------------|-------------------|
| עד 15 ק"מ | 8.00 / 11.50 | 17.50 / 23.00 | 315.00 | 323.00 |
| 15.1-40 ק"מ | 14.50 / 21.00 | 17.50 / 23.00 | 315.00 | 323.00 |
| 40.1-75 ק"מ | 19.00 / 27.00 | 29.00 / 32.50 | 315.00 | 464.00 |
| 75.1-120 ק"מ | 19.00 / 30.50 | 37.50 / 47.00 | 315.00 | 684.00 |
| 120.1+ ק"מ | 27.00 / — | — | 315.00 | 1,038.00 |

- "—" = אין תעריף (אין כרטיס רכבת בודד או חופשי יומי מעל 120 ק"מ).
- דוגמאות מאומתות: ירושלים↔תל אביב (53.9 ק"מ) — אוטובוס 19.00 ₪, רכבת 27.00 ₪, משולב חודשי 464.00 ₪;
  אילת↔מטולה (417.7 ק"מ) — אוטובוס בודד 27.00 ₪, משולב חודשי ללא הגבלה 1,038.00 ₪.

## 🛡️ אבטחה

- **100% בצד הלקוח** - כל הלוגיקה רצה בדפדפן
- **ללא שרת** - אין צורך ב-API keys
- **קוד פתוח** - ניתן לבדיקה על ידי כל אחד

## 🚀 פריסה

האפליקציה מאוחסנת על GitHub Pages מה-branch `main`.

---

## 🧪 Running QA Tests

To run the automated test suite for the fare calculator:

### Browser Console Testing

1. Open `index.html` in a web browser
2. Open Developer Tools (press F12 or Cmd+Option+I on Mac)
3. Navigate to the **Console** tab
4. Copy and paste the contents of `fare_test.js` into the console
5. Press Enter to run all tests

The test suite validates:
- ✓ Calculations return valid numbers (not undefined)
- ✓ Distance is a positive number
- ✓ Fare zones are correctly identified
- ✓ Fare rates match expected values

### Node.js Testing

```bash
npm test               # jest: psc.js engine, full fare matrix + embedded index.html engine
npm run build          # syntax-check all JS entry points (no bundler is used)
npm run test:ui        # fare_test.js - QA suite for the calculator in index.html
npm run test:periphery # geographic periphery helpers
npm run test:e2e       # headless browser UI test
                       #   (needs: npm i --no-save playwright && npx playwright install chromium)
```

## 💻 Terminal Setup

For enhanced developer productivity, set up the `gemini-fix` terminal alias:

```bash
# Add to your shell configuration
source ./setup_terminal.sh

# Or for permanent installation:
echo 'source /path/to/setup_terminal.sh' >> ~/.bashrc  # Bash
echo 'source /path/to/setup_terminal.sh' >> ~/.zshrc   # Zsh
```

Usage:
```bash
gemini-fix src/main.js src/utils.js
gemini-fix index.html style.css
```

## 📊 Dynamic Tariff Updates

The fare tariffs are stored in `data/tariffs.json` and can be updated dynamically:

```bash
# Show current tariffs
python3 update_tariffs.py --show

# Validate tariff data
python3 update_tariffs.py --validate

# Fetch and apply new tariffs
python3 update_tariffs.py --fetch

# Create backup only
python3 update_tariffs.py --backup

# Preview changes without applying
python3 update_tariffs.py --dry-run
```

## 📁 Project Structure

```
psc-repository/
├── index.html          # Main application
├── fare_test.js        # QA test suite
├── setup_terminal.sh   # Terminal alias setup
├── update_tariffs.py   # Dynamic tariff updater
├── condense.py         # Code condensation utility
├── data/
│   ├── tariffs.json    # Fare tariff data
│   └── backups/        # Tariff backups
└── README.md
```

---

*נוצר על ידי AI Agent (OpenHands)*
