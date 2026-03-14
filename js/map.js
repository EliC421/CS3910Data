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
        styles: getMapStyles(),
    });
    
    // Load initial data
    loadMapData();
    loadCountyBoundaries();
}

/** I tried to get Iowa to fill up more of the map  */
async function loadCountyBoundaries() {
    try {
        const response = await fetch('data/IowaCounties.geojson');
        const geojson = await response.json();

        map.data.addGeoJson(geojson);

        map.data.setStyle({
            fillColor: '#f8f8f8',
            fillOpacity: 0.25,
            strokeColor: '#222',
            strokeWeight: 2.6
        });
    } catch (error) {
        console.error('Error loading Iowa county boundaries:', error);
    }
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
