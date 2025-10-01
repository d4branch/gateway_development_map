// scripts/app.js - simple dual CSV plot

(async function () {
  // Helper: load CSV text and parse into objects
  async function loadCsv(url) {
    const resp = await fetch(url);
    const text = await resp.text();
    const rows = text.split(/\r?\n/).filter(r => r.trim().length > 0);
    const headers = rows[0].split(",").map(h => h.trim());
    return rows.slice(1).map(r => {
      const cols = r.split(",");
      const obj = {};
      headers.forEach((h, i) => obj[h] = (cols[i] || "").trim());
      return obj;
    });
  }

  function parseNumber(v) {
    const n = Number(v);
    return isFinite(n) ? n : null;
  }

  // Load both files
  const rvp = await loadCsv("Properties by RVP (1).csv");
  const hall = await loadCsv("Hall.csv");

  // Map setup
  const map = L.map("map").setView([33.5, -86.8], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  // Plot Properties by RVP in gray
  rvp.forEach(r => {
    const lat = parseNumber(r.Latitude || r.LATITUDE || r.lat);
    const lon = parseNumber(r.Longitude || r.LONGITUDE || r.lon);
    if (lat && lon) {
      L.circleMarker([lat, lon], {
        radius: 6,
        color: "#555",
        fillColor: "#555",
        fillOpacity: 0.8
      }).addTo(map);
    }
  });

  // Plot Hall in red
  hall.forEach(r => {
    const lat = parseNumber(r.Latitude || r.LATITUDE || r.lat);
    const lon = parseNumber(r.Longitude || r.LONGITUDE || r.lon);
    if (lat && lon) {
      L.circleMarker([lat, lon], {
        radius: 6,
        color: "#f00",
        fillColor: "#f00",
        fillOpacity: 0.9
      }).addTo(map);
    }
  });

})();
