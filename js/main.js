/**
 * Main application logic
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Iowa Data Visualization App Loaded');
    
    // Initialize the application
    initializeApp();
});

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
    // Placeholder - will be implemented when CSV files are added
    console.log('Loading datasets...');
    
    // Example loading calls:
    // await dataProcessor.loadCSV('liquor-sales.csv', 'liquor');
    // await dataProcessor.loadCSV('dui-charges.csv', 'dui');
    // await dataProcessor.loadCSV('sex-offenders.csv', 'offenders');
    // await dataProcessor.loadCSV('amber-alerts.csv', 'alerts');
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
