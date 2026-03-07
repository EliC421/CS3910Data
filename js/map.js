/**
 * Map initialization and management
 */

let map;
let heatmaps = {};
let markers = {};

/**
 * Initialize Google Map
 */
function initMap() {
    // Center on Iowa
    const iowaCenter = { lat: 41.8780, lng: -93.0977 };
    
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 7,
        center: iowaCenter,
        mapTypeId: 'roadmap',
        styles: getMapStyles()
    });

    // Initialize event listeners for toggles
    initMapControls();
    
    // Load initial data
    loadMapData();
}

/**
 * Get custom map styles
 */
function getMapStyles() {
    return [
        {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
        }
    ];
}

/**
 * Initialize map control event listeners
 */
function initMapControls() {
    document.getElementById('toggle-liquor').addEventListener('change', (e) => {
        toggleLayer('liquor', e.target.checked);
    });
    
    document.getElementById('toggle-dui').addEventListener('change', (e) => {
        toggleLayer('dui', e.target.checked);
    });
    
    document.getElementById('toggle-offenders').addEventListener('change', (e) => {
        toggleLayer('offenders', e.target.checked);
    });
    
    document.getElementById('toggle-alerts').addEventListener('change', (e) => {
        toggleLayer('alerts', e.target.checked);
    });
}

/**
 * Load map data from processed sources
 */
async function loadMapData() {
    try {
        // Placeholder - will be implemented with actual data
        console.log('Loading map data...');
        
        // Example: Create sample heatmap layer
        // This will be replaced with actual data processing
        createHeatmapLayer('liquor', []);
        createHeatmapLayer('dui', []);
    } catch (error) {
        console.error('Error loading map data:', error);
    }
}

/**
 * Create a heatmap layer
 */
function createHeatmapLayer(layerName, data) {
    const heatmapData = data.map(point => {
        return {
            location: new google.maps.LatLng(point.lat, point.lng),
            weight: point.weight || 1
        };
    });
    
    heatmaps[layerName] = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: map,
        radius: 20,
        opacity: 0.6
    });
}

/**
 * Toggle visibility of a data layer
 */
function toggleLayer(layerName, isVisible) {
    if (heatmaps[layerName]) {
        heatmaps[layerName].setMap(isVisible ? map : null);
    }
    if (markers[layerName]) {
        markers[layerName].forEach(marker => {
            marker.setMap(isVisible ? map : null);
        });
    }
}

/**
 * Create marker for a data point
 */
function createMarker(position, title, info) {
    const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: title
    });
    
    const infoWindow = new google.maps.InfoWindow({
        content: info
    });
    
    marker.addListener('click', () => {
        infoWindow.open(map, marker);
    });
    
    return marker;
}
