// scripts/app.js — RVP layer + Hall layer with toggle + diagnostics
(async function () {
  const RVP_CSV  = "Properties%20by%20RVP%20(1).csv"; // URL-encoded ok
  const HALL_CSV = "Hall.csv";                         // case-sensitive on Pages

  // --- UI helpers -----------------------------------------------------------
  function ensureCountsSpan() {
    let span = document.getElementById("counts");
    if (!span) {
      const tb = document.getElementById("toolbar");
      span = document.createElement("span");
      span.id = "counts";
      span.style.marginLeft = "14px";
      span.style.opacity = "0.75";
      tb.appendChild(span);
    }
    return span;
  }
  const countsSpan = ensureCountsSpan();

  // --- Map ------------------------------------------------------------------
  if (window.__map) { try { window.__map.remove(); } catch {} }
  const map = L.map("map").setView([33.5, -86.8], 6);
  window.__map = map;
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const rvpLayer  = L.layerGroup().addTo(map);
  const hallLayer = L.layerGroup().addTo(map);

  // --- CSV loader -----------------------------------------------------------
  async function loadCsv(url, label) {
    const res = await fetch(url + "?v=" + Date.now(), { cache: "no-cache" });
    console.log(`${label}: fetch ${url} -> ${res.status} ${res.statusText}`);
    if (!res.ok) {
      console.error(`${label}: failed to fetch ${url}`);
      return [];
    }
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    return parsed.data || [];
  }

  // --- parsing helpers ------------------------------------------------------
  const toNum = v => {
    if (v == null) return NaN;
    const m = String(v).trim().replace(/[°,\s]/g, "").match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : NaN;
  };
  const inNA = (lat, lon) => lat > 18 && lat < 50 && lon > -125 && lon < -60;

  function pickKey(keys, regexes) {
    for (const rx of regexes) {
      const k = keys.find(key => rx.test(key));
      if (k) return k;
    }
    return null;
  }

  function findLatLonKeys(sampleRow, label) {
    const keys = Object.keys(sampleRow || {});
    console.log(`${label}: header keys ->`, keys);
    const latKey = pickKey(keys, [
      /^(lat|latitude)$/i, /latitude/i, /^y$/i
    ]);
    const lonKey = pickKey(keys, [
      /^(lon|long|lng|longitude)$/i, /longitude/i, /^x$/i
    ]);
    console.log(`${label}: using latKey="${latKey}", lonKey="${lonKey}"`);
    return { latKey, lonKey };
  }

  function draw(rows, label, layer, style) {
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
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inNA(lat, lon)) return;
      L.circleMarker([lat, lon], style).addTo(layer);
      count++;
    });
    console.log(`${label}: plotted ${count}`);
    return count;
  }

  try {
    // Load both datasets
    const [rvpRows, hallRows] = await Promise.all([
      loadCsv(RVP_CSV,  "RVP"),
      loadCsv(HALL_CSV, "HALL")
    ]);

    // Draw RVP (always on)
    const rvpCount = draw(rvpRows, "RVP", rvpLayer, {
      radius: 5, weight: 1.25, color: "#334155", fillColor: "#64748b", fillOpacity: 0.95, opacity: 0.95
    });

    // Draw Hall (toggleable, larger)
    const hallCount = draw(hallRows, "HALL", hallLayer, {
      radius: 7, weight: 1.5, color: "#7f1d1d", fillColor: "#ff2d55", fillOpacity: 0.95, opacity: 0.95
    });
    hallLayer.bringToFront();

    // Fit bounds if anything exists
    const group = L.featureGroup([rvpLayer, hallLayer]);
    try { map.fitBounds(group.getBounds().pad(0.1)); } catch {}

    // Wire checkbox
    const box = document.getElementById("toggleHall");
    const warn = (msg) => { countsSpan.style.color = "#b45309"; countsSpan.textContent = msg; };
    countsSpan.style.color = "";
    countsSpan.textContent = `(RVP: ${rvpCount}, Hall: ${hallCount})`;

    function syncHall() {
      if (box.checked) {
        map.addLayer(hallLayer);
        hallLayer.bringToFront();
      } else {
        map.removeLayer(hallLayer);
      }
    }
    box.addEventListener("change", syncHall);
    syncHall();

    if (hallCount === 0) {
      warn("Hall: 0 plotted — check Hall.csv path/name and lat/long headers.");
      console.warn("If Hall is 0: confirm case-sensitive filename 'Hall.csv' in the repo root and open it directly in the browser to verify it’s served.");
    }
  } catch (e) {
    console.error("CSV plot failed:", e);
    countsSpan.style.color = "#b91c1c";
    countsSpan.textContent = "Error loading CSVs (see console).";
  }
})();
