/**
 * Geocoding Helper
 * Functions to help geocode Iowa addresses and locations
 */

class GeocodeHelper {
    constructor() {
        this.geocoder = null;
        this.cache = {};
        this.requestDelay = 200; // ms between requests to avoid rate limiting
    }

    /**
     * Initialize geocoder (must be called after Google Maps loads)
     */
    initialize() {
        if (typeof google !== 'undefined' && google.maps) {
            this.geocoder = new google.maps.Geocoder();
            console.log('Geocoder initialized');
        } else {
            console.error('Google Maps not loaded');
        }
    }

    /**
     * Geocode a single address
     */
    async geocodeAddress(address, city = '', county = '', state = 'Iowa') {
        // Check cache first
        const cacheKey = `${address}|${city}|${county}`.toLowerCase();
        if (this.cache[cacheKey]) {
            return this.cache[cacheKey];
        }

        if (!this.geocoder) {
            this.initialize();
        }

        // Build full address string
        const fullAddress = this.buildFullAddress(address, city, county, state);

        return new Promise((resolve, reject) => {
            this.geocoder.geocode({ address: fullAddress }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    const result = {
                        lat: location.lat(),
                        lng: location.lng(),
                        formatted: results[0].formatted_address
                    };
                    
                    // Cache result
                    this.cache[cacheKey] = result;
                    resolve(result);
                } else {
                    reject(new Error(`Geocoding failed: ${status}`));
                }
            });
        });
    }

    /**
     * Build full address string
     */
    buildFullAddress(address, city, county, state) {
        const parts = [address];
        
        if (city) parts.push(city);
        if (county && !city) parts.push(`${county} County`);
        parts.push(state);
        
        return parts.filter(p => p).join(', ');
    }

    /**
     * Geocode multiple addresses with rate limiting
     */
    async geocodeBatch(addresses, onProgress = null) {
        const results = [];
        const total = addresses.length;

        for (let i = 0; i < addresses.length; i++) {
            const addr = addresses[i];
            
            try {
                const result = await this.geocodeAddress(
                    addr.address || '',
                    addr.city || '',
                    addr.county || ''
                );
                
                results.push({
                    ...addr,
                    ...result,
                    success: true
                });
            } catch (error) {
                console.warn(`Failed to geocode: ${addr.address}`, error);
                results.push({
                    ...addr,
                    success: false,
                    error: error.message
                });
            }

            // Progress callback
            if (onProgress) {
                onProgress(i + 1, total);
            }

            // Rate limiting delay
            if (i < addresses.length - 1) {
                await this.sleep(this.requestDelay);
            }
        }

        return results;
    }

    /**
     * Get county centroid coordinates
     */
    getCountyCentroid(countyName) {
        // Iowa county centroids (approximate)
        const countyCentroids = {
            'Polk': { lat: 41.6735, lng: -93.5690 },
            'Linn': { lat: 42.0375, lng: -91.6011 },
            'Scott': { lat: 41.6104, lng: -90.6004 },
            'Johnson': { lat: 41.6611, lng: -91.5350 },
            'Black Hawk': { lat: 42.4700, lng: -92.3085 },
            'Story': { lat: 42.0367, lng: -93.4535 },
            'Dubuque': { lat: 42.4752, lng: -90.7485 },
            'Dallas': { lat: 41.6847, lng: -94.0519 },
            'Woodbury': { lat: 42.3854, lng: -96.0849 },
            'Warren': { lat: 41.3505, lng: -93.5579 },
            // Add more counties as needed
        };

        return countyCentroids[countyName] || null;
    }

    /**
     * Fallback geocoding using county
     */
    geocodeByCounty(countyName) {
        const centroid = this.getCountyCentroid(countyName);
        
        if (centroid) {
            // Add small random offset to avoid stacking points
            const offset = 0.05; // ~3 miles
            return {
                lat: centroid.lat + (Math.random() - 0.5) * offset,
                lng: centroid.lng + (Math.random() - 0.5) * offset,
                formatted: `${countyName} County, Iowa`,
                isApproximate: true
            };
        }

        return null;
    }

    /**
     * Validate Iowa coordinates
     */
    isValidIowaCoordinate(lat, lng) {
        // Iowa boundaries
        const bounds = {
            north: 43.501,
            south: 40.375,
            east: -90.140,
            west: -96.639
        };

        return lat >= bounds.south && 
               lat <= bounds.north && 
               lng >= bounds.west && 
               lng <= bounds.east;
    }

    /**
     * Sleep utility for rate limiting
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache = {};
        console.log('Geocode cache cleared');
    }
}

// Create global instance
const geocodeHelper = new GeocodeHelper();
