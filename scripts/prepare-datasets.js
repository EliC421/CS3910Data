const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATA_DIR = path.join(process.cwd(), 'data');
const OUTPUT_DIR = path.join(DATA_DIR, 'processed');

const FILES = {
    crashes: 'Vehicle_Crashes_in_Iowa_20260312.csv',
    population: 'County_Population_in_Iowa_by_Year_20260312.csv',
    probation: 'Iowa_Probation_Recidivism_Status_20260312.csv',
    unemployment: 'Iowa_Local_Area_Unemployment_Statistics.csv',
    income: 'Iowa_Median_Household_Income_in_the_Past_12_Months_(ACS_5-Year_Estimates)_20260312.csv',
    liquor: 'Iowa_Liquor_Sales_20260312.csv',
    prisonAdmissions: 'Iowa_Prison_Admissions_20260330.csv'
};

const REQUIRED_FILE_KEYS = ['crashes', 'population', 'probation', 'unemployment', 'income', 'liquor'];

function normalizeCountyName(raw) {
    if (!raw) return '';

    return String(raw)
        .trim()
        .replace(/,\s*Iowa\s*$/i, '')
        .replace(/\s+County\s*$/i, '')
        .replace(/\s+/g, ' ');
}

function countyKey(raw) {
    return normalizeCountyName(raw).toUpperCase();
}

function titleCase(value) {
    return String(value)
        .toLowerCase()
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function parseYear(value) {
    if (!value) return null;
    const match = String(value).match(/(19|20)\d{2}/);
    return match ? Number(match[0]) : null;
}

function toNumber(value) {
    if (value === null || value === undefined) return null;
    const cleaned = String(value).trim().replace(/[,$]/g, '');
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}

function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const next = line[i + 1];

        if (ch === '"' && next === '"') {
            current += '"';
            i++;
        } else if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += ch;
        }
    }

    values.push(current);
    return values;
}

function parsePointWkt(value) {
    const match = String(value || '').match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (!match) return null;

    const lng = Number(match[1]);
    const lat = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
}

async function streamCsvRows(filePath, onRow, progressStep = 100000) {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let headers = null;
    let lineNumber = 0;

    for await (const line of rl) {
        lineNumber++;

        if (!headers) {
            headers = parseCsvLine(line).map((h) => h.replace(/^\uFEFF/, '').trim());
            continue;
        }

        if (!line) continue;

        const values = parseCsvLine(line);
        const row = {};
        for (let i = 0; i < headers.length; i++) {
            row[headers[i]] = values[i] !== undefined ? values[i] : '';
        }

        onRow(row, lineNumber);

        if (lineNumber % progressStep === 0) {
            console.log(`Processed ${lineNumber.toLocaleString()} lines from ${path.basename(filePath)}`);
        }
    }
}

