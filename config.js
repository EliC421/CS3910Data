/**
 * Configuration file example
 * Copy this file to config.js and add your actual API keys
 */

const CONFIG = {
    // Google Maps API Key
    googleMapsApiKey: 'AIzaSyC59MCMqdD5XZZw0NYt63Osr4AYld6wXD8',
    
    // Map configuration
    map: {
        center: {
            lat: 41.8780,
            lng: -93.0977
        },
        zoom: 7,
        minZoom: 6,
        maxZoom: 15
    },
    
    // Heatmap configuration
    heatmap: {
        radius: 20,
        opacity: 0.6,
        gradient: [
            'rgba(0, 255, 255, 0)',
            'rgba(0, 255, 255, 1)',
            'rgba(0, 191, 255, 1)',
            'rgba(0, 127, 255, 1)',
            'rgba(0, 63, 255, 1)',
            'rgba(0, 0, 255, 1)',
            'rgba(0, 0, 223, 1)',
            'rgba(0, 0, 191, 1)',
            'rgba(0, 0, 159, 1)',
            'rgba(0, 0, 127, 1)',
            'rgba(63, 0, 91, 1)',
            'rgba(127, 0, 63, 1)',
            'rgba(191, 0, 31, 1)',
            'rgba(255, 0, 0, 1)'
        ]
    },
    
    // Data file paths
    dataPaths: {
        liquor: 'data/liquor-sales.csv',
        dui: 'data/dui-charges.csv',
        offenders: 'data/sex-offenders.csv',
        alerts: 'data/amber-alerts.csv'
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
