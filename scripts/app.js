// scripts/app.js — plot two CSVs: RVP (gray) + Hall (bright red)
(async function () {
  // 0) filenames (adjust path if you put them in /data)
  // NOTE: spaces must be URL-encoded (%20). Parens are fine.
  const RVP_CSV  = "Properties%20by%20RVP%20(1).csv";
  const HALL_CSV = "Hall.csv";

  // 1) Map
  if (window.__map) { try { window.__map.remove(); } catch {} }
  const map = L.map("map").setView([33.5, -86.8], 6);
  window.__map = map;
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  const rvpLayer  = L.layerGroup().addTo(map);
  const hallLayer = L.layerGroup().addTo(map);

  // 2) helpers
  const isFiniteNum = n => Number.isFinite(n);
  const guessLatKey = keys => keys.find(k => /(^|\s|_)(lat|latitude)(\s|_|$)/i.test(k));
  const guessLonKey = keys => keys.find(k => /(^|\s|_)(lon|long|longitude)(\s|_|$)/i.test(k));
  const guessNameKey= keys => keys.find(k => /(property\s*name|property|title)/i.test(k)) || "Property";

  function toNum(v) {
    if (v == null) return NaN;
    const s = String(v).trim().replace(/[°,\s]/g, "");
    const m = s.match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : NaN;
  }
  function swapIfNeeded(lat, lon) {
    if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) return [lon, lat];
    return [lat, lon];
  }
  function boundsOK(lat, lon) {
    // mild sanity bounds for North America; loosen if needed
    return (lat > 18 && lat < 50 && lon > -125 && lon < -60);
  }

  async function loadCsv(url) {
    const res = await fetch(url + "?v=" + Date.now(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    return parsed.data;
  }

  function drawPoints(rows, layer, colorFill, colorStroke) {
    if (!rows || !rows.length) return;
    const keys = Object.keys(rows[0] || {});
    const latKey = guessLatKey(keys);
    const lonKey = guessLonKey(keys);
    const nameKey = guessNameKey(keys);

    rows.forEach(r => {
      let lat = toNum(r[latKey]);
      let lon = toNum(r[lonKey]);
      [lat, lon] = swapIfNeeded(lat, lon);
      if (!isFiniteNum(lat) || !isFiniteNum(lon) || !boundsOK(lat, lon)) return;

      const name = r[nameKey] || "";
      const city = r.City || r.CITY || "";
      const st   = r.State || r.ST || "";
      const addr = [r.Address || "", city, st, r.Zip || r.ZIP || ""].filter(Boolean).join(", ");

      const style = {
        radius: 6,
        weight: 1,
        color: colorStroke,
        fillColor: colorFill,
        fillOpacity: 0.95,
        opacity: 0.95
      };
      L.circleMarker([lat, lon], style)
        .bindPopup(
          `<div>
             <h3 style="margin:0 0 6px; font-size:16px;">${name}</h3>
             <div style="font-size:12px; opacity:.85;">${addr}</div>
           </div>`
        )
        .addTo(layer);
    });
  }

  try {
    // 3) Load both CSVs (in parallel)
    const [rvp, hall] = await Promise.all([
      loadCsv(RVP_CSV),
      loadCsv(HALL_CSV)
    ]);

    // 4) Draw: RVP (gray), Hall (bright red)
    drawPoints(rvp,  rvpLayer,  "#64748b", "#334155"); // cool gray
    drawPoints(hall, hallLayer, "#ff2d55", "#7f1d1d"); // bright red

    // 5) Fit bounds if we added points
    const group = L.featureGroup([rvpLayer, hallLayer]);
    try { map.fitBounds(group.getBounds().pad(0.1)); } catch {}

    console.log(`RVP plotted: ${rvp?.length ?? 0}, Hall plotted: ${hall?.length ?? 0}`);
  } catch (e) {
    console.error("CSV load/draw failed:", e);
  }
})();
