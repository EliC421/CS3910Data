// Quick test of CSV parsing
const fs = require('fs');

// Read just the first 5 lines
const lines = require('fs').readFileSync('data/Vehicle_Crashes_in_Iowa_20260307.csv', 'utf8').split('\n').slice(0, 5);

console.log('First 5 lines:');
lines.forEach((line, i) => {
    console.log(`\nLine ${i}:`);
    console.log(line.substring(0, 200) + '...');
});

// Test parsing one row
const headers = lines[0].split('","').map(h => h.replace(/^"|"$/g, ''));
console.log('\n\nHeaders found:');
console.log(headers);

console.log('\n\nLast column (should be Location):');
console.log(headers[headers.length - 1]);
