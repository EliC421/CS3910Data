let mapInstance = null;

function normalizeCountyKey(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/,\s*IOWA\s*$/i, "")
    .replace(/\s+COUNTY\s*$/i, "")
    .replace(/\s+/g, " ");
}

function colorForValue(value, min, max) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return "#9ca3af";
  }

  if (max <= min) return "#1d4ed8";
  const ratio = (value - min) / (max - min);

  if (ratio < 0.2) return "#dbeafe";
  if (ratio < 0.4) return "#93c5fd";
  if (ratio < 0.6) return "#60a5fa";
  if (ratio < 0.8) return "#2563eb";
  return "#1e3a8a";
}

function initMap() {
  console.log("initMap started");

  const map = new google.maps.Map(document.getElementById("map"), {
    mapTypeId: "terrain",
  });

  mapInstance = map;

  map.data.setStyle({
    fillColor: "#4285F4",
    strokeColor: "#000000",
    strokeWeight: 0.75,
    fillOpacity: 0.2,
  });

  map.data.loadGeoJson("data/IowaCounties.geojson", null, function (features) {
    console.log("GeoJSON loaded");
    console.log("Feature count:", features.length);

    if (!features || !features.length) {
      console.log("No features found in GeoJSON");
      return;
    }

    const bounds = new google.maps.LatLngBounds();

    features.forEach((feature) => {
      processPoints(feature.getGeometry(), bounds);
    });

    map.fitBounds(bounds);
  });

  map.data.addListener("click", (event) => {
    const countyName =
      event.feature.getProperty("NAME") ||
      event.feature.getProperty("name") ||
      event.feature.getProperty("County") ||
      "Unknown county";
    const countyKey = normalizeCountyKey(countyName);
    const selectedLayer = window.__activeMetricLayer || null;
    const value = selectedLayer?.valuesByCounty?.[countyKey] ?? null;
    const year = selectedLayer?.year ?? null;

    const card = document.getElementById("county-card");
    const title = document.getElementById("county-card-title");
    const body = document.getElementById("county-card-body");

    if (card && title && body) {
      title.textContent = countyName;
      if (value === null) {
        body.textContent = "No metric value available for the active layer.";
      } else {
        body.textContent = year
          ? `Year ${year}: ${value.toFixed(3)}`
          : `Value: ${value.toFixed(3)}`;
      }
      card.classList.remove("hidden");
    }
  });
}

function processPoints(geometry, bounds) {
  if (geometry instanceof google.maps.LatLng) {
    bounds.extend(geometry);
  } else if (geometry instanceof google.maps.Data.Point) {
    bounds.extend(geometry.get());
  } else {
    geometry.getArray().forEach((g) => {
      processPoints(g, bounds);
    });
  }
}

function updateMapLayers(_activeTab, _visibleLayers, payload = {}) {
  if (!mapInstance) return;

  const metricLayer = payload.metricLayer || null;
  window.__activeMetricLayer = metricLayer;

  const valuesByCounty = metricLayer?.valuesByCounty || {};
  const min = metricLayer?.min;
  const max = metricLayer?.max;

  mapInstance.data.setStyle((feature) => {
    const countyName =
      feature.getProperty("NAME") ||
      feature.getProperty("name") ||
      feature.getProperty("County") ||
      "";

    const countyKey = normalizeCountyKey(countyName);
    const value = valuesByCounty[countyKey];
    const hasValue = Number.isFinite(value);

    return {
      fillColor: hasValue ? colorForValue(value, min, max) : "#9ca3af",
      strokeColor: "#111827",
      strokeWeight: 0.8,
      fillOpacity: hasValue ? 0.6 : 0.15
    };
  });
}

window.initMap = initMap;
window.updateMapLayers = updateMapLayers;