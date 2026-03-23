/**
 * Data processing and correlation analysis
 * Handles CSV parsing and data transformation
 */

class DataProcessor {
    constructor() {
        this.datasets = {};
        this.processedData = {};
    }

    normalizeCountyKey(value) {
        return String(value || '')
            .trim()
            .toUpperCase()
            .replace(/,\s*IOWA\s*$/i, '')
            .replace(/\s+COUNTY\s*$/i, '')
            .replace(/\s+/g, ' ');
    }

    toNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        const numeric = Number(String(value).replace(/,/g, '').trim());
        return Number.isFinite(numeric) ? numeric : null;
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
        const data1 = this.datasets[dataset1Name];
        const data2 = this.datasets[dataset2Name];

        if (!data1 || !data2) {
            console.error('One or both datasets not found');
            return null;
        }

        const countyFieldCandidates = ['county', 'County', 'COUNTY', 'county_name', 'County Name'];
        const findCountyField = (row) => countyFieldCandidates.find((key) => key in row);

        const countyField1 = findCountyField(data1[0] || {});
        const countyField2 = findCountyField(data2[0] || {});

        if (!countyField1 || !countyField2) {
            console.error('Unable to locate county fields for correlation');
            return null;
        }

        const indexByCounty = (rows, countyField, valueField) => {
            const values = {};
            rows.forEach((row) => {
                const countyKey = this.normalizeCountyKey(row[countyField]);
                const numeric = this.toNumber(row[valueField]);
                if (!countyKey || numeric === null) return;
                values[countyKey] = numeric;
            });
            return values;
        };

        const values1 = indexByCounty(data1, countyField1, field1);
        const values2 = indexByCounty(data2, countyField2, field2);

        const sharedCounties = Object.keys(values1).filter((county) => county in values2);
        if (sharedCounties.length < 3) {
            console.warn('Not enough shared county values to compute correlation');
            return null;
        }

        const x = sharedCounties.map((county) => values1[county]);
        const y = sharedCounties.map((county) => values2[county]);

        const mean = (arr) => arr.reduce((sum, v) => sum + v, 0) / arr.length;
        const meanX = mean(x);
        const meanY = mean(y);

        let numerator = 0;
        let denomX = 0;
        let denomY = 0;

        for (let i = 0; i < x.length; i++) {
            const dx = x[i] - meanX;
            const dy = y[i] - meanY;
            numerator += dx * dy;
            denomX += dx * dx;
            denomY += dy * dy;
        }

        const denominator = Math.sqrt(denomX * denomY);
        const coefficient = denominator === 0 ? 0 : numerator / denominator;

        const abs = Math.abs(coefficient);
        let strength = 'weak';
        if (abs >= 0.7) strength = 'strong';
        else if (abs >= 0.4) strength = 'moderate';

        return {
            coefficient,
            sampleSize: sharedCounties.length,
            strength,
            pairs: sharedCounties.map((county) => ({
                county,
                x: values1[county],
                y: values2[county]
            }))
        };
    }

    parsePointWkt(value) {
        const match = String(value || '').match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/i);
        if (!match) return null;

        const lng = Number(match[1]);
        const lat = Number(match[2]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        return { lat, lng };
    }

    toMapReadyCrashPoints(datasetName, options = {}) {
        const {
            countyField = 'County Name',
            locationField = 'Location',
            severityField = 'Crash Severity',
            fatalitiesField = 'Number of Fatalities',
            injuriesField = 'Number of Injuries',
            limit = 5000
        } = options;

        const dataset = this.datasets[datasetName];
        if (!dataset) return [];

        const points = [];
        for (const row of dataset) {
            if (points.length >= limit) break;

            const point = this.parsePointWkt(row[locationField]);
            if (!point) continue;

            points.push({
                county: row[countyField] || 'Unknown',
                lat: point.lat,
                lng: point.lng,
                severity: row[severityField] || 'Unknown',
                fatalities: this.toNumber(row[fatalitiesField]) || 0,
                injuries: this.toNumber(row[injuriesField]) || 0
            });
        }

        return points;
    }

    toMapReadyCountyMetrics(datasetName, options = {}) {
        const {
            yearField = 'year',
            countyField = 'county',
            valueField,
            preferredYear = null
        } = options;

        const dataset = this.datasets[datasetName];
        if (!dataset || !valueField) {
            return {
                year: null,
                min: null,
                max: null,
                valuesByCounty: {}
            };
        }

        const years = dataset
            .map((row) => this.toNumber(row[yearField]))
            .filter((year) => Number.isFinite(year));

        const activeYear = preferredYear && years.includes(preferredYear)
            ? preferredYear
            : Math.max(...years);

        const valuesByCounty = {};
        let min = Infinity;
        let max = -Infinity;

        dataset.forEach((row) => {
            const year = this.toNumber(row[yearField]);
            if (year !== activeYear) return;

            const countyKey = this.normalizeCountyKey(row[countyField]);
            const value = this.toNumber(row[valueField]);
            if (!countyKey || value === null) return;

            valuesByCounty[countyKey] = value;
            if (value < min) min = value;
            if (value > max) max = value;
        });

        return {
            year: Number.isFinite(activeYear) ? activeYear : null,
            min: Number.isFinite(min) ? min : null,
            max: Number.isFinite(max) ? max : null,
            valuesByCounty
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
