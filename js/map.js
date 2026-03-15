function initMap() {
  console.log("initMap started");

  const map = new google.maps.Map(document.getElementById("map"), {
    mapTypeId: "terrain",
  });

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

    const card = document.getElementById("county-card");
    const title = document.getElementById("county-card-title");
    const body = document.getElementById("county-card-body");

    if (card && title && body) {
      title.textContent = countyName;
      body.textContent = "County details will appear here.";
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

window.initMap = initMap;