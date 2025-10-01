// scripts/app.js — Fixed Leaflet for RVP (gray) + Hall (bright red), robust parsing
(function () {
  // Config
  const RVP_CSV = "Properties%20by%20RVP%20(1).csv";
  const HALL_CSV = "Hall.csv";

  // Map setup
  if (window.__map) window.__map.remove();
  const map = L.map("map").setView([33.5, -86.8], 6);
  window.__map = map;
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const rvpLayer = L.layerGroup().addTo(map);
  const hallLayer = L.layerGroup();

  const countsEl = document.getElementById("counts");

  // CSV load
  function loadCsv(url, label) {
    return fetch(url + "?v=" + Date.now())
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
        return res.text();
      })
      .then(text => Papa.parse(text, { header: true, skipEmptyLines: true }).data)
      .then(rows => {
        console.log(`${label}: loaded ${rows.length} rows`);
        return rows;
      });
  }

  // Coord parsing (handles N/S/E/W for Hall)
  function parseCoord(v, isLat) {
    if (!v) return NaN;
    let s = String(v).trim().toUpperCase().replace(/[°,]/g, '');
    const m = s.match(/(-?\d+(?:\.\d+)?)\s*([NSEW])?/);
    if (!m) return NaN;
    let num = Number(m[1]);
    const dir = m[2];
    if (dir) {
      if (isLat) num = dir === 'S' ? -num : num;
      else num = dir === 'W' ? -num : num;
    } else if (!isLat && num > 0 && num < 100) num = -num; // Heuristic for unsigned W
    return num;
  }

  function isValidNA(lat, lon) {
    return lat >= 15 && lat <= 55 && lon >= -130 && lon <= -50;
  }

  function plotLayer(rows, label, layer, fillColor, strokeColor, propKey) {
    if (!rows.length) return 0;
    const keys = Object.keys(rows[0]);
    const latKey = keys.find(k => k.toLowerCase().includes('lat') || k.toLowerCase().includes('y'));
    const lonKey = keys.find(k => k.toLowerCase().includes('lon') || k.toLowerCase().includes('x'));
    console.log(`${label}: using lat="${latKey}", lon="${lonKey}"`);

    let count = 0;
    rows.forEach(r => {
      const lat = parseCoord(r[latKey], true);
      const lon = parseCoord(r[lonKey], false);
      if (isNaN(lat) || isNaN(lon) || !isValidNA(lat, lon)) {
        console.log(`${label}: skip`, { rawLat: r[latKey], rawLon: r[lonKey], parsed: { lat, lon } });
        return;
      }
      L.circleMarker([lat, lon], {
        radius: label === 'HALL' ? 8 : 5,
        weight: 1.5,
        color: strokeColor,
        fillColor,
        fillOpacity: 1,
        opacity: 1
      }).bindPopup((r[propKey] || 'Unknown') + (label === 'HALL' ? ' (Hall)' : ' (RVP)')).addTo(layer);
      count++;
    });
    return count;
  }

  // Load & plot
  (async () => {
    try {
      const [rvpRows, hallRows] = await Promise.all([
        loadCsv(RVP_CSV, 'RVP'),
        loadCsv(HALL_CSV, 'HALL')
      ]);

      const rvpCount = plotLayer(rvpRows, 'RVP', rvpLayer, '#64748b', '#334155', 'Property');
      const hallCount = plotLayer(hallRows, 'HALL', hallLayer, '#ff2d55', '#7f1d1d', 'Property Name');

      countsEl.textContent = `(RVP: ${rvpCount}, Hall: ${hallCount})`;

      // Toggle
      const toggle = document.getElementById('toggleHall');
      function sync() {
        if (toggle.checked) {
          map.addLayer(hallLayer);
          hallLayer.bringToFront();
        } else {
          map.removeLayer(hallLayer);
        }
      }
      toggle.addEventListener('change', sync);
      sync();

      // Fit bounds
      const allLayers = L.featureGroup([rvpLayer, hallLayer]);
      if (allLayers.getLayers().length) map.fitBounds(allLayers.getBounds().pad(0.1));
      else map.setView([33, -85], 6); // Fallback SE US

      console.log(`Plotted: RVP=${rvpCount}, Hall=${hallCount}`);
    } catch (e) {
      console.error('Load error:', e);
      countsEl.style.color = '#b91c1c';
      countsEl.textContent = 'Error loading CSVs (check console)';
    }
  })();
})();
