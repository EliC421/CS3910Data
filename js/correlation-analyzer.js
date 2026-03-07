/**
 * Correlation Analysis Tools
 * Statistical analysis for finding correlations between datasets
 */

class CorrelationAnalyzer {
    constructor() {
        this.correlations = {};
    }

    /**
     * Calculate Pearson correlation coefficient
     */
    pearsonCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0) {
            throw new Error('Arrays must have same non-zero length');
        }

        const n = x.length;
        
        // Calculate means
        const meanX = x.reduce((sum, val) => sum + val, 0) / n;
        const meanY = y.reduce((sum, val) => sum + val, 0) / n;

        // Calculate correlation
        let numerator = 0;
        let sumSqX = 0;
        let sumSqY = 0;

        for (let i = 0; i < n; i++) {
            const diffX = x[i] - meanX;
            const diffY = y[i] - meanY;
            
            numerator += diffX * diffY;
            sumSqX += diffX * diffX;
            sumSqY += diffY * diffY;
        }

        const denominator = Math.sqrt(sumSqX * sumSqY);
        
        if (denominator === 0) {
            return 0;
        }

        return numerator / denominator;
    }

    /**
     * Calculate correlation by county
     */
    correlateByCounty(dataset1, dataset2, valueField1, valueField2) {
        // Aggregate both datasets by county
        const counties1 = this.aggregateByCounty(dataset1, valueField1);
        const counties2 = this.aggregateByCounty(dataset2, valueField2);

        // Get common counties
        const commonCounties = Object.keys(counties1).filter(
            county => counties2[county] !== undefined
        );

        if (commonCounties.length < 2) {
            console.warn('Not enough common counties for correlation');
            return null;
        }

        // Extract values for correlation
        const values1 = commonCounties.map(county => counties1[county]);
        const values2 = commonCounties.map(county => counties2[county]);

        const correlation = this.pearsonCorrelation(values1, values2);

        return {
            coefficient: correlation,
            counties: commonCounties,
            n: commonCounties.length,
            strength: this.interpretCorrelation(correlation),
            data: commonCounties.map(county => ({
                county: county,
                value1: counties1[county],
                value2: counties2[county]
            }))
        };
    }

    /**
     * Aggregate data by county
     */
    aggregateByCounty(dataset, valueField) {
        const countyTotals = {};

        dataset.forEach(row => {
            const county = row.County || row.county;
            if (!county) return;

            const value = parseFloat(row[valueField]) || 0;

            if (!countyTotals[county]) {
                countyTotals[county] = 0;
            }

            countyTotals[county] += value;
        });

        return countyTotals;
    }

    /**
     * Interpret correlation strength
     */
    interpretCorrelation(r) {
        const absR = Math.abs(r);
        
        if (absR >= 0.9) return 'Very Strong';
        if (absR >= 0.7) return 'Strong';
        if (absR >= 0.5) return 'Moderate';
        if (absR >= 0.3) return 'Weak';
        return 'Very Weak';
    }

    /**
     * Calculate correlation significance (t-test)
     */
    calculateSignificance(r, n) {
        if (n <= 2) return null;

        const t = r * Math.sqrt((n - 2) / (1 - r * r));
        const df = n - 2;

        // Simplified p-value estimation
        const absT = Math.abs(t);
        let p;
        
        if (absT > 3.291) p = 0.001;
        else if (absT > 2.576) p = 0.01;
        else if (absT > 1.960) p = 0.05;
        else p = 0.1;

        return {
            tStatistic: t,
            degreesOfFreedom: df,
            pValue: p,
            significant: p < 0.05
        };
    }

    /**
     * Generate correlation report
     */
    generateReport(result, dataset1Name, dataset2Name) {
        console.log('\n=== Correlation Analysis ===');
        console.log(`Datasets: ${dataset1Name} vs ${dataset2Name}`);
        console.log(`Correlation Coefficient: ${result.coefficient.toFixed(3)}`);
        console.log(`Strength: ${result.strength}`);
        console.log(`Sample Size: ${result.n} counties`);

        const sig = this.calculateSignificance(result.coefficient, result.n);
        if (sig) {
            console.log(`t-statistic: ${sig.tStatistic.toFixed(3)}`);
            console.log(`p-value: ${sig.pValue > 0.001 ? sig.pValue.toFixed(3) : '< 0.001'}`);
            console.log(`Statistically Significant: ${sig.significant ? 'YES' : 'NO'}`);
        }

        console.log('\nTop 5 Counties by Value 1:');
        result.data
            .sort((a, b) => b.value1 - a.value1)
            .slice(0, 5)
            .forEach(d => {
                console.log(`  ${d.county}: ${d.value1.toFixed(2)} / ${d.value2.toFixed(2)}`);
            });

        console.log('============================\n');

        return result;
    }

    /**
     * Find spatial correlation (proximity-based)
     */
    spatialCorrelation(dataset1, dataset2, maxDistance = 10) {
        // maxDistance in miles
        let matches = 0;
        let total = dataset1.length;

        dataset1.forEach(point1 => {
            if (!point1.Latitude || !point1.Longitude) return;

            const nearby = dataset2.filter(point2 => {
                if (!point2.Latitude || !point2.Longitude) return false;

                const dist = this.calculateDistance(
                    point1.Latitude, point1.Longitude,
                    point2.Latitude, point2.Longitude
                );

                return dist <= maxDistance;
            });

            if (nearby.length > 0) {
                matches++;
            }
        });

        return {
            matchRate: matches / total,
            matches: matches,
            total: total,
            maxDistance: maxDistance
        };
    }

    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3959; // Earth's radius in miles
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     */
    toRad(degrees) {
        return degrees * Math.PI / 180;
    }
}

// Create global instance
const correlationAnalyzer = new CorrelationAnalyzer();
