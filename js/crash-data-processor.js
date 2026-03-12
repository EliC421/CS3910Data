/**
 * Vehicle Crash Data Processor
 * Specialized processor for Iowa DOT crash data
 */

class CrashDataProcessor {
    constructor() {
        this.crashData = [];
        this.geoData = [];
    }

    /**
     * Parse POINT geometry from location column
     * Format: "POINT (lng lat)"
     */
    parsePointGeometry(pointString) {
        if (!pointString || pointString === 'N/A') return null;
        
        const match = pointString.match(/POINT\s*\(([^)]+)\)/i);
        if (!match) return null;
        
        const coords = match[1].trim().split(/\s+/);
        if (coords.length !== 2) return null;
        
        return {
            lng: parseFloat(coords[0]),
            lat: parseFloat(coords[1])
        };
    }

    /**
     * Process crash CSV data
     */
    processCrashData(data) {
        console.log(`Processing ${data.length} crash records...`);
        
        this.crashData = data.map(row => {
            const coords = this.parsePointGeometry(row.Location);
            
            return {
                caseNumber: row['Iowa DOT Case Number'],
                date: row['Date of Crash'],
                time: row['Time of Crash'],
                city: row['City Name'],
                county: row['County Name'],
                location: row['Location Description'],
                severity: row['Crash Severity'],
                fatalities: parseInt(row['Number of Fatalities']) || 0,
                injuries: parseInt(row['Number of Injuries']) || 0,
                majorInjuries: parseInt(row['Number of Major Injuries']) || 0,
                minorInjuries: parseInt(row['Number of Minor Injuries']) || 0,
                propertyDamage: row['Amount of Property Damage'],
                vehicles: parseInt(row['Number of Vehicles Involved']) || 0,
                majorCause: row['Major Cause'],
                drugAlcohol: row['Drug or Alcohol '] || row['Drug or Alcohol'], // Handle with/without trailing space
                weather: row['Weather Conditions'],
                roadType: row['Roadway Type'],
                coordinates: coords,
                hasLocation: coords !== null
            };
        });
        
        console.log(`Processed ${this.crashData.length} records`);
        console.log(`Records with coordinates: ${this.crashData.filter(c => c.hasLocation).length}`);
        
        return this.crashData;
    }

    /**
     * Extract geographic data for mapping
     */
    extractCrashGeoData(severityFilter = null) {
        const filtered = severityFilter 
            ? this.crashData.filter(c => c.severity === severityFilter && c.hasLocation)
            : this.crashData.filter(c => c.hasLocation);
        
        this.geoData = filtered.map(crash => ({
            lat: crash.coordinates.lat,
            lng: crash.coordinates.lng,
            weight: this.calculateWeight(crash),
            info: {
                date: crash.date,
                severity: crash.severity,
                fatalities: crash.fatalities,
                injuries: crash.injuries,
                county: crash.county,
                cause: crash.majorCause
            }
        }));
        
        return this.geoData;
    }

    /**
     * Calculate weight for heatmap based on severity
     */
    calculateWeight(crash) {
        if (crash.fatalities > 0) return 10;
        if (crash.majorInjuries > 0) return 5;
        if (crash.injuries > 0) return 2;
        return 1;
    }

    /**
     * Get crashes by county
     */
    getCrashesByCounty() {
        const countyStats = {};
        
        this.crashData.forEach(crash => {
            const county = crash.county || 'Unknown';
            
            if (!countyStats[county]) {
                countyStats[county] = {
                    total: 0,
                    fatalities: 0,
                    injuries: 0,
                    withAlcohol: 0,
                    propertyDamageOnly: 0
                };
            }
            
            countyStats[county].total++;
            countyStats[county].fatalities += crash.fatalities;
            countyStats[county].injuries += crash.injuries;
            
            if (crash.drugAlcohol && crash.drugAlcohol !== 'None Indicated') {
                countyStats[county].withAlcohol++;
            }
            
            if (crash.severity === 'Property Damage Only') {
                countyStats[county].propertyDamageOnly++;
            }
        });
        
        return countyStats;
    }

    /**
     * Get crashes by time period
     */
    getCrashesByHour() {
        const hourStats = {};
        
        this.crashData.forEach(crash => {
            const hour = crash.time ? crash.time.split(':')[0] : 'Unknown';
            
            if (!hourStats[hour]) {
                hourStats[hour] = 0;
            }
            hourStats[hour]++;
        });
        
        return hourStats;
    }

    /**
     * Get crashes involving alcohol/drugs
     */
    getAlcoholRelatedCrashes() {
        return this.crashData.filter(crash => 
            crash.drugAlcohol && 
            crash.drugAlcohol !== 'None Indicated' &&
            crash.drugAlcohol !== 'N/A'
        );
    }

    /**
     * Get fatal crashes
     */
    getFatalCrashes() {
        return this.crashData.filter(crash => crash.fatalities > 0);
    }

    /**
     * Generate summary statistics
     */
    generateSummary() {
        const total = this.crashData.length;
        const withLocation = this.crashData.filter(c => c.hasLocation).length;
        const fatalCrashes = this.getFatalCrashes().length;
        const alcoholRelated = this.getAlcoholRelatedCrashes().length;
        const totalFatalities = this.crashData.reduce((sum, c) => sum + c.fatalities, 0);
        const totalInjuries = this.crashData.reduce((sum, c) => sum + c.injuries, 0);
        
        const summary = {
            totalCrashes: total,
            crashesWithLocation: withLocation,
            locationCoverage: ((withLocation / total) * 100).toFixed(1) + '%',
            fatalCrashes: fatalCrashes,
            totalFatalities: totalFatalities,
            totalInjuries: totalInjuries,
            alcoholRelatedCrashes: alcoholRelated,
            alcoholPercentage: ((alcoholRelated / total) * 100).toFixed(1) + '%',
            avgVehiclesPerCrash: (this.crashData.reduce((sum, c) => sum + c.vehicles, 0) / total).toFixed(2),
            propertyDamageOnly: this.crashData.filter(c => c.severity === 'Property Damage Only').length
        };
        
        console.log('\n=== Crash Data Summary ===');
        console.log(`Total Crashes: ${summary.totalCrashes.toLocaleString()}`);
        console.log(`With Location Data: ${summary.crashesWithLocation.toLocaleString()} (${summary.locationCoverage})`);
        console.log(`Fatal Crashes: ${summary.fatalCrashes.toLocaleString()}`);
        console.log(`Total Fatalities: ${summary.totalFatalities.toLocaleString()}`);
        console.log(`Total Injuries: ${summary.totalInjuries.toLocaleString()}`);
        console.log(`Alcohol/Drug Related: ${summary.alcoholRelatedCrashes.toLocaleString()} (${summary.alcoholPercentage})`);
        console.log(`Average Vehicles per Crash: ${summary.avgVehiclesPerCrash}`);
        console.log(`Property Damage Only: ${summary.propertyDamageOnly.toLocaleString()}`);
        console.log('==========================\n');
        
        return summary;
    }

    /**
     * Create sample dataset for testing (first N records)
     */
    createSample(sampleSize = 1000) {
        return this.crashData.slice(0, sampleSize);
    }
}

// Create global instance
const crashProcessor = new CrashDataProcessor();
