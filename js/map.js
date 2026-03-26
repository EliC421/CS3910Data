let mapInstance = null;
let liquorStoreOverlays = [];

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

function quantileBreaks(values, bucketCount = 5) {
  const sorted = values.slice().sort((a, b) => a - b);
  if (sorted.length === 0) return [];

  const breaks = [];
  for (let i = 1; i < bucketCount; i++) {
    const idx = Math.floor((i * sorted.length) / bucketCount);
    breaks.push(sorted[Math.min(sorted.length - 1, idx)]);
  }

  while (breaks.length < bucketCount - 1) {
    breaks.push(sorted[sorted.length - 1]);
  }

  return breaks;
}

function colorForQuantile(value, breaks) {
  if (!Number.isFinite(value)) return "#e5e7eb";
  if (value <= 0) return "#eff6ff";

  if (value <= breaks[0]) return "#dbeafe";
  if (value <= breaks[1]) return "#93c5fd";
  if (value <= breaks[2]) return "#60a5fa";
  if (value <= breaks[3]) return "#2563eb";
  return "#1e3a8a";
}

function isSkewed(values) {
  if (!values.length) return false;
  const sorted = values.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const max = sorted[sorted.length - 1] || 0;
  return max > 0 && (max / Math.max(median, 1e-9)) >= 8;
}

function clearLiquorStoreOverlays() {
  liquorStoreOverlays.forEach((overlay) => overlay.setMap(null));
  liquorStoreOverlays = [];
}

function renderLiquorStoreOverlays(storeLayer) {
  clearLiquorStoreOverlays();
  if (!mapInstance || !storeLayer || !Array.isArray(storeLayer.stores) || storeLayer.stores.length === 0) return;

  const min = Number.isFinite(storeLayer.min) ? storeLayer.min : 0;
  const max = Number.isFinite(storeLayer.max) ? storeLayer.max : 1;
  const span = Math.max(max - min, 1);

  storeLayer.stores.forEach((store) => {
    const ratio = Math.min(1, Math.max(0, (store.saleDollars - min) / span));
    const radiusMeters = 60 + ratio * 240;
    const fillOpacity = 0.25 + ratio * 0.45;

    const circle = new google.maps.Circle({
      map: mapInstance,
      center: { lat: store.lat, lng: store.lng },
      radius: radiusMeters,
      fillColor: "#b91c1c",
      fillOpacity,
      strokeColor: "#7f1d1d",
      strokeWeight: 0.6,
      clickable: true
    });

    circle.addListener("click", () => {
      const card = document.getElementById("county-card");
      const title = document.getElementById("county-card-title");
      const body = document.getElementById("county-card-body");

      if (card && title && body) {
        title.textContent = store.storeName || "Liquor Store";
        body.textContent = `Year ${storeLayer.year || "N/A"} · $${Number(store.saleDollars || 0).toLocaleString()} · ${store.city || ""} ${store.county ? `(${store.county})` : ""}`;
        card.classList.remove("hidden");
      }
    });

    liquorStoreOverlays.push(circle);
  });
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
  const selectedLayerId = payload.selectedLayerId || null;
  const liquorStoreLayer = payload.liquorStoreLayer || null;
  window.__activeMetricLayer = metricLayer;

  const valuesByCounty = metricLayer?.valuesByCounty || {};
  const min = metricLayer?.min;
  const max = metricLayer?.max;

  const finiteValues = Object.values(valuesByCounty).filter((value) => Number.isFinite(value));
  const useQuantiles = selectedLayerId === "incarceration" || isSkewed(finiteValues);
  const breaks = useQuantiles ? quantileBreaks(finiteValues, 5) : [];

  mapInstance.data.setStyle((feature) => {
    const countyName =
      feature.getProperty("NAME") ||
      feature.getProperty("name") ||
      feature.getProperty("County") ||
      "";

    const countyKey = normalizeCountyKey(countyName);
    const value = valuesByCounty[countyKey];
    const hasValue = Number.isFinite(value);
    const fillColor = !hasValue
      ? "#e5e7eb"
      : (useQuantiles ? colorForQuantile(value, breaks) : colorForValue(value, min, max));

    return {
      fillColor,
      strokeColor: "#111827",
      strokeWeight: 0.8,
      fillOpacity: hasValue ? 0.6 : 0.15
    };
  });

  if (selectedLayerId === "liquorSales" && liquorStoreLayer && liquorStoreLayer.stores?.length) {
    renderLiquorStoreOverlays(liquorStoreLayer);
  } else {
    clearLiquorStoreOverlays();
  }
}

window.initMap = initMap;
window.updateMapLayers = updateMapLayers;