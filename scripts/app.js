// scripts/app.js — ownership filter + legend (compact)
(async function () {
  // 1) Load JSON (cache-busted)
  let data = [];
  try {
    const resp = await fetch("final_development.json?v=" + Date.now(), { cache: "no-cache" });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    data = await resp.json();
    console.log("Loaded data length:", data.length); // Debug: check raw data count
  } catch (e) {
    console.error("Failed to load final_development.json", e);
    return;
  }

  // Wrap main logic in try-catch for any data issues
  try {
    // 2) Keep rows with finite coords in US bounds (expanded to full continental US), or use default for null
    const inBounds = (lat, lon) => lat >= 24 && lat <= 49 && lon >= -125 && lon <= -66;
    const rows = data.map(r => {
      const lat = Number(r.Latitude);
      const lon = Number(r.Longitude);
      return {
        ...r,
        Latitude: Number.isFinite(lat) && inBounds(lat, lon) ? lat : 33.5, // Default to Birmingham, AL
        Longitude: Number.isFinite(lon) && inBounds(lat, lon) ? lon : -86.8 // Default to Birmingham, AL
      };
    }).filter(r => r.Latitude && r.Longitude); // Ensure we have some coords
    console.log("Filtered rows length:", rows.length); // Debug: check after filter

    // ------- Map (guard against double init) -------
    if (window.__devMap) {
      try { window.__devMap.remove(); } catch (e) {}
      window.__devMap = null;
      window.__devLayer = null;
    }

    const map = L.map("map").setView([33.5, -86.8], 4); // Center on US with default
    window.__devMap = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "&copy; OpenStreetMap"
    }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    window.__devLayer = layer;

    // ------- Owners + colors (robust) -------
    function getOwner(r) {
      if (r.Owner) return String(r.Owner).trim();
      if (r.OWNER) return String(r.OWNER).trim();
      if (r.Ownership) return String(r.Ownership).trim();
      if (r["Ownership Name"]) return String(r["Ownership Name"]).trim();
      const k = Object.keys(r).find(x => /owner/i.test(x));
      return k ? String(r[k]).trim() : "";
    }

    const owners = Array.from(new Set(rows.map(getOwner).filter(Boolean))).sort();
    console.log("Unique owners:", owners); // Debug: check detected owners

    const palette = [
      '#2563eb','#16a34a','#d97706','#7c3aed','#dc2626','#0891b2',
      '#f59e0b','#059669','#e11d48','#0ea5e9','#9333ea','#ef4444',
      '#14b8a6','#22c55e','#3b82f6','#a855f7','#fb7185'
    ];

    // IMPORTANT: build ownerColor BEFORE markerStyle uses it
    const ownerColor = {};
    owners.forEach((o,i) => ownerColor[o] = palette[i % palette.length]);
    if (owners.includes("Gateway")) ownerColor["Gateway"] = "#ff007a"; // highlight Gateway

    function markerStyle(owner) {
      const s = {
        radius: 6,
        weight: 1,
        color: '#334155',
        fillColor: ownerColor[owner] || '#64748b',
        fillOpacity: 0.9,
        opacity: 0.9
      };
      if (owner === "Gateway") { s.radius = 8; s.weight = 1.5; s.color = '#111827'; }
      return s;
    }

    // ------- Toolbar UI -------
    const tb = document.getElementById("toolbar");
    let toolbarHtml = '<strong>Ownership:</strong> ' +
      '<select id="ownerFilter"><option value="">All</option>' +
      owners.map(o => `<option value="${o}">${o}</option>`).join("") +
      '</select> <button id="resetBtn">Reset Filters</button> ' +
      '<span id="legend" style="margin-left:12px"></span>';
    
    if (owners.length === 0) {
      toolbarHtml += '<span style="margin-left:12px; color:red;">(No owners detected in data)</span>';
    }
    tb.innerHTML = toolbarHtml;

    const legend = document.getElementById("legend");
    legend.innerHTML = owners.slice(0, 10).map(o =>
      `<span style="display:inline-flex;align-items:center;margin-right:10px;font-size:12px;">
         <span style="width:10px;height:10px;border-radius:50%;background:${ownerColor[o]};
                      display:inline-block;margin-right:6px;border:1px solid #334155"></span>${o}
       </span>`
    ).join("") + (owners.length > 10 ? `<span style="font-size:12px;">+${owners.length-10} more</span>` : "");

    // ------- Render -------
    function popupHtml(r, owner){
      const addr = [r.Address, r.City, r.State, r.Zip].filter(Boolean).join(", ");
      return (
        `<div>
           <h3 style="margin:0 0 6px; font-size:16px;">${r.Property || ""}</h3>
           <div style="font-size:12px; opacity:.8;">${addr || 'No address available'}</div>
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
    }

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
      if (layer.getLayers().length === 0) {
        console.warn("No markers added - check data filters or JSON content");
      }
    }

    document.getElementById("ownerFilter").addEventListener("change", render);
    document.getElementById("resetBtn").addEventListener("click", () => {
      document.getElementById("ownerFilter").value = "";
      render();
    });

    render();
  } catch (e) {
    console.error("Error in map initialization:", e);
  }
})();
