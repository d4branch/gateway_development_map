// scripts/app.js — ownership filter + legend, stable
(async function () {
  // --- map (guard against double init in case of hot reloads) ---
  if (window.__devMap) { try { window.__devMap.remove(); } catch (_) {} }
  const map = L.map("map").setView([33.5, -86.8], 6);
  window.__devMap = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  const layer = L.layerGroup().addTo(map);

  // --- load data ---
  let data = [];
  try {
    const r = await fetch("final_development.json?v=" + Date.now(), { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    data = await r.json();
  } catch (e) {
    console.error("Could not load final_development.json", e);
    return;
  }

  // --- filter to SE footprint and valid coords ---
  const inBounds = (lat, lon) => lat >= 24 && lat <= 38 && lon >= -96 && lon <= -74;
  const rows = data.filter(r => {
    const lat = Number(r.Latitude), lon = Number(r.Longitude);
    return Number.isFinite(lat) && Number.isFinite(lon) && inBounds(lat, lon);
  });

  // --- robust owner detection ---
  function getOwner(r) {
    if (r.Owner) return String(r.Owner).trim();
    if (r.OWNER) return String(r.OWNER).trim();
    if (r.Ownership) return String(r.Ownership).trim();
    if (r["Ownership Name"]) return String(r["Ownership Name"]).trim();
    const k = Object.keys(r).find(x => /owner/i.test(x));
    return k ? String(r[k]).trim() : "";
  }

  const owners = Array.from(new Set(rows.map(getOwner).filter(Boolean))).sort();

  // --- colors ---
  const palette = [
    '#2563eb','#16a34a','#d97706','#7c3aed','#dc2626','#0891b2',
    '#f59e0b','#059669','#e11d48','#0ea5e9','#9333ea','#ef4444',
    '#14b8a6','#22c55e','#3b82f6','#a855f7','#fb7185'
  ];
  const ownerColor = {};
  owners.forEach((o, i) => ownerColor[o] = palette[i % palette.length]);
  if (owners.includes("Gateway")) ownerColor["Gateway"] = "#ff007a"; // highlight Gateway

  function markerStyle(owner) {
    const s = {
      radius: 6, weight: 1, color: '#334155',
      fillColor: ownerColor[owner] || '#64748b',
      fillOpacity: 0.9, opacity: 0.9
    };
    if (owner === "Gateway") { s.radius = 8; s.weight = 1.5; s.color = '#111827'; }
    return s;
  }

  // --- toolbar (dropdown + legend) ---
  const tb = document.getElementById("toolbar");
  tb.innerHTML =
    '<strong>Ownership:</strong> ' +
    '<select id="ownerFilter"><option value="">All</option>' +
    owners.map(o => `<option value="${o}">${o}</option>`).join("") +
    '</select> <button id="resetBtn">Reset Filters</button> ' +
    '<span id="legend" style="margin-left:12px"></span>';

  const legend = document.getElementById("legend");
  legend.innerHTML = owners.slice(0, 10).map(o =>
    `<span style="display:inline-flex;align-items:center;margin-right:10px;font-size:12px;">
       <span style="width:10px;height:10px;border-radius:50%;background:${ownerColor[o]};
                    display:inline-block;margin-right:6px;border:1px solid #334155"></span>${o}
     </span>`
  ).join("") + (owners.length > 10 ? `<span style="font-size:12px;">+${owners.length-10} more</span>` : "");

  // --- popup + render ---
  function popupHtml(r, owner){
    const addr = [r.Address, r.City, r.State, r.Zip].filter(Boolean).join(", ");
    return `
      <div>
        <h3 style="margin:0 0 6px; font-size:16px;">${r.Property || ""}</h3>
        <div style="font-size:12px; opacity:.8;">${addr}</div>
      </div>`;
  }

  function render() {
    const ownerFilter = document.getElementById("ownerFilter").value;
    layer.clearLayers();
    rows.forEach(r => {
      const owner = getOwner(r);
      if (ownerFilter && owner !== ownerFilter) return;
      L.circleMarker([Number(r.Latitude), Number(r.Longitude)], markerStyle(owner))
        .bindPopup(popupHtml(r, owner))
        .addTo(layer);
    });
  }

  document.getElementById("ownerFilter").addEventListener("change", render);
  document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("ownerFilter").value = "";
    render();
  });

  render();
})();
