// scripts/app.js — RVP (gray) + Hall (bright red), robust column detection with directional support
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
  function parseCoord(v, isLat = true) {
    if (v == null || v === '') return NaN;
    let s = String(v).trim().toUpperCase();
    // Remove degrees and commas
    s = s.replace(/[°,]/g, '');
    // Match number + optional direction (with spaces)
    const m = s.match(/([+-]?\d+(?:\.\d+)?)\s*([NSEW])?/);
    if (!m) return NaN;
    let num = Number(m[1]);
    const dir = (m[2] || '').toUpperCase();
    if (dir) {
      // Handle directional
      if (isLat) {
        if (dir === 'S') num = -num;
        else if (dir !== 'N') return NaN; // Invalid for lat
      } else {
        if (dir === 'W') num = -num;
        else if (dir !== 'E') return NaN; // Invalid for lon
      }
    } else {
      // No direction: assume standard (positive for N/E, but for US data, longitudes are often negative without dir—handle via swapIfNeeded if needed)
    }
    // For US-centric data without dir, assume lon is W if positive and small (common error), but rely on swapIfNeeded for sanity
    if (!isLat && num > 0 && num < 100) num = -num; // Heuristic for unsigned W longitudes in RVP/Hall
    return num;
  }
  function swapIfNeeded(lat, lon) {
    // lat should be <= 90 by magnitude; lon up to 180
    if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) return [lon, lat];
    return [lat, lon];
  }
  function inNA(lat, lon) {
    // Wider bounds for North America (includes some edge cases)
    return lat >= 15 && lat <= 55 && lon >= -130 && lon <= -50;
  }

  async function loadCsv(url) {
    const res = await fetch(url + "?v=" + Date.now(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    return parsed.data;
  }

  function findLatKey(keys) {
    const candidates = [/^(lat|latitude)$/i, /(latitude)/i, /^y$/i];
    for (const rx of candidates) {
      const k = keys.find(key => rx.test(key.trim()));
      if (k) return k;
    }
    return null;
  }
  function findLonKey(keys) {
    const candidates = [/^(lon|long|lng|longitude)$/i, /(longitude)/i, /^x$/i];
    for (const rx of candidates) {
      const k = keys.find(key => rx.test(key.trim()));
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
      let lat = parseCoord(r[latKey], true);
      let lon = parseCoord(r[lonKey], false);
      [lat, lon] = swapIfNeeded(lat, lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        console.log(`${label}: invalid coords for row`, { rawLat: r[latKey], rawLon: r[lonKey], parsed: { lat, lon } });
        return;
      }
      if (!inNA(lat, lon)) {
        console.log(`${label}: out of NA bounds for row`, { rawLat: r[latKey], rawLon: r[lonKey], parsed: { lat, lon } });
        return;
      }

      const style = {
        radius: 7, // Slightly larger for visibility
        weight: 2,
        color: stroke, fillColor: fill,
        fillOpacity: 1.0, opacity: 1.0
      };
      const popupText = (r["Property Name"] || r["Property"] || "Unknown") + (label === "HALL" ? " (Hall)" : " (RVP)");
      L.circleMarker([lat, lon], style)
        .bindPopup(popupText)
        .addTo(layer);
      count++;
      console.log(`${label}: plotted marker at`, { lat, lon, name: popupText });
    });
    console.log(`${label}: total plotted ${count} markers`);
    return count;
  }

  try {
    // Load both CSVs in parallel
    const [rvpRows, hallRows] = await Promise.all([loadCsv(RVP_CSV), loadCsv(HALL_CSV)]);

    // Clear layers before drawing
    rvpLayer.clearLayers();
    hallLayer.clearLayers();

    // Draw: RVP (gray), Hall (bright red)
    const rvpCount  = drawPoints(rvpRows,  "RVP",  rvpLayer,  "#64748b", "#334155");
    const hallCount = drawPoints(hallRows, "HALL", hallLayer, "#ff2d55", "#7f1d1d");

    // Fit to combined bounds of all valid markers (zoom to show everything)
    const group = L.featureGroup([rvpLayer, hallLayer]);
    if (group.getLayers().length > 0) {
      map.fitBounds(group.getBounds().pad(0.15)); // Pad for better view
      console.log("Map fitted to all markers");
    } else {
      console.warn("No valid points to fit bounds—using default view");
      map.setView([35.0, -85.0], 5); // Fallback to SE US
    }

    // Bring Hall (red) markers to front for visibility
    hallLayer.bringToFront();

    console.log(`Done. RVP=${rvpCount}, HALL=${hallCount}. Total markers: ${rvpCount + hallCount}`);
  } catch (e) {
    console.error("CSV load/draw failed:", e);
  }
})();