function writeCsv(filePath, headers, rows) {
    const lines = [headers.join(',')];

    for (const row of rows) {
        const line = headers.map((header) => csvEscape(row[header])).join(',');
        lines.push(line);
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

function mapToSortedRows(map, countyNameByKey, fieldsFactory) {
    const rows = [];

    for (const [key, value] of map.entries()) {
        const [countyKeyPart, yearPart] = key.split('|');
        const year = Number(yearPart);
        const county = countyNameByKey.get(countyKeyPart) || titleCase(countyKeyPart.toLowerCase());
        rows.push(fieldsFactory(county, year, value));
    }

    rows.sort((a, b) => {
        if (a.county === b.county) return a.year - b.year;
        return a.county.localeCompare(b.county);
    });

    return rows;
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const missing = REQUIRED_FILE_KEYS
        .map((name) => ({ name, file: FILES[name], fullPath: path.join(DATA_DIR, FILES[name]) }))
        .filter((entry) => !fs.existsSync(entry.fullPath));

    const prisonAdmissionsPath = path.join(DATA_DIR, FILES.prisonAdmissions);
    const hasPrisonAdmissions = fs.existsSync(prisonAdmissionsPath);

    if (!hasPrisonAdmissions) {
        console.log(`Optional dataset not found: ${FILES.prisonAdmissions}. Skipping prison admissions processing.`);
    }

    if (missing.length > 0) {
        console.error('Missing required data files:');
        missing.forEach((entry) => {
            console.error(`- ${entry.file} (${entry.name})`);
        });
        process.exit(1);
    }

    const countyNameByKey = new Map();

    const populationByCountyYear = new Map();
    const populationYearsByCounty = new Map();

    const crashAgg = new Map();
    const probationAgg = new Map();
    const unemploymentAgg = new Map();
    const incomeAgg = new Map();
    const liquorAgg = new Map();
    const liquorStoreAgg = new Map();
    const prisonAdmissionsYearAgg = new Map();

    console.log('Step 1/7: Parsing county population data...');
    await streamCsvRows(path.join(DATA_DIR, FILES.population), (row) => {
        const county = normalizeCountyName(row['County']);
        const key = countyKey(county);
        const year = parseYear(row['Year']);
        const population = toNumber(row['Population']);

        if (!key || !year || !population || population <= 0) return;

        countyNameByKey.set(key, county);
        populationByCountyYear.set(`${key}|${year}`, population);

        if (!populationYearsByCounty.has(key)) {
            populationYearsByCounty.set(key, []);
        }
        populationYearsByCounty.get(key).push({ year, population });
    }, 50000);

    for (const [key, entries] of populationYearsByCounty.entries()) {
        const dedup = new Map();
        entries.forEach((entry) => dedup.set(entry.year, entry.population));
        const sorted = Array.from(dedup.entries())
            .map(([year, population]) => ({ year, population }))
            .sort((a, b) => a.year - b.year);
        populationYearsByCounty.set(key, sorted);
    }

    console.log('Step 2/7: Parsing crash data and building county-year aggregates...');
    await streamCsvRows(path.join(DATA_DIR, FILES.crashes), (row) => {
        const county = normalizeCountyName(row['County Name']);
        const key = countyKey(county);
        const year = parseYear(row['Date of Crash']);
        if (!key || !year) return;

        countyNameByKey.set(key, county);

        const aggKey = `${key}|${year}`;
        if (!crashAgg.has(aggKey)) {
            crashAgg.set(aggKey, {
                total_crashes: 0,
                impaired_crashes: 0,
                fatalities: 0,
                injuries: 0
            });
        }

        const item = crashAgg.get(aggKey);
        item.total_crashes += 1;
        item.fatalities += toNumber(row['Number of Fatalities']) || 0;
        item.injuries += toNumber(row['Number of Injuries']) || 0;

        const intox = (row['Drug or Alcohol '] || row['Drug or Alcohol'] || '').trim();
        if (intox && intox !== 'None Indicated' && intox !== 'N/A') {
            item.impaired_crashes += 1;
        }
    }, 100000);

    console.log('Step 3/7: Parsing probation recidivism data...');
    await streamCsvRows(path.join(DATA_DIR, FILES.probation), (row) => {
        const county = normalizeCountyName(row['Jurisdiction']);
        const key = countyKey(county);
        const year = parseYear(row['Cohort Fiscal Year']);
        if (!key || !year) return;

        countyNameByKey.set(key, county);

        const aggKey = `${key}|${year}`;
        if (!probationAgg.has(aggKey)) {
            probationAgg.set(aggKey, {
                total_probation_cases: 0,
                owi_cases: 0,
                owi_reincarcerated: 0
            });
        }

        const item = probationAgg.get(aggKey);
        item.total_probation_cases += 1;

        const subtype = (row['Supervision Offense Subtype'] || '').toUpperCase();
        if (subtype === 'OWI') {
            item.owi_cases += 1;
            if ((row['Reincarcerated'] || '').toLowerCase() === 'true') {
                item.owi_reincarcerated += 1;
            }
        }
    }, 100000);

    console.log('Step 4/7: Parsing unemployment and income control datasets...');
    await streamCsvRows(path.join(DATA_DIR, FILES.unemployment), (row) => {
        const areaType = (row['AREA TYPE'] || '').trim();
        const countyRaw = row['AREA NAME'] || '';
        const county = normalizeCountyName(countyRaw);
        const key = countyKey(county);
        const year = parseYear(row['YEAR']);
        const seasonal = (row['SEASONALLY ADJUSTED'] || '').trim();

        if (areaType !== 'County' || !key || !year) return;
        if (seasonal !== '0') return; // keep one series only

        countyNameByKey.set(key, county);

        const aggKey = `${key}|${year}`;
        if (!unemploymentAgg.has(aggKey)) {
            unemploymentAgg.set(aggKey, {
                unemployment_rate_sum: 0,
                unemployment_rate_count: 0,
                laborforce_sum: 0,
                unemployment_sum: 0
            });
        }

        const item = unemploymentAgg.get(aggKey);
        const rate = toNumber(row['UNEMPLOYMENT RATE']);
        const laborforce = toNumber(row['LABORFORCE']);
        const unemployment = toNumber(row['UNEMPLOYMENT']);

        if (rate !== null) {
            item.unemployment_rate_sum += rate;
            item.unemployment_rate_count += 1;
        }
        if (laborforce !== null) item.laborforce_sum += laborforce;
        if (unemployment !== null) item.unemployment_sum += unemployment;
    }, 100000);

    await streamCsvRows(path.join(DATA_DIR, FILES.income), (row) => {
        const type = (row['Type'] || '').trim().toLowerCase();
        const county = normalizeCountyName(row['Name']);
        const key = countyKey(county);
        const year = parseYear(row['Data Collection End Date']);
        const income = toNumber(row['Median Household Income']);

        if (type !== 'county' || !key || !year || income === null) return;

        countyNameByKey.set(key, county);
        incomeAgg.set(`${key}|${year}`, {
            median_household_income: income
        });
    }, 100000);

    console.log('Step 5/7: Parsing liquor sales data...');
    await streamCsvRows(path.join(DATA_DIR, FILES.liquor), (row) => {
        const county = normalizeCountyName(row['County']);
        const key = countyKey(county);
        const year = parseYear(row['Date']);
        if (!key || !year) return;

        countyNameByKey.set(key, county);

        const aggKey = `${key}|${year}`;
        if (!liquorAgg.has(aggKey)) {
            liquorAgg.set(aggKey, {
                sale_dollars: 0,
                volume_liters: 0,
                bottles_sold: 0
            });
        }

        const item = liquorAgg.get(aggKey);
        const saleDollars = toNumber(row['Sale (Dollars)']) || 0;
        const volumeLiters = toNumber(row['Volume Sold (Liters)']) || 0;
        const bottlesSold = toNumber(row['Bottles Sold']) || 0;

        item.sale_dollars += saleDollars;
        item.volume_liters += volumeLiters;
        item.bottles_sold += bottlesSold;

        const storeNumber = String(row['Store Number'] || '').trim();
        const storeLocation = parsePointWkt(row['Store Location']);
        if (!storeNumber || !storeLocation) return;

        const storeAggKey = `${storeNumber}|${year}`;
        if (!liquorStoreAgg.has(storeAggKey)) {
            liquorStoreAgg.set(storeAggKey, {
                year,
                store_number: storeNumber,
                store_name: String(row['Store Name'] || '').trim(),
                address: String(row['Address'] || '').trim(),
                city: String(row['City'] || '').trim(),
                county,
                lat: storeLocation.lat,
                lng: storeLocation.lng,
                transactions: 0,
                liquor_sale_dollars: 0,
                liquor_volume_liters: 0,
                liquor_bottles_sold: 0
            });
        }

        const storeItem = liquorStoreAgg.get(storeAggKey);
        storeItem.transactions += 1;
        storeItem.liquor_sale_dollars += saleDollars;
        storeItem.liquor_volume_liters += volumeLiters;
        storeItem.liquor_bottles_sold += bottlesSold;
    }, 100000);

    console.log('Step 6/7: Parsing prison admissions data...');
    if (hasPrisonAdmissions) {
        await streamCsvRows(prisonAdmissionsPath, (row) => {
            const year = parseYear(row['Fiscal Year Admitted']) || parseYear(row['Admission Date']);
            if (!year) return;

            if (!prisonAdmissionsYearAgg.has(year)) {
                prisonAdmissionsYearAgg.set(year, {
                    total_admissions: 0,
                    female_admissions: 0,
                    male_admissions: 0,
                    owi_admissions: 0,
                    violent_admissions: 0,
                    drug_admissions: 0,
                    property_admissions: 0,
                    public_order_admissions: 0,
                    other_admissions: 0,
                    age_sum: 0,
                    age_count: 0,
                    months_served_sum: 0,
                    months_served_count: 0
                });
            }

            const item = prisonAdmissionsYearAgg.get(year);
            item.total_admissions += 1;

            const sex = String(row['Sex'] || '').trim().toUpperCase();
            if (sex === 'FEMALE') item.female_admissions += 1;
            if (sex === 'MALE') item.male_admissions += 1;

            const offenseType = String(row['Offense Type'] || '').trim().toUpperCase();
            if (offenseType === 'VIOLENT') item.violent_admissions += 1;
            else if (offenseType === 'DRUG') item.drug_admissions += 1;
            else if (offenseType === 'PROPERTY') item.property_admissions += 1;
            else if (offenseType === 'PUBLIC ORDER') item.public_order_admissions += 1;
            else item.other_admissions += 1;

            const offenseSubtype = String(row['Offense Subtype'] || '').trim().toUpperCase();
            if (offenseSubtype === 'OWI') {
                item.owi_admissions += 1;
            }

            const age = toNumber(row['Age at Admission']);
            if (age !== null) {
                item.age_sum += age;
                item.age_count += 1;
            }

            const monthsServed = toNumber(row['Months Served']);
            if (monthsServed !== null) {
                item.months_served_sum += monthsServed;
                item.months_served_count += 1;
            }
        }, 100000);
    }

    console.log('Step 7/7: Writing processed and normalized outputs...');

    const crashRows = mapToSortedRows(crashAgg, countyNameByKey, (county, year, value) => ({
        county,
        year,
        total_crashes: value.total_crashes,
        impaired_crashes: value.impaired_crashes,
        fatalities: value.fatalities,
        injuries: value.injuries
    }));

    const probationRows = mapToSortedRows(probationAgg, countyNameByKey, (county, year, value) => ({
        county,
        year,
        total_probation_cases: value.total_probation_cases,
        owi_cases: value.owi_cases,
        owi_reincarcerated: value.owi_reincarcerated
    }));

    const unemploymentRows = mapToSortedRows(unemploymentAgg, countyNameByKey, (county, year, value) => ({
        county,
        year,
        unemployment_rate: value.unemployment_rate_count > 0
            ? (value.unemployment_rate_sum / value.unemployment_rate_count).toFixed(3)
            : '',
        laborforce_sum: Math.round(value.laborforce_sum),
        unemployment_sum: Math.round(value.unemployment_sum)
    }));

    const incomeRows = mapToSortedRows(incomeAgg, countyNameByKey, (county, year, value) => ({
        county,
        year,
        median_household_income: Math.round(value.median_household_income)
    }));

    const latestPopulationRows = [];
    const populationRows = [];

    for (const [key, yearEntries] of populationYearsByCounty.entries()) {
        const county = countyNameByKey.get(key) || titleCase(key.toLowerCase());

        yearEntries.forEach((entry) => {
            populationRows.push({ county, year: entry.year, population: Math.round(entry.population) });
        });

        const latest = yearEntries[yearEntries.length - 1];
        latestPopulationRows.push({
            county,
            year: latest.year,
            population: Math.round(latest.population)
        });
    }

    populationRows.sort((a, b) => (a.county === b.county ? a.year - b.year : a.county.localeCompare(b.county)));
    latestPopulationRows.sort((a, b) => a.county.localeCompare(b.county));

    const allKeys = new Set([
        ...crashAgg.keys(),
        ...probationAgg.keys(),
        ...unemploymentAgg.keys(),
        ...incomeAgg.keys(),
        ...liquorAgg.keys()
    ]);

    function getPopulationForCountyYear(key, year) {
        const exact = populationByCountyYear.get(`${key}|${year}`);
        if (exact) {
            return { population: exact, yearUsed: year };
        }

        const yearEntries = populationYearsByCounty.get(key);
        if (!yearEntries || yearEntries.length === 0) {
            return { population: null, yearUsed: null };
        }

        let nearest = yearEntries[0];
        let nearestDiff = Math.abs(yearEntries[0].year - year);

        for (const entry of yearEntries) {
            const diff = Math.abs(entry.year - year);
            if (diff < nearestDiff) {
                nearest = entry;
                nearestDiff = diff;
            }
        }

        return { population: nearest.population, yearUsed: nearest.year };
    }

    const normalizedRows = [];

    for (const aggKey of allKeys) {
        const [key, yearStr] = aggKey.split('|');
        const year = Number(yearStr);
        const county = countyNameByKey.get(key) || titleCase(key.toLowerCase());

        const crash = crashAgg.get(aggKey) || {
            total_crashes: 0,
            impaired_crashes: 0,
            fatalities: 0,
            injuries: 0
        };

        const probation = probationAgg.get(aggKey) || {
            total_probation_cases: 0,
            owi_cases: 0,
            owi_reincarcerated: 0
        };

        const unemployment = unemploymentAgg.get(aggKey);
        const income = incomeAgg.get(aggKey);
        const liquor = liquorAgg.get(aggKey);

        const popResult = getPopulationForCountyYear(key, year);
        const population = popResult.population;

        const crashesPer100k = population ? (crash.total_crashes / population) * 100000 : null;
        const impairedPer100k = population ? (crash.impaired_crashes / population) * 100000 : null;
        const owiPer100k = population ? (probation.owi_cases / population) * 100000 : null;
        const liquorDollarsPer100k = population && liquor ? (liquor.sale_dollars / population) * 100000 : null;

        normalizedRows.push({
            county,
            year,
            population: population ? Math.round(population) : '',
            population_year_used: popResult.yearUsed || '',
            total_crashes: crash.total_crashes,
            crashes_per_100k: crashesPer100k !== null ? crashesPer100k.toFixed(3) : '',
            impaired_crashes: crash.impaired_crashes,
            impaired_crashes_per_100k: impairedPer100k !== null ? impairedPer100k.toFixed(3) : '',
            fatalities: crash.fatalities,
            injuries: crash.injuries,
            owi_probation_cases: probation.owi_cases,
            owi_probation_per_100k: owiPer100k !== null ? owiPer100k.toFixed(3) : '',
            owi_reincarcerated: probation.owi_reincarcerated,
            unemployment_rate: unemployment && unemployment.unemployment_rate_count > 0
                ? (unemployment.unemployment_rate_sum / unemployment.unemployment_rate_count).toFixed(3)
                : '',
            median_household_income: income ? Math.round(income.median_household_income) : '',
            liquor_sale_dollars: liquor ? Math.round(liquor.sale_dollars) : '',
            liquor_volume_liters: liquor ? Math.round(liquor.volume_liters) : '',
            liquor_bottles_sold: liquor ? Math.round(liquor.bottles_sold) : '',
            liquor_dollars_per_100k: liquorDollarsPer100k !== null ? liquorDollarsPer100k.toFixed(3) : ''
        });
    }

    normalizedRows.sort((a, b) => (a.county === b.county ? a.year - b.year : a.county.localeCompare(b.county)));

    writeCsv(path.join(OUTPUT_DIR, 'population_county_year.csv'), ['county', 'year', 'population'], populationRows);
    writeCsv(path.join(OUTPUT_DIR, 'population_latest_county.csv'), ['county', 'year', 'population'], latestPopulationRows);

    writeCsv(
        path.join(OUTPUT_DIR, 'crash_county_year.csv'),
        ['county', 'year', 'total_crashes', 'impaired_crashes', 'fatalities', 'injuries'],
        crashRows
    );

    writeCsv(
        path.join(OUTPUT_DIR, 'probation_owi_county_year.csv'),
        ['county', 'year', 'total_probation_cases', 'owi_cases', 'owi_reincarcerated'],
        probationRows
    );

    writeCsv(
        path.join(OUTPUT_DIR, 'unemployment_county_year.csv'),
        ['county', 'year', 'unemployment_rate', 'laborforce_sum', 'unemployment_sum'],
        unemploymentRows
    );

    writeCsv(
        path.join(OUTPUT_DIR, 'income_county_year.csv'),
        ['county', 'year', 'median_household_income'],
        incomeRows
    );

    const liquorRows = mapToSortedRows(liquorAgg, countyNameByKey, (county, year, value) => ({
        county,
        year,
        liquor_sale_dollars: Math.round(value.sale_dollars),
        liquor_volume_liters: Math.round(value.volume_liters),
        liquor_bottles_sold: Math.round(value.bottles_sold)
    }));

    writeCsv(
        path.join(OUTPUT_DIR, 'liquor_county_year.csv'),
        ['county', 'year', 'liquor_sale_dollars', 'liquor_volume_liters', 'liquor_bottles_sold'],
        liquorRows
    );

    const liquorStoreRows = Array.from(liquorStoreAgg.values())
        .map((value) => ({
            year: value.year,
            store_number: value.store_number,
            store_name: value.store_name,
            address: value.address,
            city: value.city,
            county: value.county,
            lat: value.lat,
            lng: value.lng,
            transactions: value.transactions,
            liquor_sale_dollars: Math.round(value.liquor_sale_dollars),
            liquor_volume_liters: Math.round(value.liquor_volume_liters),
            liquor_bottles_sold: Math.round(value.liquor_bottles_sold)
        }))
        .sort((a, b) => {
            if (a.year === b.year) {
                return b.liquor_sale_dollars - a.liquor_sale_dollars;
            }
            return a.year - b.year;
        });

    writeCsv(
        path.join(OUTPUT_DIR, 'liquor_store_year.csv'),
        [
            'year',
            'store_number',
            'store_name',
            'address',
            'city',
            'county',
            'lat',
            'lng',
            'transactions',
            'liquor_sale_dollars',
            'liquor_volume_liters',
            'liquor_bottles_sold'
        ],
        liquorStoreRows
    );

    if (hasPrisonAdmissions) {
        const prisonAdmissionsRows = Array.from(prisonAdmissionsYearAgg.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([year, value]) => ({
                year,
                total_admissions: value.total_admissions,
                female_admissions: value.female_admissions,
                male_admissions: value.male_admissions,
                violent_admissions: value.violent_admissions,
                drug_admissions: value.drug_admissions,
                property_admissions: value.property_admissions,
                public_order_admissions: value.public_order_admissions,
                other_admissions: value.other_admissions,
                owi_admissions: value.owi_admissions,
                average_age_at_admission: value.age_count > 0 ? (value.age_sum / value.age_count).toFixed(2) : '',
                average_months_served: value.months_served_count > 0 ? (value.months_served_sum / value.months_served_count).toFixed(2) : ''
            }));

        writeCsv(
            path.join(OUTPUT_DIR, 'prison_admissions_year.csv'),
            [
                'year',
                'total_admissions',
                'female_admissions',
                'male_admissions',
                'violent_admissions',
                'drug_admissions',
                'property_admissions',
                'public_order_admissions',
                'other_admissions',
                'owi_admissions',
                'average_age_at_admission',
                'average_months_served'
            ],
            prisonAdmissionsRows
        );
    }

    writeCsv(
        path.join(OUTPUT_DIR, 'county_year_normalized.csv'),
        [
            'county',
            'year',
            'population',
            'population_year_used',
            'total_crashes',
            'crashes_per_100k',
            'impaired_crashes',
            'impaired_crashes_per_100k',
            'fatalities',
            'injuries',
            'owi_probation_cases',
            'owi_probation_per_100k',
            'owi_reincarcerated',
            'unemployment_rate',
            'median_household_income',
            'liquor_sale_dollars',
            'liquor_volume_liters',
            'liquor_bottles_sold',
            'liquor_dollars_per_100k'
        ],
        normalizedRows
    );

    console.log('Done. Processed files written to data/processed:');
    console.log('- population_county_year.csv');
    console.log('- population_latest_county.csv');
    console.log('- crash_county_year.csv');
    console.log('- probation_owi_county_year.csv');
    console.log('- unemployment_county_year.csv');
    console.log('- income_county_year.csv');
    console.log('- liquor_county_year.csv');
    console.log('- liquor_store_year.csv');
    if (hasPrisonAdmissions) {
        console.log('- prison_admissions_year.csv');
    }
    console.log('- county_year_normalized.csv');
}

main().catch((error) => {
    console.error('Dataset preparation failed:', error);
    process.exit(1);
});
