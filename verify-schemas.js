const fs = require('fs');

const files = [
  'county_year_normalized.csv',
  'crash_county_year.csv',
  'income_county_year.csv',
  'liquor_county_year.csv',
  'population_county_year.csv',
  'probation_owi_county_year.csv',
  'unemployment_county_year.csv'
];

console.log('DATA SCHEMA VERIFICATION REPORT\n');
console.log('=' .repeat(80));

files.forEach(file => {
  const path = 'data/processed/' + file;
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n');
  const header = lines[0];
  const rowCount = lines.filter(l => l.trim()).length - 1; // exclude header
  
  console.log(`\n${file}`);
  console.log('-'.repeat(80));
  console.log(`Columns: ${header}`);
  console.log(`Row count: ${rowCount}`);
  console.log(`Sample row: ${lines[1]}`);
});

// Check county/year consistency
console.log('\n' + '='.repeat(80));
console.log('\nCOUNTY & YEAR CONSISTENCY CHECK\n');

const datasets = {};

files.forEach(file => {
  const path = 'data/processed/' + file;
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n');
  const header = lines[0].split(',');
  const countyIdx = header.indexOf('county');
  const yearIdx = header.indexOf('year');
  
  if (countyIdx === -1 || yearIdx === -1) {
    console.log(`WARNING: ${file} missing 'county' or 'year' column!`);
    return;
  }
  
  const countyYears = new Set();
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (row.length > Math.max(countyIdx, yearIdx)) {
      countyYears.add(`${row[countyIdx]}|${row[yearIdx]}`);
    }
  }
  
  datasets[file] = countyYears;
  console.log(`${file}: ${countyYears.size} county-year combinations`);
});

// Find common county-year pairs
const allFiles = Object.keys(datasets);
if (allFiles.length > 1) {
  const common = new Set([...datasets[allFiles[0]]].filter(x => 
    allFiles.every(f => datasets[f].has(x))
  ));
  
  console.log(`\nCommon county-year pairs across all files: ${common.size}`);
  
  // Report any mismatches
  allFiles.forEach(file => {
    const unique = new Set([...datasets[file]].filter(x => !common.has(x)));
    if (unique.size > 0) {
      console.log(`${file} has ${unique.size} unique county-year combos not in all files`);
    }
  });
}
