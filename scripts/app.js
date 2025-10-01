// scripts/app.js — Hall (bright red) with toggle, focusing on Hall.csv only
(function () {
  // ---------- Config ----------
  const HALL_CSV = "Hall.csv";

  // ---------- Map ----------
  if (window.__map) { try { window.__map.remove(); } catch {} }
  const map = L.map("map").setView([33.5, -86.8], 6); // Default to SE US
  window.__map = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  // Hall layer (toggled by checkbox)
  const hallLayer = L.layerGroup();

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
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
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
  const toNum = (v, isLat = true) => {
    if (v == null || v === '') return NaN;
    let s = String(v).trim().toUpperCase();
    // Remove degrees and commas
    s = s.replace(/[°,]/g, '');
    const m = s.match(/([+-]?\d+(?:\.\d+)?)\s*([NSEW])?/);
    if (!m) return NaN;
    let num = Number(m[1]);
    const dir = (m[2] || '').toUpperCase();
    if (dir) {
      if (isLat) {
        if (dir === 'S') num = -num;
        else if (dir !== 'N') return NaN; // Invalid for latitude
      } else {
        if (dir === 'W') num = -num;
        else if (dir !== 'E') return NaN; // Invalid for longitude
      }
    }
    return num;
  };

  const inFootprint = (lat, lon) => lat >= 15 && lat <= 55 && lon >= -130 && lon <= -50; // Wider NA bounds

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
      const lat = toNum(r[latKey], true);
      const lon = toNum(r[lonKey], false);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inFootprint(lat, lon)) {
        console.log(`${label}: skipped row`, { rawLat: r[latKey], rawLon: r[lonKey], parsed: { lat, lon } });
        return;
      }

      L.circleMarker([lat, lon], style)
        .bindPopup(r["Property Name"] || "Unknown")
        .addTo(layer);
      count++;
    });

    console.log(`${label}: plotted ${count}`);
    return count;
  }

  // ---------- Load & render ----------
  (async () => {
    try {
      const hallRows = await loadCsv(HALL_CSV, "HALL");

      const hallCount = plotRows(hallRows, "HALL", hallLayer, {
        radius: 10, // Larger for visibility
        weight: 2,
        color: "#7f1d1d", // Dark red outline
        fillColor: "#ff2d55", // Bright red fill
        fillOpacity: 1.0,
        opacity: 1.0
      });

      // Update counts in UI
      countsEl.style.color = "";
      countsEl.textContent = `(Hall: ${hallCount})`;

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
        syncHall(); // Set initial state
      }

      // Fit bounds to Hall markers
      const group = L.featureGroup([hallLayer]);
      if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds().pad(0.15));
        console.log("Map fitted to Hall markers");
      } else {
        console.warn("No valid Hall points to fit bounds—using default view");
        map.setView([33.0, -85.0], 6); // Fallback to Alabama/Georgia area
      }

      if (hallCount === 0) {
        console.warn("HALL plotted 0 rows. Check Hall.csv filename/path (case-sensitive) and its lat/lon column names.");
      }
    } catch (e) {
      console.error("Error loading Hall.csv:", e);
      countsEl.style.color = "#b91c1c";
      countsEl.textContent = "Error loading Hall.csv (see console)";
    }
  })();
})();
