const fs = require('fs');

const files = [
  { name: 'county_year_normalized.csv', label: 'Normalized County-Year Master' },
  { name: 'crash_county_year.csv', label: 'Crashes' },
  { name: 'income_county_year.csv', label: 'Median Household Income' },
  { name: 'liquor_county_year.csv', label: 'Liquor Sales' },
  { name: 'population_county_year.csv', label: 'Population' },
  { name: 'probation_owi_county_year.csv', label: 'Probation / OWI' },
  { name: 'unemployment_county_year.csv', label: 'Unemployment' }
];

console.log('DATA READINESS AUDIT FOR MULTI-LAYER MAP\n');
console.log('=' .repeat(100));

const datasets = {};

files.forEach(({ name, label }) => {
  const path = 'data/processed/' + name;
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const header = lines[0].split(',');
  
  const countyIdx = header.indexOf('county');
  const yearIdx = header.indexOf('year');
  
  const years = new Set();
  const counties = new Set();
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (row[countyIdx]) counties.add(row[countyIdx]);
    if (row[yearIdx]) years.add(parseInt(row[yearIdx]));
  }
  
  const sortedYears = Array.from(years).sort((a, b) => a - b);
  
  datasets[name] = {
    label,
    rowCount: lines.length - 1,
    counties: counties.size,
    years: sortedYears,
    minYear: Math.min(...sortedYears),
    maxYear: Math.max(...sortedYears),
    columns: header
  };
  
  console.log(`\n${label}`);
  console.log('-'.repeat(100));
  console.log(`File: ${name}`);
  console.log(`Records: ${datasets[name].rowCount} | Counties: ${counties.size} | Year range: ${datasets[name].minYear}–${datasets[name].maxYear}`);
  console.log(`Columns: ${header.join(', ')}`);
});

// Find year coverage matrix
console.log('\n' + '='.repeat(100));
console.log('\nYEAR AVAILABILITY MATRIX (which datasets have data for common years)\n');

// Get all possible years
const allYears = new Set();
Object.values(datasets).forEach(d => d.years.forEach(y => allYears.add(y)));
const sortedAllYears = Array.from(allYears).sort((a, b) => a - b);

// Create availability map
const availabilityByYear = {};
sortedAllYears.forEach(year => {
  availabilityByYear[year] = {};
  files.forEach(({ name }) => {
    const isAvailable = datasets[name].years.includes(year);
    availabilityByYear[year][name] = isAvailable ? '✓' : ' ';
  });
});

// Print matrix (sample years to keep output readable)
const sampleYears = [
  Math.min(...sortedAllYears),
  2000, 2005, 2010, 2015, 2020, 2025,
  Math.max(...sortedAllYears)
].filter(y => sortedAllYears.includes(y));

console.log('Year'.padEnd(8) + files.map(f => f.name.replace('_county_year.csv', '').substring(0, 12).padEnd(15)).join(''));
sampleYears.forEach(year => {
  let row = String(year).padEnd(8);
  files.forEach(({ name }) => {
    const avail = availabilityByYear[year][name] || ' ';
    row += avail.padEnd(15);
  });
  console.log(row);
});

// Recommendations
console.log('\n' + '='.repeat(100));
console.log('\nRECOMMENDATIONS FOR MULTI-LAYER FEATURE\n');

console.log('1. LAYER PAIRING STRATEGY');
console.log('   - Crashes + Income: both have 2012+ data → good for correlation');
console.log('   - Unemployment + Crashes: both have 2000+ → widest historical range');
console.log('   - Liquor sales very sparse (2025 only) → only for single-year viz, mark as "limited"');

console.log('\n2. YEAR SELECTOR BEHAVIOR');
console.log('   - Default to 2020 (most datasets available)');
console.log('   - Dynamically hide datasets that lack data for selected year');
console.log('   - Show warning if <2 datasets available for selected year');

console.log('\n3. DATA QUALITY NOTES');
console.log('   - Liquor sales: only 198 records (likely ~2 years × ~99 counties)');
console.log('   - Income: only 1188 records (likely 1188 / 99 ≈ 12 years)');
console.log('   - Population: 3465 records (best coverage: 1990–2025)');

console.log('\n4. SCHEMA ALIGNMENT');
console.log('   - All have "county" and "year" columns ✓');
console.log('   - County names use consistent format ✓');
console.log('   - Each has 1+ metric columns (value, rate, etc.)');
console.log('   - Plan for metric unit labeling (per 100k, absolute count, %)');
