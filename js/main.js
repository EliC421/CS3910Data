/**
 * Main application logic
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Iowa County Insights Dashboard Loaded');
    initializeApp();
});

const DATA_LOADING_APPROACH = 'frontend-static-csv';

const DATASET_CATALOG = [
    // Note: Vehicle_Crashes_in_Iowa_20260312.csv is 323MB, too large for frontend loading
    // Using processed normalized data instead which has all aggregated metrics
    { name: 'countyNormalized', file: 'processed/county_year_normalized.csv', required: true },
    { name: 'liquorStoreYear', file: 'processed/liquor_store_year.csv', required: false }
];

const LAYER_TO_METRIC_FIELD = {
    liquorSales: 'liquor_dollars_per_100k',
    duiCharges: 'owi_probation_per_100k',
    crashes: 'impaired_crashes_per_100k',
    readingProficiency: 'median_household_income',
    mathProficiency: 'median_household_income',
    pbsServices: 'unemployment_rate'
};

const LAYER_LABELS = {
    liquorSales: 'Liquor Sales (USD per 100k residents)',
    duiCharges: 'OWI Probation (cases per 100k residents)',
    crashes: 'Impaired Crashes (cases per 100k residents)',
    readingProficiency: 'Median Household Income (reading indicator)',
    mathProficiency: 'Median Household Income (math indicator)',
    pbsServices: 'Unemployment Rate (PBS indicator)'
};

const LAYER_INTERPRETATION = {
    liquorSales: {
        displayName: 'Liquor Sales',
        format: 'currency',
        example: 'Interpretation: value is total liquor sales dollars per 100,000 residents. Example: 250000 means $250,000 per 100,000 residents.'
    },
    duiCharges: {
        displayName: 'OWI Probation',
        format: 'per100k',
        example: 'Interpretation: value is OWI probation cases per 100,000 residents. Example: 3.46 means 3.46 cases per 100,000 residents.'
    },
    crashes: {
        displayName: 'Impaired Crashes',
        format: 'per100k',
        example: 'Interpretation: value is impaired-driving crash cases per 100,000 residents. Example: 3.46 means 3.46 crashes per 100,000 residents.'
    },
    readingProficiency: {
        displayName: 'Median Household Income (reading indicator)',
        format: 'currency',
        example: 'Interpretation: this layer uses median household income as a reading indicator, not a direct reading score. Example: 63450 means $63,450 median household income.'
    },
    mathProficiency: {
        displayName: 'Median Household Income (math indicator)',
        format: 'currency',
        example: 'Interpretation: this layer uses median household income as a math indicator, not a direct math score. Example: 63450 means $63,450 median household income.'
    },
    pbsServices: {
        displayName: 'Unemployment Rate (PBS indicator)',
        format: 'percent',
        example: 'Interpretation: this layer uses unemployment as a PBS service indicator, not a direct service-count measure. Example: 3.46 means 3.46% unemployment.'
    }
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
    "literacy-pbs": {
        mapTitle: "Literacy and PBS Indicators",
        layers: [
            { id: "readingProficiency", label: "Median Household Income (reading indicator)", checked: true },
            { id: "mathProficiency", label: "Median Household Income (math indicator)", checked: false },
            { id: "pbsServices", label: "Unemployment Rate (PBS indicator)", checked: true }
        ]
    }
};

function updateLayerInterpretation(layerId) {
    const node = document.getElementById('layer-interpretation');
    if (!node) return;

    if (!layerId || !LAYER_INTERPRETATION[layerId]) {
        node.textContent = 'Interpretation: Select a layer to see units and value context.';
        return;
    }

    node.textContent = LAYER_INTERPRETATION[layerId].example;
}

/**
 * Main application state
 */
