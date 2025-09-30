// scripts/app.js — ownership filter + legend (compact)
(async function () {
  // 1) Load JSON (cache-busted)
  let data = [];
  try {
    const resp = await fetch("final_development.json?v=" + Date.now(), { cache: "no-cache" });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    data = await resp.json();
  } catch (e) {
    console.error("Failed to load final_development.json", e);
    return;
  }

  // 2) Keep rows with finite coords in SE bounds
  const inBounds = (lat, lon) => lat >= 24 && lat <= 38 && lon >= -96 && lon <= -74;
  const rows = data.filter(r => {
    const lat = Number(r.Latitude), lon = Number(r.Longitude);
    return Number.isFinite(lat) && Number.isFinite(lon) && inBounds(lat, lon);
  });

  // 3) Map
  const map = L.map("map").setView([33.5, -86.8], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  const layer = L.layerGroup().addTo(map);

  // 4) Owners + colors
  const getOwner = r => (r.Owner ?? r.OWNER ?? r.Ownership ?? "").toString().trim();
  const owners = Array.from(new Set(rows.map(getOwner).filter(Boolean))).sort();
  const palette = ['#2563eb','#16a34a','#d97706','#7c3aed','#dc2626','#0891b2',
                   '#f59e0b','#059669','#e11d48','#0ea5e9','#9333ea','#ef4444',
                   '#14b8a6','#22c55e','#3b82f6','#a855f7','#fb7185'];
  const ownerColor = {}; let i = 0;
  owners.forEach(o => ownerColor[o] = palette[i++ % palette.length]);
  if (owners.includes("Gateway")) ownerColor["Gateway"] = "#ff007a"; // highlight Gateway

  // 5) Toolbar UI
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

  // 6) Render markers
  const markerStyle = owner => {
    const s = { radius: 6, weight: 1, color: '#334155',
                fillColor: ownerColor[owner] || '#64748b',
                fillOpacity: 0.9, opacity: 0.9 };
    if (owner === "Gateway") { s.radius = 8; s.weight = 1.5; s.color = '#111827'; }
    return s;
  };

  const popupHtml = (r, owner) => {
    const addr = [r.Address, r.City, r.State, r.Zip].filter(Boolean).join(", ");
    return (
      `<div>
        <h3 style="margin:0 0 6px; font-size:16px;">${r.Property || ""}</h3>
        <div style="font-size:12px; opacity:.8;">${addr}</div>
        <hr />
        <table style="font-size:12px; line-height:1.35;">
          <tr><td><b>Owner</b></td><td>${owner || ""}</td></tr>
          <tr><td><b>Units</b></td><td>${r.Units ?? ""}</td></tr>
          <tr><td><b>Type</b></td><td>${r.Type ?? ""}</td></tr>
          <tr><td><b>Manager</b></td><td>${r.Manager ?? ""}</td></tr>
          <tr><td><b>APM</b></td><td>${r.AssistantMgr ?? ""}</td></tr>
          <tr><td><b>Compliance</b></td><td>${r.ComplianceSpec ?? ""}</td></tr>
          <tr><td><b>RPM</b></td><td>${r.RPM ?? ""}</td></tr>
          <tr><td><b>RVP</b></td><td>${r.RVP ?? ""}</td></tr>
          <tr><td><b>Email</b></td><td>${r.ManagerEmail ?? ""}</td></tr>
          <tr><td><b>Office</b></td><td>${r.Office ?? ""}</td></tr>
          <tr><td><b>Fax</b></td><td>${r.Fax ?? ""}</td></tr>
        </table>
      </div>`
    );
  };

  function render() {
    const ownerFilter = document.getElementById("ownerFilter").value;
    layer.clearLayers();
    rows.forEach(r => {
      const owner = getOwner(r);
      if (ownerFilter && owner !== ownerFilter) return;
      const m = L.circleMarker([Number(r.Latitude), Number(r.Longitude)], markerStyle(owner))
                   .bindPopup(popupHtml(r, owner));
      layer.addLayer(m);
    });
  }

  document.getElementById("ownerFilter").addEventListener("change", render);
  document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("ownerFilter").value = "";
    render();
  });

  render();
})();
