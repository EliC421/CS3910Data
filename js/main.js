/**
 * Main application logic
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Iowa Data Visualization App Loaded');
    initializeApp();
});

/**
 * Tab configuration
 */
const tabConfig = {
    "dui-crashes": {
        mapTitle: "Liquor sales, DUI charges, and crashes",
        layers: [
            { id: "liquorSales", label: "Liquor Sales", checked: true },
            { id: "duiCharges", label: "DUI Charges", checked: true },
            { id: "crashes", label: "Crashes", checked: false }
        ]
    },
    "offenders-alerts": {
        mapTitle: "Sex offenders, Amber Alerts, and incarceration",
        layers: [
            { id: "sexOffenders", label: "Sex Offenders", checked: true },
            { id: "amberAlerts", label: "Amber Alerts", checked: true },
            { id: "incarceration", label: "Incarceration Data", checked: false }
        ]
    },
    "literacy-pbs": {
        mapTitle: "Reading, math, and PBS services",
        layers: [
            { id: "readingProficiency", label: "Reading Proficiency", checked: true },
            { id: "mathProficiency", label: "Math Proficiency", checked: false },
            { id: "pbsServices", label: "PBS Services", checked: true }
        ]
    }
};

/**
 * Main application state
 */
const appState = {
    activeTab: "dui-crashes",
    visibleLayers: {}
};

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        await loadAllData();
        setupEventListeners();
        renderCurrentTabUI();
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
}

/**
 * Setup tab listeners
 */
function setupEventListeners() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const selectedTab = button.dataset.tab;
            setActiveTab(selectedTab);
        });
    });
}

/**
 * Set active tab
 */
function setActiveTab(tabKey) {
    if (!tabConfig[tabKey]) return;

    appState.activeTab = tabKey;

    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabKey);
    });

    renderCurrentTabUI();
    updateMapForCurrentState();
}

/**
 * Render current tab UI
 */
function renderCurrentTabUI() {
    const currentTab = tabConfig[appState.activeTab];
    const mapTitle = document.getElementById('map-title');

    if (mapTitle) {
        mapTitle.textContent = currentTab.mapTitle;
    }

    renderLayerControls(currentTab.layers);
}

/**
 * Render layer controls dynamically
 */
function renderLayerControls(layers) {
    const controlsContainer = document.getElementById('layer-controls');
    if (!controlsContainer) return;

    controlsContainer.innerHTML = '';
    appState.visibleLayers = {};

    layers.forEach(layer => {
        appState.visibleLayers[layer.id] = layer.checked;

        const label = document.createElement('label');
        label.className = 'layer-toggle';

        const text = document.createElement('span');
        text.textContent = layer.label;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = layer.checked;
        input.dataset.layerId = layer.id;

        input.addEventListener('change', (event) => {
            const layerId = event.target.dataset.layerId;
            appState.visibleLayers[layerId] = event.target.checked;
            updateMapForCurrentState();
        });

        label.appendChild(text);
        label.appendChild(input);
        controlsContainer.appendChild(label);
    });
}

/**
 * Update map state
 */
function updateMapForCurrentState() {
    console.log('Active tab:', appState.activeTab);
    console.log('Visible layers:', appState.visibleLayers);

    if (typeof updateMapLayers === 'function') {
        updateMapLayers(appState.activeTab, appState.visibleLayers);
    }
}

/**
 * Display error message to user
 */
function displayError(message) {
    console.error(message);
}

/**
 * Display loading indicator
 */
function showLoading(isLoading) {
    console.log(isLoading ? 'Loading...' : 'Loading complete');
}