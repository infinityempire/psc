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

## 💰 תעריפים (יולי 2025)

| סוג | מחיר |
|-----|-------|
| נסיעה בודדת | 8.00 ₪ |
| חופשי יומי | 18.00 ₪ |
| חופשי חודשי | 315.00 ₪ |

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
node fare_test.js
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
