// scripts/app.js  — builds UI dynamically and renders markers
(async function () {
  // --- Load data ---
  let data = [];
  try {
    const resp = await fetch("final_development.json", { cache: "no-cache" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    data = await resp.json();
  } catch (e) {
    console.error("Failed to load final_development.json:", e);
    document.getElementById("map").innerHTML =
      '<div style="padding:12px;color:#b91c1c">Could not load final_development.json</div>';
    return;
  }

  // --- Basic guardrails (keeps UI safe even if a few bad coords sneak in) ---
  const inBounds = (lat, lon) => lat >= 24 && lat <= 38 && lon >= -96 && lon <= -74;
  const rows = data.filter(r => {
    const lat = Number(r.Latitude), lon = Number(r.Longitude);
    return Number.isFinite(lat) && Number.isFinite(lon) && inBounds(lat, lon);
  });

  // --- Map setup ---
  const map = L.map("map").setView([33.5, -86.8], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  // --- Build Ownership list (use d.Owner; LegalEntity optional) ---
const owners = Array.from(new Set(
  rows.map(d => d.Owner ?? d.OWNER ?? d.owner ?? "").filter(v => v.trim() !== "")
)).sort();


  // --- Colors per owner (Hall = brightest) ---
  const palette = ['#2563eb','#16a34a','#d97706','#7c3aed','#dc2626','#0891b2',
                   '#f59e0b','#059669','#e11d48','#0ea5e9','#9333ea','#ef4444',
                   '#14b8a6','#22c55e','#3b82f6'];
  const ownerColor = {};
  let pi = 0;
  owners.forEach(o => ownerColor[o] = palette[pi++ % palette.length]);
  if (owners.includes("Hall")) ownerColor["Hall"] = "#ff007a";

  // --- Toolbar (created dynamically) ---
  const tb = document.getElementById("toolbar");
  tb.innerHTML = `
    <strong>Ownership:</strong>
    <select id="ownerFilter"><option value="">All</option>
      ${owners.map(o => `<option value="${o}">${o}</option>`).join("")}
    </select>
    <button id="resetBtn">Reset Filters</button>
  `;

  const layer = L.layerGroup().addTo(map);

  function popupHtml(r){
    return `
      <div>
        <h3 style="margin:0 0 6px; font-size:16px;">${r.Property || ""}</h3>
        <div style="font-size:12px; opacity:.8;">${[r.Address,r.City,r.State,r.Zip].filter(Boolean).join(", ")}</div>
        <hr />
        <table style="font-size:12px; line-height:1.4;">
          <tr><td><b>Units</b></td><td>${r.Units ?? ""}</td></tr>
          <tr><td><b>Type</b></td><td>${r.Type ?? ""}</td></tr>
          <tr><td><b>Manager</b></td><td>${r.Manager ?? ""}</td></tr>
          <tr><td><b>APM</b></td><td>${r.AssistantMgr ?? ""}</td></tr>
          <tr><td><b>Compliance</b></td><td>${r.ComplianceSpec ?? ""}</td></tr>
          <tr><td><b>RPM</b></td><td>${r.RPM ?? ""}</td></tr>
          <tr><td><b>RVP</b></td><td>${r.RVP ?? ""}</td></tr>
          <tr><td><b>Owner</b></td><td>${r.Owner ?? ""}</td></tr>
          <tr><td><b>Email</b></td><td>${r.ManagerEmail ?? ""}</td></tr>
          <tr><td><b>Office</b></td><td>${r.Office ?? ""}</td></tr>
          <tr><td><b>Fax</b></td><td>${r.Fax ?? ""}</td></tr>
        </table>
      </div>`;
  }

  function markerStyle(owner) {
    const base = {
      radius: 6,
      weight: 1,
      color: '#334155',
      fillColor: ownerColor[owner] || '#64748b',
      fillOpacity: 0.85,
      opacity: 0.9
    };
    if ((owner || "").trim() === "Hall") {
      base.radius = 8; base.weight = 1.5; base.fillOpacity = 0.95; base.color = '#111827';
    }
    return base;
  }

  function render() {
    layer.clearLayers();
    const ownerFilter = document.getElementById("ownerFilter").value;
    rows.forEach(r => {
      if (ownerFilter && (r.Owner || "").trim() !== ownerFilter) return;
      const lat = Number(r.Latitude), lon = Number(r.Longitude);
      const m = L.circleMarker([lat, lon], markerStyle((r.Owner || "").trim()))
        .bindPopup(popupHtml(r));
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
