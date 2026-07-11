const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Official MOT route URL (Nahariya to Ramat Gan)
const MOT_URL = 'https://route.bus.gov.il/?tab=source-destination&saveParams=true&org=%D7%A0%D7%94%D7%A8%D7%99%D7%94&oll=33.00567_35.09733&dest=%D7%A8%D7%9E%D7%AA%20%D7%92%D7%9F&dll=32.08364_34.81498';

async function scrapeFares() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
        const page = await browser.newPage();
        
        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('Navigating to Ministry of Transport website...');
        await page.goto(MOT_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Wait for fare information to load
        await page.waitForTimeout(3000);
        
        // Extract fare information
        const fares = await page.evaluate(() => {
            const result = {
                single: null,
                daily: null,
                monthly: null
            };
            
            // The MOT site may have fare information in various elements
            // Look for price patterns (numbers followed by ₪ or currency symbol)
            const pageText = document.body.innerText;
            
            // Try to find Single Ride fare
            const singleMatch = pageText.match(/(?:נסיעה בודדת|כרטיס נסיעה|Single)[^\d]*(\d+(?:[.,]\d+)?)/i);
            if (singleMatch) {
                result.single = parseFloat(singleMatch[1].replace(',', '.'));
            }
            
            // Try to find Daily Pass fare
            const dailyMatch = pageText.match(/(?:חופשי יומי|יומי|דיילי)[^\d]*(\d+(?:[.,]\d+)?)/i);
            if (dailyMatch) {
                result.daily = parseFloat(dailyMatch[1].replace(',', '.'));
            }
            
            // Try to find Monthly Pass fare
            const monthlyMatch = pageText.match(/(?:חופשי חודשי|חודשי|מנוי)[^\d]*(\d+(?:[.,]\d+)?)/i);
            if (monthlyMatch) {
                result.monthly = parseFloat(monthlyMatch[1].replace(',', '.'));
            }
            
            // Alternative: Look for price elements with specific classes or IDs
            const priceElements = document.querySelectorAll('[class*="price"], [class*="fare"], [class*="cost"], [id*="price"], [id*="fare"]');
            priceElements.forEach(el => {
                const text = el.textContent.trim();
                const priceMatch = text.match(/(\d+(?:[.,]\d+)?)/);
                if (priceMatch) {
                    const price = parseFloat(priceMatch[1].replace(',', '.'));
                    // Classify by context
                    if (text.includes('נסיעה') || text.includes('בודד') || text.includes('single')) {
                        if (!result.single || price < result.single) result.single = price;
                    } else if (text.includes('יומי') || text.includes('daily')) {
                        if (!result.daily || price < result.daily) result.daily = price;
                    } else if (text.includes('חודשי') || text.includes('monthly') || text.includes('מנוי')) {
                        if (!result.monthly || price < result.monthly) result.monthly = price;
                    }
                }
            });
            
            return result;
        });
        
        console.log('Scraped fares:', fares);
        
        await browser.close();
        return fares;
        
    } catch (error) {
        console.error('Error scraping fares:', error.message);
        await browser.close();
        throw error;
    }
}

function parseCurrentFares() {
    const indexPath = path.join(__dirname, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    const fares = {
        local: { single: null, daily: null },
        suburban: { single: null, daily: null },
        intercity: { single: null, daily: null },
        monthlyNational: null,
        monthlyTrain: null
    };
    
    // Extract local fares
    const localMatch = content.match(/local:\s*\{[^}]*maxDistance:\s*\d+[^}]*single:\s*([\d.]+)[^}]*daily:\s*([\d.]+)/s);
    if (localMatch) {
        fares.local.single = parseFloat(localMatch[1]);
        fares.local.daily = parseFloat(localMatch[2]);
    }
    
    // Extract suburban fares
    const suburbanMatch = content.match(/suburban:\s*\{[^}]*maxDistance:\s*\d+[^}]*single:\s*([\d.]+)[^}]*daily:\s*([\d.]+)/s);
    if (suburbanMatch) {
        fares.suburban.single = parseFloat(suburbanMatch[1]);
        fares.suburban.daily = parseFloat(suburbanMatch[2]);
    }
    
    // Extract intercity fares
    const intercityMatch = content.match(/intercity:\s*\{[^}]*maxDistance:\s*Infinity[^}]*single:\s*([\d.]+)[^}]*daily:\s*([\d.]+)/s);
    if (intercityMatch) {
        fares.intercity.single = parseFloat(intercityMatch[1]);
        fares.intercity.daily = parseFloat(intercityMatch[2]);
    }
    
    // Extract monthly contract fares
    const nationalMatch = content.match(/national:\s*\{[^}]*base:\s*([\d.]+)/s);
    if (nationalMatch) {
        fares.monthlyNational = parseFloat(nationalMatch[1]);
    }
    
    const trainMatch = content.match(/nationalTrain:\s*\{[^}]*base:\s*([\d.]+)/s);
    if (trainMatch) {
        fares.monthlyTrain = parseFloat(trainMatch[1]);
    }
    
    return fares;
}

