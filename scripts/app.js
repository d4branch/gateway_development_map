// scripts/app.js — RVP (gray) + Hall (bright red), Hall always on top
(async function () {
  const RVP_CSV  = "Properties%20by%20RVP%20(1).csv"; // URL-encoded filename
  const HALL_CSV = "Hall.csv";

  // Map
  if (window.__map) { try { window.__map.remove(); } catch {} }
  const map = L.map("map").setView([33.5, -86.8], 6);
  window.__map = map;
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const rvpLayer  = L.layerGroup().addTo(map);
  const hallLayer = L.layerGroup().addTo(map);

  // Robust CSV load (Papa handles commas in fields)
  async function loadCsv(url) {
    const res = await fetch(url + "?v=" + Date.now(), { cache: "no-cache" });
    const txt = await res.text();
    const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true });
    return parsed.data;
  }

  // Helpers
  const num = v => {
    if (v == null) return NaN;
    const m = String(v).trim().replace(/[°,\s]/g, "").match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : NaN;
  };
  const inNA = (lat, lon) => lat > 18 && lat < 50 && lon > -125 && lon < -60;
  const latKey = keys => keys.find(k => /^(lat|latitude)$/i.test(k)) || keys.find(k => /latitude/i.test(k));
  const lonKey = keys => keys.find(k => /^(lon|long|lng|longitude)$/i.test(k)) || keys.find(k => /longitude/i.test(k));

  function draw(rows, label, layer, fill, stroke, radius) {
    if (!rows?.length) return 0;
    const keys = Object.keys(rows[0]);
    const lk = latKey(keys), ok = lonKey(keys);
    if (!lk || !ok) { console.warn(`${label}: missing lat/lon keys`, keys); return 0; }

    let count = 0;
    rows.forEach(r => {
      const lat = num(r[lk]), lon = num(r[ok]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inNA(lat, lon)) return;
      L.circleMarker([lat, lon], {
        radius, weight: 1.5, color: stroke, fillColor: fill, fillOpacity: 0.95, opacity: 0.95
      }).addTo(layer);
      count++;
    });
    console.log(`${label}: plotted ${count}`);
    return count;
  }

  try {
    // Load both CSVs
    const [rvpRows, hallRows] = await Promise.all([loadCsv(RVP_CSV), loadCsv(HALL_CSV)]);

    // 1) Draw RVP (gray) FIRST
    draw(rvpRows,  "RVP",  rvpLayer,  "#64748b", "#334155", 5);

    // 2) Draw Hall (red) SECOND, bring to front and make bigger
    draw(hallRows, "HALL", hallLayer, "#ff2d55", "#7f1d1d", 8);
    hallLayer.bringToFront();

    // Fit to bounds
    const group = L.featureGroup([rvpLayer, hallLayer]);
    try { map.fitBounds(group.getBounds().pad(0.1)); } catch {}
  } catch (e) {
    console.error("CSV plot failed:", e);
  }
})();
