// scripts/app.js — RVP (gray) + Hall (red) with a checkbox toggle
(function () {
  // ---------- Config ----------
  // Put the exact CSV filenames/paths here (case-sensitive on GitHub Pages)
  const RVP_CSV  = "Properties%20by%20RVP%20(1).csv"; // URL-encoded space/paren
  const HALL_CSV = "Hall.csv";

  // ---------- Map ----------
  if (window.__map) { try { window.__map.remove(); } catch {} }
  const map = L.map("map").setView([33.5, -86.8], 6);
  window.__map = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  // Separate layers
  const rvpLayer  = L.layerGroup().addTo(map); // always on
  const hallLayer = L.layerGroup();            // toggled by checkbox

  // Toolbar counts helper
  const countsEl = document.getElementById("counts") || (() => {
    const el = document.createElement("span");
    el.id = "counts";
    el.style.marginLeft = "14px";
    el.style.opacity = "0.75";
    document.getElementById("toolbar")?.appendChild(el);
    return el;
  })();

  // ---------- CSV -> objects (Papa) ----------
  function loadCsv(url, label) {
    return new Promise((resolve, reject) => {
      Papa.parse(url + "?v=" + Date.now(), {
        download: true,
        header: true,          // IMPORTANT: get array of objects
        skipEmptyLines: true,
        dynamicTyping: false,  // we'll parse numbers ourselves
        complete: (res) => {
          console.log(`${label}: parsed`, { rows: res.data?.length ?? 0, errors: res.errors });
          resolve(res.data || []);
        },
        error: (err) => {
          console.error(`${label}: parse error`, err);
          reject(err);
        }
      });
    });
  }

  // ---------- Helpers ----------
  const toNum = (v) => {
    if (v == null) return NaN;
    const m = String(v).trim().match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : NaN;
  };
  const inFootprint = (lat, lon) => lat > 18 && lat < 50 && lon > -125 && lon < -60;

  // Try several common column names
  function findLatLonKeys(sampleRow, label) {
    const keys = Object.keys(sampleRow || {});
    console.log(`${label}: header keys ->`, keys);

    const tryKeys = (cands) => cands.find(k => keys.some(h => h.toLowerCase() === k.toLowerCase()))
                         || keys.find(h => cands.some(k => h.toLowerCase().includes(k.toLowerCase())));

    const latKey = tryKeys(["latitude", "lat", "y"]);
    const lonKey = tryKeys(["longitude", "long", "lng", "lon", "x"]);

    console.log(`${label}: using latKey="${latKey}", lonKey="${lonKey}"`);
    return { latKey, lonKey };
  }

  function plotRows(rows, label, layer, style) {
    if (!rows?.length) return 0;

    const { latKey, lonKey } = findLatLonKeys(rows[0], label);
    if (!latKey || !lonKey) {
      console.warn(`${label}: could not find latitude/longitude columns`);
      return 0;
    }

    let count = 0;
    rows.forEach(r => {
      const lat = toNum(r[latKey]);
      const lon = toNum(r[lonKey]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inFootprint(lat, lon)) return;

      L.circleMarker([lat, lon], style).addTo(layer);
      count++;
    });

    console.log(`${label}: plotted ${count}`);
    return count;
  }

  // ---------- Load & render ----------
  (async () => {
    try {
      const [rvpRows, hallRows] = await Promise.all([
        loadCsv(RVP_CSV,  "RVP"),
        loadCsv(HALL_CSV, "HALL")
      ]);

      const rvpCount  = plotRows(rvpRows,  "RVP",  rvpLayer,  {
        radius: 5, weight: 1.25, color: "#334155", fillColor: "#64748b", fillOpacity: 0.95, opacity: 0.95
      });

      const hallCount = plotRows(hallRows, "HALL", hallLayer, {
        radius: 7, weight: 1.5, color: "#7f1d1d", fillColor: "#ff2d55", fillOpacity: 0.95, opacity: 0.95
      });

      // Update counts in UI
      countsEl.style.color = "";
      countsEl.textContent = `(RVP: ${rvpCount}, Hall: ${hallCount})`;

      // Checkbox toggle
      const toggle = document.getElementById("toggleHall");
      function syncHall() {
        if (toggle?.checked) {
          hallLayer.addTo(map);
          hallLayer.bringToFront();
        } else {
          map.removeLayer(hallLayer);
        }
      }
      if (toggle) {
        toggle.addEventListener("change", syncHall);
        syncHall(); // set initial state
      }

      // Fit bounds to everything that exists
      const group = L.featureGroup([rvpLayer, hallLayer]);
      try { map.fitBounds(group.getBounds().pad(0.1)); } catch {}

      if (hallCount === 0) {
        console.warn("HALL plotted 0 rows. Check Hall.csv filename/path (case-sensitive) and its lat/lon column names.");
      }
    } catch (e) {
      console.error("Error loading CSVs:", e);
      countsEl.style.color = "#b91c1c";
      countsEl.textContent = "Error loading CSVs (see console)";
    }
  })();
})();