const appState = {
    activeTab: "dui-crashes",
    visibleLayers: {},
    mapLayersByMetric: {},
    crashPoints: [],
    liquorStoreLayer: { year: null, min: null, max: null, stores: [] }
};

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
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
    // Skip crash points since crashes CSV is too large to load.
    // Focus on county-level aggregated metrics from normalized CSV instead.
    appState.crashPoints = [];

    Object.entries(LAYER_TO_METRIC_FIELD).forEach(([layerId, valueField]) => {
        appState.mapLayersByMetric[layerId] = dataProcessor.toMapReadyCountyMetrics('countyNormalized', {
            valueField
        });
    });

    appState.liquorStoreLayer = dataProcessor.toMapReadyLiquorStores('liquorStoreYear', {
        valueField: 'liquor_sale_dollars',
        limit: 1200
    });
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

    updateLayerInterpretation(null);

    renderLayerControls(currentTab.layers);
    renderGraphLayerButtons(currentTab.layers);
}

function renderGraphLayerButtons(layers) {
    const controlsContainer = document.getElementById('graph-layer-controls');
    if (!controlsContainer) return;

    controlsContainer.innerHTML = '';

    layers.forEach((layer) => {
        const isOn = Boolean(appState.visibleLayers[layer.id]);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `graph-layer-chip${isOn ? ' active' : ''}`;
        button.textContent = `${layer.label}: ${isOn ? 'ON' : 'OFF'}`;

        button.addEventListener('click', () => {
            const nextValue = !Boolean(appState.visibleLayers[layer.id]);
            appState.visibleLayers[layer.id] = nextValue;

            const sidebarInput = document.querySelector(`#layer-controls input[data-layer-id="${layer.id}"]`);
            if (sidebarInput) sidebarInput.checked = nextValue;

            renderGraphLayerButtons(tabConfig[appState.activeTab].layers);
            updateMapForCurrentState();
        });

        controlsContainer.appendChild(button);
    });
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
            renderGraphLayerButtons(tabConfig[appState.activeTab].layers);
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
    const layerMeta = prioritizedLayer ? LAYER_INTERPRETATION[prioritizedLayer] : null;

    updateLayerInterpretation(prioritizedLayer);

    if (typeof updateMapLayers === 'function') {
        updateMapLayers(appState.activeTab, appState.visibleLayers, {
            selectedLayerId: prioritizedLayer,
            metricLayer,
            layerMeta,
            crashPoints: appState.crashPoints,
            liquorStoreLayer: prioritizedLayer === 'liquorSales' ? appState.liquorStoreLayer : null
        });
    }

    renderBasicGraphs(prioritizedLayer, metricLayer);
}

function getVisibleMetricLayerIds() {
    return Object.entries(appState.visibleLayers)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([layerId]) => layerId)
        .filter((layerId) => {
            const layer = appState.mapLayersByMetric[layerId];
            return Boolean(layer && layer.valuesByCounty);
        });
}

function renderCorrelationPanel() {
    if (!window.AnalyticsHelpers) {
        return '<div class="correlation-empty">Correlation helpers are unavailable.</div>';
    }

    return window.AnalyticsHelpers.renderCorrelationPanelHtml({
        layerIds: getVisibleMetricLayerIds(),
        mapLayersByMetric: appState.mapLayersByMetric,
        layerLabels: LAYER_LABELS
    });
}

function renderBasicGraphs(activeLayerId, metricLayer) {
    const container = document.getElementById('charts-container');
    if (!container) return;

    if (!activeLayerId || !metricLayer || !metricLayer.valuesByCounty) {
        container.innerHTML = '<div class="empty-charts">Select a layer to view chart summaries.</div>';
        return;
    }

    if (!window.AnalyticsHelpers) {
        container.innerHTML = '<div class="empty-charts">Graph helpers are unavailable.</div>';
        return;
    }

    container.innerHTML = window.AnalyticsHelpers.renderMetricGraphsHtml({
        activeLayerId,
        metricLayer,
        layerLabels: LAYER_LABELS,
        correlationPanelHtml: renderCorrelationPanel()
    });
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