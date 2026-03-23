/**
 * Main application logic
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Iowa Data Visualization App Loaded');
    initializeApp();
});

const DATA_LOADING_APPROACH = 'frontend-static-csv';

const DATASET_CATALOG = [
    { name: 'crashes', file: 'Vehicle_Crashes_in_Iowa_20260312.csv', required: true },
    { name: 'countyNormalized', file: 'processed/county_year_normalized.csv', required: true }
];

const LAYER_TO_METRIC_FIELD = {
    liquorSales: 'liquor_dollars_per_100k',
    duiCharges: 'owi_probation_per_100k',
    crashes: 'impaired_crashes_per_100k',
    incarceration: 'owi_reincarcerated',
    readingProficiency: 'median_household_income',
    mathProficiency: 'median_household_income',
    pbsServices: 'unemployment_rate'
};

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
    visibleLayers: {},
    mapLayersByMetric: {},
    crashPoints: []
};

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        const loadingApproachNode = document.getElementById('data-loading-approach');
        if (loadingApproachNode) {
            loadingApproachNode.textContent = DATA_LOADING_APPROACH;
        }

        await loadAllData();
        buildMapReadyData();
        setupEventListeners();
        renderCurrentTabUI();
        updateMapForCurrentState();
        console.log('Application initialized successfully');
    } catch (error) {
        displayError(`Initialization failed: ${error.message}`);
    }
}

/**
 * Load all data files
 */
async function loadAllData() {
    console.log('Loading datasets using strategy:', DATA_LOADING_APPROACH);
    showLoading(true);

    const failures = [];

    try {
        for (const dataset of DATASET_CATALOG) {
            const rows = await dataProcessor.loadCSV(dataset.file, dataset.name);
            if (!rows || rows.length === 0) {
                failures.push(dataset);
                continue;
            }

            console.log(`Loaded ${dataset.name}: ${rows.length.toLocaleString()} rows`);
        }

        const requiredFailures = failures.filter((entry) => entry.required);
        if (requiredFailures.length > 0) {
            const missing = requiredFailures.map((entry) => entry.file).join(', ');
            throw new Error(`Required datasets missing or empty: ${missing}`);
        }
    } finally {
        showLoading(false);
    }
}

function buildMapReadyData() {
    appState.crashPoints = dataProcessor.toMapReadyCrashPoints('crashes', { limit: 8000 });

    Object.entries(LAYER_TO_METRIC_FIELD).forEach(([layerId, valueField]) => {
        appState.mapLayersByMetric[layerId] = dataProcessor.toMapReadyCountyMetrics('countyNormalized', {
            valueField
        });
    });

    window.__mapReadyData = {
        crashPoints: appState.crashPoints,
        layers: appState.mapLayersByMetric
    };
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
    const activeLayerIds = Object.entries(appState.visibleLayers)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([layerId]) => layerId);

    const prioritizedLayer = activeLayerIds.find((layerId) => layerId in LAYER_TO_METRIC_FIELD) || null;
    const metricLayer = prioritizedLayer ? appState.mapLayersByMetric[prioritizedLayer] : null;

    if (typeof updateMapLayers === 'function') {
        updateMapLayers(appState.activeTab, appState.visibleLayers, {
            selectedLayerId: prioritizedLayer,
            metricLayer,
            crashPoints: appState.crashPoints
        });
    }
}

/**
 * Display error message to user
 */
function displayError(message) {
    console.error(message);

    const banner = document.getElementById('error-banner');
    if (!banner) return;

    banner.textContent = message;
    banner.classList.remove('hidden');
}

/**
 * Display loading indicator
 */
function showLoading(isLoading) {
    const indicator = document.getElementById('loading-indicator');
    if (!indicator) return;

    indicator.classList.toggle('hidden', !isLoading);
}