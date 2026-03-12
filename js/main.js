/**
 * Main application logic
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Iowa Data Visualization App Loaded');
    
    // Initialize the application
    initializeApp();
});

const DATASET_CATALOG = [
    { name: 'crashes', file: 'Vehicle_Crashes_in_Iowa_20260307.csv', required: true },
    { name: 'countyPopulation', file: 'county-population.csv', required: true },
    { name: 'countyBoundaries', file: 'IowaCounties.geojson', required: true },
    { name: 'duiCharges', file: 'dui-charges.csv', required: false },
    { name: 'liquorSales', file: 'liquor-sales.csv', required: false },
    { name: 'incarceration', file: 'incarceration.csv', required: false },
    { name: 'unemploymentRate', file: 'unemployment-rate-by-county.csv', required: false },
    { name: 'medianIncome', file: 'median-household-income-by-county.csv', required: false }
];

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        // Load all datasets
        await loadAllData();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

/**
 * Load all data files
 */
async function loadAllData() {
    console.log('Loading datasets...');

    const loaded = [];
    const missing = [];

    for (const dataset of DATASET_CATALOG) {
        if (!dataset.file.toLowerCase().endsWith('.csv')) continue;

        const rows = await dataProcessor.loadCSV(dataset.file, dataset.name);
        if (rows && rows.length > 0) {
            loaded.push({
                name: dataset.name,
                file: dataset.file,
                rows: rows.length
            });
        } else {
            missing.push(dataset);
        }
    }

    if (loaded.length > 0) {
        loaded.forEach(item => {
            console.log(`Loaded ${item.name} (${item.rows.toLocaleString()} rows) from data/${item.file}`);
        });
    }

    if (missing.length > 0) {
        console.warn('Missing dataset files:');
        missing.forEach(item => {
            const label = item.required ? 'required' : 'optional';
            console.warn(`- ${item.name}: data/${item.file} (${label})`);
        });
    }
}

/**
 * Setup general event listeners
 */
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.getAttribute('href');
            scrollToSection(target);
        });
    });
}

/**
 * Smooth scroll to section
 */
function scrollToSection(selector) {
    const element = document.querySelector(selector + '-section');
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Display error message to user
 */
function displayError(message) {
    console.error(message);
    // TODO: Add user-friendly error display
}

/**
 * Display loading indicator
 */
function showLoading(isLoading) {
    // TODO: Implement loading indicator
    console.log(isLoading ? 'Loading...' : 'Loading complete');
}
