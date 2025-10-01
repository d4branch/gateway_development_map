// scripts/app.js — simple Hall-only map, red markers
(async function () {
  // Load JSON (cache-busted)
  let data = [];
  try {
    const resp = await fetch("final_development.json?v=" + Date.now(), { cache: "no-cache" });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    data = await resp.json();
  } catch (e) {
    console.error("Failed to load final_development.json:", e);
    return;
  }

  // Keep rows with valid coords within SE footprint
  const inBounds = (lat, lon) => lat >= 24 && lat <= 38 && lon >= -96 && lon <= -74;
  const rows = data.filter(r => {
    const lat = Number(r.Latitude), lon = Number(r.Longitude);
    return Number.isFinite(lat) && Number.isFinite(lon) && inBounds(lat, lon);
  });

  // Leaflet map
  const map = L.map("map").setView([33.5, -86.8], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const layer = L.layerGroup().addTo(map);

  // Marker style — solid red
  const style = {
    radius: 7,
    weight: 1,
    color: "#7f1d1d",     // stroke
    fillColor: "#ef4444", // red
    fillOpacity: 0.95,
    opacity: 0.9
  };

  function popupHtml(r){
    const addr = [r.Address, r.City, r.State, r.Zip].filter(Boolean).join(", ");
    return `
      <div>
        <h3 style="margin:0 0 6px; font-size:16px;">${r.Property || ""}</h3>
        <div style="font-size:12px; opacity:.8;">${addr}</div>
        <hr />
        <table style="font-size:12px; line-height:1.35;">
          <tr><td><b>Units</b></td><td>${r.Units ?? ""}</td></tr>
          <tr><td><b>Type</b></td><td>${r.Type ?? ""}</td></tr>
          <tr><td><b>Manager</b></td><td>${r.Manager ?? ""}</td></tr>
          <tr><td><b>APM</b></td><td>${r.AssistantMgr ?? ""}</td></tr>
          <tr><td><b>RPM</b></td><td>${r.RPM ?? ""}</td></tr>
          <tr><td><b>RVP</b></td><td>${r.RVP ?? ""}</td></tr>
          <tr><td><b>Email</b></td><td>${r.ManagerEmail ?? ""}</td></tr>
          <tr><td><b>Office</b></td><td>${r.Office ?? ""}</td></tr>
          <tr><td><b>Fax</b></td><td>${r.Fax ?? ""}</td></tr>
        </table>
      </div>`;
  }

  // Render markers
  rows.forEach(r => {
    L.circleMarker([Number(r.Latitude), Number(r.Longitude)], style)
      .bindPopup(popupHtml(r))
      .addTo(layer);
  });
})();
