/**
 * Data processing and correlation analysis
 * Handles CSV parsing and data transformation
 */

class DataProcessor {
    constructor() {
        this.datasets = {};
        this.processedData = {};
    }

    /**
     * Load and parse CSV file
     */
    async loadCSV(filename, datasetName) {
        try {
            const response = await fetch(`data/${filename}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} while loading data/${filename}`);
            }

            const csvText = await response.text();
            const parsedData = this.parseCSV(csvText);
            this.datasets[datasetName] = parsedData;
            return parsedData;
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return null;
        }
    }

    /**
     * Parse CSV text into array of objects
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = this.parseCSVLine(lines[i]);
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            
            data.push(row);
        }

        return data;
    }

    /**
     * Parse a single CSV line (handles quoted values)
     */
    parseCSVLine(line) {
        const values = [];
        let currentValue = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"' && nextChar === '"') {
                // Handle escaped quotes ("")
                currentValue += '"';
                i++; // Skip next quote
            } else if (char === '"') {
                // Toggle quote state
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                // End of field
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }

        values.push(currentValue);
        return values;
    }

    /**
     * Extract geographic data from dataset
     */
    extractGeoData(datasetName, latField, lngField, weightField = null) {
        const dataset = this.datasets[datasetName];
        if (!dataset) {
            console.error(`Dataset ${datasetName} not found`);
            return [];
        }

        return dataset.map(row => {
            const point = {
                lat: parseFloat(row[latField]),
                lng: parseFloat(row[lngField])
            };

            if (weightField && row[weightField]) {
                point.weight = parseFloat(row[weightField]);
            }

            return point;
        }).filter(point => !isNaN(point.lat) && !isNaN(point.lng));
    }

    /**
     * Calculate correlation between two datasets
     */
    calculateCorrelation(dataset1Name, dataset2Name, field1, field2) {
        // Placeholder for correlation analysis
        const data1 = this.datasets[dataset1Name];
        const data2 = this.datasets[dataset2Name];

        if (!data1 || !data2) {
            console.error('One or both datasets not found');
            return null;
        }

        // TODO: Implement correlation calculation
        console.log('Calculating correlation between', dataset1Name, 'and', dataset2Name);
        return {
            coefficient: 0,
            significance: 0
        };
    }

    /**
     * Aggregate data by county or region
     */
    aggregateByRegion(datasetName, regionField, valueField) {
        const dataset = this.datasets[datasetName];
        if (!dataset) return {};

        const aggregated = {};

        dataset.forEach(row => {
            const region = row[regionField];
            const value = parseFloat(row[valueField]) || 0;

            if (!aggregated[region]) {
                aggregated[region] = {
                    count: 0,
                    total: 0,
                    values: []
                };
            }

            aggregated[region].count++;
            aggregated[region].total += value;
            aggregated[region].values.push(value);
        });

        // Calculate averages
        Object.keys(aggregated).forEach(region => {
            aggregated[region].average = aggregated[region].total / aggregated[region].count;
        });

        return aggregated;
    }

    /**
     * Normalize county totals by population and return rates per 100k.
     */
    normalizeByPopulation(countyTotals, populationDatasetName, options = {}) {
        const {
            countyField = 'County',
            populationField = 'Population',
            outputRatePer = 100000
        } = options;

        const populationData = this.datasets[populationDatasetName];
        if (!populationData) {
            console.error(`Population dataset ${populationDatasetName} not found`);
            return [];
        }

        const toCountyKey = (value) => String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+county$/, '')
            .replace(/\s+/g, ' ');

        const populationByCounty = {};

        populationData.forEach(row => {
            const rawCounty = row[countyField] || row.county || row.COUNTY;
            const countyKey = toCountyKey(rawCounty);
            if (!countyKey) return;

            const population = parseFloat(
                row[populationField] || row.population || row.POPULATION
            );

            if (!Number.isFinite(population) || population <= 0) return;
            populationByCounty[countyKey] = population;
        });

        return Object.entries(countyTotals).map(([county, total]) => {
            const countyKey = toCountyKey(county);
            const population = populationByCounty[countyKey] || null;
            const numericTotal = Number(total) || 0;

            return {
                county,
                total: numericTotal,
                population,
                ratePer100k: population ? (numericTotal / population) * outputRatePer : null
            };
        });
    }
}

// Create global instance
const dataProcessor = new DataProcessor();
