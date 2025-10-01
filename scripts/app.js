// scripts/app.js — RVP (gray) + Hall (bright red), robust column detection
(async function () {
  // ---------- CONFIG: adjust if you move files ----------
  const RVP_CSV  = "Properties%20by%20RVP%20(1).csv";  // URL-encoded filename
  const HALL_CSV = "Hall.csv";

  // ---------- Leaflet map ----------
  if (window.__map) { try { window.__map.remove(); } catch {} }
  const map = L.map("map").setView([33.5, -86.8], 6);
  window.__map = map;
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  const rvpLayer  = L.layerGroup().addTo(map);
  const hallLayer = L.layerGroup().addTo(map);

  // ---------- utilities ----------
  function toNum(v) {
    if (v == null) return NaN;
    // remove degree signs, commas, spaces; keep leading minus and decimal
    const m = String(v).trim().replace(/[°,\s]/g, "").match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : NaN;
  }
  function swapIfNeeded(lat, lon) {
    // lat should be <= 90 by magnitude; lon can be up to 180
    if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) return [lon, lat];
    return [lat, lon];
  }
  function inNA(lat, lon) {
    // gentle sanity bounds (NA-ish). Loosen if needed.
    return lat > 18 && lat < 50 && lon > -125 && lon < -60;
  }

  async function loadCsv(url) {
    const res = await fetch(url + "?v=" + Date.now(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const text = await res.text();
    // Use Papa for reliable CSV parsing (handles commas in fields)
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    return parsed.data;
  }

  function findLatKey(keys) {
    // Try common latitude keys
    const candidates = [
      /^(lat|latitude)$/i,
      /(latitude)/i,
      /^y$/i
    ];
    for (const rx of candidates) {
      const k = keys.find(key => rx.test(key));
      if (k) return k;
    }
    return null;
  }
  function findLonKey(keys) {
    const candidates = [
      /^(lon|long|lng|longitude)$/i,
      /(longitude)/i,
      /^x$/i
    ];
    for (const rx of candidates) {
      const k = keys.find(key => rx.test(key));
      if (k) return k;
    }
    return null;
  }

  function drawPoints(rows, label, layer, fill, stroke) {
    if (!rows || !rows.length) {
      console.warn(`${label}: no rows`);
      return 0;
    }
    const keys = Object.keys(rows[0] ?? {});
    const latKey = findLatKey(keys);
    const lonKey = findLonKey(keys);
    console.log(`${label}: keys`, keys);
    console.log(`${label}: using latKey="${latKey}", lonKey="${lonKey}"`);

    if (!latKey || !lonKey) {
      console.error(`${label}: could not find latitude/longitude columns`);
      return 0;
    }

    let count = 0;
    rows.forEach(r => {
      let lat = toNum(r[latKey]);
      let lon = toNum(r[lonKey]);
      [lat, lon] = swapIfNeeded(lat, lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      if (!inNA(lat, lon)) return;

      const style = {
        radius: 6, weight: 1,
        color: stroke, fillColor: fill,
        fillOpacity: 0.95, opacity: 0.95
      };
      L.circleMarker([lat, lon], style).addTo(layer);
      count++;
    });
    console.log(`${label}: plotted ${count} markers`);
    return count;
  }

  try {
    // Load both CSVs in parallel
    const [rvpRows, hallRows] = await Promise.all([loadCsv(RVP_CSV), loadCsv(HALL_CSV)]);

    // Draw: RVP (gray), Hall (bright red)
    const rvpCount  = drawPoints(rvpRows,  "RVP",  rvpLayer,  "#64748b", "#334155");
    const hallCount = drawPoints(hallRows, "HALL", hallLayer, "#ff2d55", "#7f1d1d");

    // Fit to combined bounds if we drew anything
    const group = L.featureGroup([rvpLayer, hallLayer]);
    try { map.fitBounds(group.getBounds().pad(0.1)); } catch {}

    // quick visual: bring Hall on top
    hallLayer.bringToFront();

    console.log(`Done. RVP=${rvpCount}, HALL=${hallCount}`);
  } catch (e) {
    console.error("CSV load/draw failed:", e);
  }
})();
