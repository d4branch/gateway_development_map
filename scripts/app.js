// scripts/app.js
(async function () {
  // Load both CSVs
  async function loadCsv(url) {
    const resp = await fetch(url + "?v=" + Date.now());
    const text = await resp.text();
    const rows = text.trim().split("\n").map(r => r.split(","));
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    });
  }

  const rvpData = await loadCsv("Properties by RVP (1).csv");
  const hallData = await loadCsv("Hall.csv");

  // Init map
  const map = L.map("map").setView([33.5, -86.8], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  // RVP markers (gray)
  rvpData.forEach(r => {
    const lat = parseFloat(r.Latitude);
    const lon = parseFloat(r.Longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      L.circleMarker([lat, lon], {
        radius: 5,
        color: "#555",       // border
        fillColor: "#777",   // fill
        fillOpacity: 0.8
      }).addTo(map);
    }
  });

  // Hall markers (bright red)
  hallData.forEach(r => {
    const lat = parseFloat(r.Latitude);
    const lon = parseFloat(r.Longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      L.circleMarker([lat, lon], {
        radius: 6,
        color: "#b30000",     // border
        fillColor: "#ff0000", // fill
        fillOpacity: 0.9
      }).addTo(map);
    }
  });

  console.log(`RVP plotted: ${rvpData.length}, Hall plotted: ${hallData.length}`);
})();