function updateFares(motFares, currentFares) {
    const indexPath = path.join(__dirname, 'index.html');
    let content = fs.readFileSync(indexPath, 'utf8');
    
    let hasChanges = false;
    const changes = [];
    
    // For the Nahariya to Ramat Gan route (intercity), update intercity fares
    // and monthly national/train fares
    
    // Update intercity single fare
    if (motFares.single && motFares.single !== currentFares.intercity.single) {
        const oldValue = currentFares.intercity.single.toFixed(2);
        const newValue = motFares.single.toFixed(2);
        content = content.replace(
            /intercity:\s*\{\s*maxDistance:\s*Infinity,\s*single:\s*[\d.]+/,
            match => match.replace(oldValue, newValue)
        );
        hasChanges = true;
        changes.push(`Intercity Single: ${oldValue} -> ${newValue}`);
        console.log(`Updating intercity single: ${oldValue} -> ${newValue}`);
    }
    
    // Update intercity daily fare
    if (motFares.daily && motFares.daily !== currentFares.intercity.daily) {
        const oldValue = currentFares.intercity.daily.toFixed(2);
        const newValue = motFares.daily.toFixed(2);
        content = content.replace(
            /intercity:\s*\{[^}]*daily:\s*[\d.]+/,
            match => {
                // Handle multi-line replacement
                const lines = match.split('\n');
                return lines.map(line => {
                    if (line.includes('daily:')) {
                        return line.replace(/daily:\s*[\d.]+/, `daily: ${newValue}`);
                    }
                    return line;
                }).join('\n');
            }
        );
        hasChanges = true;
        changes.push(`Intercity Daily: ${oldValue} -> ${newValue}`);
        console.log(`Updating intercity daily: ${oldValue} -> ${newValue}`);
    }
    
    // Update monthly national fare
    if (motFares.monthly && motFares.monthly !== currentFares.monthlyNational) {
        const oldValue = currentFares.monthlyNational.toFixed(2);
        const newValue = motFares.monthly.toFixed(2);
        content = content.replace(
            /national:\s*\{[^}]*base:\s*[\d.]+/,
            match => {
                const lines = match.split('\n');
                return lines.map(line => {
                    if (line.includes('base:')) {
                        return line.replace(/base:\s*[\d.]+/, `base: ${newValue}`);
                    }
                    return line;
                }).join('\n');
            }
        );
        hasChanges = true;
        changes.push(`Monthly National: ${oldValue} -> ${newValue}`);
        console.log(`Updating monthly national: ${oldValue} -> ${newValue}`);
    }
    
    // Update monthly train fare
    if (motFares.monthlyTrain && motFares.monthlyTrain !== currentFares.monthlyTrain) {
        const oldValue = currentFares.monthlyTrain.toFixed(2);
        const newValue = motFares.monthlyTrain.toFixed(2);
        content = content.replace(
            /nationalTrain:\s*\{[^}]*base:\s*[\d.]+/,
            match => {
                const lines = match.split('\n');
                return lines.map(line => {
                    if (line.includes('base:')) {
                        return line.replace(/base:\s*[\d.]+/, `base: ${newValue}`);
                    }
                    return line;
                }).join('\n');
            }
        );
        hasChanges = true;
        changes.push(`Monthly Train: ${oldValue} -> ${newValue}`);
        console.log(`Updating monthly train: ${oldValue} -> ${newValue}`);
    }
    
    if (hasChanges) {
        fs.writeFileSync(indexPath, content, 'utf8');
        console.log('\n=== FARE UPDATE SUMMARY ===');
        changes.forEach(change => console.log(`  ${change}`));
        console.log('===========================\n');
    } else {
        console.log('No fare changes detected - all prices match current values.');
    }
    
    return hasChanges;
}

async function main() {
    console.log('=== Daily Fare Sync Started ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('');
    
    try {
        // Scrape fares from MOT website
        console.log('Step 1: Scraping fares from Ministry of Transport website...');
        const motFares = await scrapeFares();
        
        console.log('\nStep 2: Parsing current fares from index.html...');
        const currentFares = parseCurrentFares();
        console.log('Current intercity fares:', currentFares.intercity);
        console.log('Current monthly national:', currentFares.monthlyNational);
        console.log('Current monthly train:', currentFares.monthlyTrain);
        
        console.log('\nStep 3: Comparing and updating fares...');
        const hasChanges = updateFares(motFares, currentFares);
        
        if (hasChanges) {
            console.log('Fare sync completed with changes.');
            process.exit(0);
        } else {
            console.log('Fare sync completed - no changes needed.');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('Fatal error during fare sync:', error.message);
        process.exit(1);
    }
}

main();
