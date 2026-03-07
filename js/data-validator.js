/**
 * CSV Data Validator
 * Validates Iowa government CSV data files
 */

class DataValidator {
    constructor() {
        this.validationRules = {
            liquor: {
                required: ['County', 'City', 'Store Name', 'Sale (Dollars)'],
                optional: ['Latitude', 'Longitude', 'Address']
            },
            dui: {
                required: ['County', 'Date', 'Charge'],
                optional: ['Latitude', 'Longitude', 'Case Number']
            },
            offenders: {
                required: ['County', 'Offense'],
                optional: ['Latitude', 'Longitude', 'Registration Date']
            },
            alerts: {
                required: ['County', 'Date'],
                optional: ['Latitude', 'Longitude', 'Status', 'Description']
            }
        };
    }

    /**
     * Validate dataset structure
     */
    validateDataset(datasetName, data) {
        console.log(`Validating ${datasetName} dataset...`);
        
        if (!data || data.length === 0) {
            return {
                valid: false,
                errors: ['Dataset is empty']
            };
        }

        const rules = this.validationRules[datasetName];
        if (!rules) {
            return {
                valid: false,
                errors: [`No validation rules defined for ${datasetName}`]
            };
        }

        const errors = [];
        const warnings = [];
        const headers = Object.keys(data[0]);

        // Check required columns
        rules.required.forEach(requiredCol => {
            if (!headers.includes(requiredCol)) {
                errors.push(`Missing required column: ${requiredCol}`);
            }
        });

        // Check for geographic data
        const hasLat = headers.some(h => h.toLowerCase().includes('lat'));
        const hasLng = headers.some(h => h.toLowerCase().includes('lon') || h.toLowerCase().includes('lng'));
        
        if (!hasLat || !hasLng) {
            warnings.push('Dataset missing geographic coordinates (lat/lng)');
        }

        // Validate data quality
        const qualityReport = this.validateDataQuality(data);
        
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            quality: qualityReport,
            rowCount: data.length,
            columns: headers
        };
    }

    /**
     * Validate data quality
     */
    validateDataQuality(data) {
        const report = {
            totalRows: data.length,
            nullCounts: {},
            duplicates: 0,
            invalidCoordinates: 0
        };

        const headers = Object.keys(data[0]);
        
        // Initialize null counters
        headers.forEach(header => {
            report.nullCounts[header] = 0;
        });

        // Check each row
        const seenRows = new Set();
        
        data.forEach((row, index) => {
            // Check for nulls/empty values
            headers.forEach(header => {
                if (!row[header] || row[header].trim() === '') {
                    report.nullCounts[header]++;
                }
            });

            // Check for duplicates
            const rowKey = JSON.stringify(row);
            if (seenRows.has(rowKey)) {
                report.duplicates++;
            }
            seenRows.add(rowKey);

            // Validate coordinates if present
            if (row.Latitude && row.Longitude) {
                const lat = parseFloat(row.Latitude);
                const lng = parseFloat(row.Longitude);

                // Iowa boundaries: roughly 40.4°N to 43.5°N, 90.1°W to 96.6°W
                if (isNaN(lat) || isNaN(lng) || 
                    lat < 40.3 || lat > 43.6 || 
                    lng < -96.7 || lng > -90.0) {
                    report.invalidCoordinates++;
                }
            }
        });

        // Calculate percentages
        report.duplicatePercentage = (report.duplicates / data.length * 100).toFixed(2);
        report.invalidCoordPercentage = report.invalidCoordinates > 0 
            ? (report.invalidCoordinates / data.length * 100).toFixed(2)
            : 0;

        return report;
    }

    /**
     * Generate validation report
     */
    generateReport(validationResult) {
        console.log('\n=== Validation Report ===');
        console.log(`Valid: ${validationResult.valid ? 'YES' : 'NO'}`);
        console.log(`Total Rows: ${validationResult.rowCount}`);
        console.log(`Columns: ${validationResult.columns.join(', ')}`);
        
        if (validationResult.errors.length > 0) {
            console.log('\nERRORS:');
            validationResult.errors.forEach(err => console.log(`  - ${err}`));
        }
        
        if (validationResult.warnings.length > 0) {
            console.log('\nWARNINGS:');
            validationResult.warnings.forEach(warn => console.log(`  - ${warn}`));
        }

        if (validationResult.quality) {
            const q = validationResult.quality;
            console.log('\nQUALITY METRICS:');
            console.log(`  Duplicates: ${q.duplicates} (${q.duplicatePercentage}%)`);
            console.log(`  Invalid Coordinates: ${q.invalidCoordinates} (${q.invalidCoordPercentage}%)`);
            
            console.log('\n  Missing Values per Column:');
            Object.keys(q.nullCounts).forEach(col => {
                const count = q.nullCounts[col];
                if (count > 0) {
                    const pct = (count / q.totalRows * 100).toFixed(2);
                    console.log(`    ${col}: ${count} (${pct}%)`);
                }
            });
        }
        
        console.log('========================\n');
        
        return validationResult;
    }

    /**
     * Quick validation helper
     */
    async validateFile(filename, datasetName) {
        try {
            const data = await dataProcessor.loadCSV(filename, datasetName);
            if (!data) {
                return { valid: false, errors: ['Failed to load file'] };
            }
            
            const result = this.validateDataset(datasetName, data);
            this.generateReport(result);
            return result;
        } catch (error) {
            console.error('Validation error:', error);
            return { valid: false, errors: [error.message] };
        }
    }
}

// Create global instance
const dataValidator = new DataValidator();
