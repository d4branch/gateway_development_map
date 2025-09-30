
// scripts/app.js — Ownership dropdown + color-by-owner + legend + cache-busted JSON
(async function () {
  // ------- Load data (cache-busted) -------
  let data = [];
  try {
    const resp = await fetch("final_development.json?v=" + Date.now(), { cache: "no-cache" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    data = await resp.json();
  } catch (e) {
    console.error("Failed to load final_development.json:", e);
    document.getElementById("map").innerHTML =
      '<div style="padding:12px;color:#b91c1c">Could not load final_development.json</div>';
    return;
  }

  // ------- Bounds (SE footprint) -------
  const inBounds = (lat, lon) => lat >= 24 && lat <= 38 && lon >= -96 && lon <= -74;

  // Keep only rows with finite coords inside bounds
  const rows = data.filter(r => {
    const lat = Number(r.Latitude), lon = Number(r.Longitude);
    return Number.isFinite(lat) && Number.isFinite(lon) && inBounds(lat, lon);
  });

  // ------- Map -------
  const map = L.map("map").setView([33.5, -86.8], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  const layer = L.layerGroup().addTo(map);

  // ------- Owners + colors -------
  const getOwner = r => (r.Owner ?? r.OWNER ?? r.Ownership ?? "").toString().trim();
  const owners = Array.from(new Set(rows.map(getOwner).filter(Boolean))).sort();

  const palette = ['#2563eb','#16a34a','#d97706','#7c3aed','#dc2626','#0891b2',
                   '#f59e0b','#059669','#e11d48','#0ea5e9','#9333ea','#ef4444',
                   '#14b8a6','#22c55e','#3b82f6','#a855f7','#fb7185'];
  const ownerColor = {};
  let pi = 0;
  owners.forEach(o => ownerColor[o] = palette[pi++ % palette.length]);
  if (owners.includes("Gateway")) ownerColor["Gateway"] = "#ff007a"; // make Gateway/Hall pop

  function markerStyle(owner) {
    const base = {
      radius: 6,
      weight: 1,
      color: '#334155',
      fillColor: ownerColor[owner] || '#64748b',
      fillOpacity: 0.9,
      opacity: 0.9
    };
    if (owner === "Gateway") { base.radius = 8; base.weight = 1.5; base.color = '#111827'; }
    return base;
  }

  function popupHtml(r, owner){
    const addr = [r.Address, r.City, r.State, r.Zip].filter(Boolean).join(", ");
    return `
      <div>
        <h3 style="margin:0 0 6px; font-size:16px;">${r.Property || ""}</h3>
        <div style="font-size:12px; opacity:.8;">${addr}</div>
        <hr />
        <table style="font-size:12px; line-height:1.35;">
          <tr><td><b>Owner</b></td><td>${owner || ""}</td></tr>
          <tr><td><b>Units</b></td><td>${r.Units ?? ""}</td></tr>
          <tr><td><b>Type</b></td><td>${r.Type ?? ""}</td></tr>
          <tr><td><b>Manager</b></td><td>${r.Manager ?? ""}</td></tr>
          <tr><td><b>APM</b></td><td>${r.AssistantMgr ?? ""}</td></tr>
          <tr><td><b>Compliance</b></td><td>${r.ComplianceSpec ?? ""}</td><
