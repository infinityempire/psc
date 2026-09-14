// בדיקות רגרסיה למנוע התעריפים המוטמע ב-index.html
// Regression tests for the fare engine embedded in index.html.
//
// The engine runs twice in production:
//   1. immediately, with its embedded default rules, and
//   2. after fetch('data/tariffs.json') succeeds (the GitHub Pages path).
// Both are covered here, because a schema mismatch between them silently broke
// every daily fare and made the UI fall back to a fixed "error" price.

const fs = require('fs');
const path = require('path');
const { loadCalculator, loadTariffsFile, extractInlineScripts } = require('./calculator-loader.js');
const psc = require('./psc.js');

const HTML_PATH = path.join(__dirname, 'index.html');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');
const TARIFFS = loadTariffsFile();

const PROFILE = 'adult';
const DISTANCES = [10, 25, 50, 80, 150, 417.7];

describe('Embedded calculator - embedded default rules', () => {
    let ui;

    beforeAll(async () => {
        ui = await loadCalculator();
    });

    test('calculateFare does not throw for a paying passenger', () => {
        expect(() => ui.calculateFare('ירושלים', 'תל אביב', PROFILE)).not.toThrow();
    });

    test('every zone exposes the single daily price the schema uses', () => {
        ['yellow', 'green', 'lightblue', 'blue', 'purple'].forEach(zone => {
            expect(ui.FARE_RULES[zone]).toBeDefined();
            expect(ui.FARE_RULES[zone].single).toEqual(expect.any(Number));
        });
        // purple has no daily product at all (no daily pass above 120 km)
        expect(ui.FARE_RULES.yellow.daily).toBe(17.50);
        expect(ui.FARE_RULES.lightblue.daily).toBe(29.00);
        expect(ui.FARE_RULES.blue.daily).toBe(37.50);
        expect(ui.FARE_RULES.purple.daily).toBeNull();
    });

    test('the last zone keeps maxDistance Infinity (no JSON round-trip)', () => {
        expect(ui.FARE_RULES.purple.maxDistance).toBe(Infinity);
    });
});

describe('Embedded calculator - with data/tariffs.json loaded (production path)', () => {
    let ui;

    beforeAll(async () => {
        ui = await loadCalculator({ tariffs: TARIFFS });
    });

    test('a non-free passenger never gets a NaN/undefined fare', () => {
        const routes = [
            ['ירושלים', 'תל אביב'], ['אילת', 'מטולה'], ['תל אביב', 'חיפה'],
            ['תל אביב', 'באר שבע'], ['שדרות', 'תל אביב'], ['נהריה', 'באר שבע'],
        ];
        routes.forEach(([origin, dest]) => {
            const res = ui.calculateFare(origin, dest, PROFILE);
            ['single', 'daily'].forEach(key => {
                expect(`${origin}->${dest} ${key}=${res[key]}`).not.toMatch(/NaN|undefined/);
            });
            expect(typeof res.monthlyNational.price).toBe('number');
            expect(typeof res.monthlyTrain.price).toBe('number');
        });
    });

    test('daily fares are numbers everywhere the schema defines one', () => {
        [10, 25, 50, 80].forEach(distance => {
            const zone = ui.determineFareZone(distance);
            expect(zone.data.daily).toEqual(expect.any(Number));
            expect(zone.railData.daily).toEqual(expect.any(Number));
        });
    });

    test('combined rail monthly pass is priced by distance zone', () => {
        expect(ui.MONTHLY_TRAIN_PRICES).toEqual({
            yellow: 323.00, green: 323.00, lightblue: 464.00, blue: 684.00, purple: 1038.00,
        });
    });

    test('the rail monthly tier reported for a route matches its distance', () => {
        const cases = [[25, 'upTo40km'], [50, 'upTo75km'], [92, 'upTo120km'], [150, 'unlimited']];
        cases.forEach(([distance, tier]) => {
            const zone = ui.determineFareZone(distance);
            const contract = ui.evaluateMonthlyContract(
                ui.MONTHLY_CONTRACTS.nationalTrain, zone, 'תל אביב', 'חיפה', 0, false
            );
            expect(`${distance}km -> ${contract.tier}`).toBe(`${distance}km -> ${tier}`);
        });
    });
});

describe('Fare matrix - acceptance cases', () => {
    let ui;

    beforeAll(async () => {
        ui = await loadCalculator({ tariffs: TARIFFS });
    });

    test('Jerusalem <-> Tel Aviv (53.9 km)', () => {
        const res = ui.calculateFare('ירושלים', 'תל אביב', PROFILE);
        expect(res.distance).toBeCloseTo(53.9, 1);
        expect(res.zone).toBe('lightblue');
        expect(res.allFares.bus.singleFare).toBe(19.00);
        expect(res.allFares.rail.singleFare).toBe(27.00);
        expect(res.allFares.bus.dailyFare).toBe(29.00);
        expect(res.allFares.rail.dailyFare).toBe(32.50);
        expect(res.monthlyNational.price).toBe(315.00);
        expect(res.monthlyTrain.price).toBe(464.00);
    });

    test('Eilat <-> Metula (417.7 km)', () => {
        const res = ui.calculateFare('אילת', 'מטולה', PROFILE);
        expect(res.distance).toBeCloseTo(417.7, 1);
        expect(res.zone).toBe('purple');
        expect(res.allFares.bus.singleFare).toBe(27.00);
        expect(res.monthlyTrain.price).toBe(1038.00);
        // No daily pass is sold above 120 km.
        expect(res.allFares.bus.dailyFare).toBeNull();
    });
});

describe('Embedded engine matches psc.js (single source of truth)', () => {
    let ui;

    beforeAll(async () => {
        ui = await loadCalculator({ tariffs: TARIFFS });
    });

    test('tier tables are identical for every distance band', () => {
        DISTANCES.forEach(distance => {
            const zone = ui.determineFareZone(distance);
            const fares = psc.calculateTierFare(distance);

            expect(`${distance} bus.single ${zone.data.single}`)
                .toBe(`${distance} bus.single ${fares.bus.single}`);
            expect(`${distance} bus.daily ${zone.data.daily}`)
                .toBe(`${distance} bus.daily ${fares.getBusDailyPass(distance)}`);
            expect(`${distance} rail.single ${zone.railData.single}`)
                .toBe(`${distance} rail.single ${fares.rail.single}`);
            expect(`${distance} rail.daily ${zone.railData.daily}`)
                .toBe(`${distance} rail.daily ${fares.getRailDailyPass(distance)}`);
            expect(`${distance} rail.monthly ${ui.MONTHLY_TRAIN_PRICES[zone.zone]}`)
                .toBe(`${distance} rail.monthly ${fares.getRailMonthlyPass(distance)}`);
        });
    });
});

describe('UI wiring integrity (index.html)', () => {
    const script = extractInlineScripts(HTML).slice(-1)[0];

    test('every element id referenced by the script exists in the markup', () => {
        const ids = new Set();
        const re = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
        let match;
        while ((match = re.exec(script)) !== null) ids.add(match[1]);

        // Ids created at runtime (e.g. recent-search chips) are fine too.
        const missing = [...ids].filter(id =>
            !HTML.includes(`id="${id}"`) && !new RegExp(`\\.id\\s*=\\s*['"]${id}['"]`).test(script)
        );
        expect(missing).toEqual([]);
    });

    test('the calculate button and its handler are wired up', () => {
        expect(HTML).toContain('id="calculate-btn"');
        expect(HTML).toContain('btn.onclick = calculateFareAndDisplay');
    });

    test('all fare outputs referenced by the UI exist and are rendered', async () => {
        const ui = await loadCalculator({ tariffs: TARIFFS });
        expect(typeof ui.calculateFareAndDisplay).toBe('function');
        ['price-single-bus', 'price-single-rail', 'price-daily-bus', 'price-daily-rail',
            'price-monthly-national', 'price-monthly-rail-40', 'price-monthly-rail-75',
            'price-monthly-rail-120', 'price-monthly-rail-unlimited'].forEach(id => {
            expect(`${id}:${HTML.includes(`id="${id}"`)}`).toBe(`${id}:true`);
        });
    });
});
