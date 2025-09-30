(async function () {
  // ---- Load data -----------------------------------------------------------
  console.log("Loading final_development.json …");
  const resp = await fetch("final_development.json", { cache: "no-cache" });
  if (!resp.ok) {
    console.error("Failed to fetch JSON:", resp.status, resp.statusText);
    document.getElementById("map").innerHTML =
      '<div style="padding:12px;color:#b91c1c">Failed to load data file (final_development.json).</div>';
    return;
  }
  const raw = await resp.json();

  // ---- Quick sanity filtering for coords (US bounding box + not 0,0) ------
  // Keep this client-side until we fix upstream data.
  const inUSA = (lat, lon) =>
    lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66; // rough CONUS box

  const data = raw.filter(r => {
    const lat = Number(r.Latitude);
    const lon = Number(r.Longitude);
    if (!lat || !lon) return false;
    if (!inUSA(lat, lon)) return false;
    return true;
  });

  console.log(`Loaded ${raw.length} rows; using ${data.length} within US bounds.`);

  // ---- Map setup -----------------------------------------------------------
  const map = L.map("map").setView([33.5, -86.8], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  // ---- Ownership / Legal sets ---------------------------------------------
  const owners = Array.from(new Set(data.map(d => (d.Owner || "").trim()).filter(Boolean))).sort();
  const legals = Array.from(new Set(data.map(d => (d.LegalEntity || "").trim()).filter(Boolean))).sort();

  // ---- Color mapping per Owner (Hall = brightest) --------------------------
  // Simple palette; feel free to expand.
  const palette = [
    "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#dc2626", "#0891b2",
    "#f59e0b", "#059669", "#e11d48", "#0ea5e9", "#9333ea", "#ef4444",
    "#14b8a6", "#22c55e", "#3b82f6"
  ];
  const ownerColor = {};
  let pi = 0;
  owners.forEach(o => {
    ownerColor[o] = palette[pi % palette.length];
    pi++;
  });
  if (owners.includes("Hall")) ownerColor["Hall"] = "#ff007a"; // bright for Hall

  const state = {
    owners: new Set(owners),   // start with all selected
    legals: new Set(legals),   // start with all selected
  };

  // ---- Toolbar -------------------------------------------------------------
  function renderToolbar() {
    const root = document.getElementById("toolbar");
    root.innerHTML = "";

    const group = (title, values, selectedSet, onToggle) => {
      const wrap = document.createElement("div");
      wrap.className = "group";
      const label = document.createElement("strong");
      label.textContent = title + ":";
      wrap.appendChild(label);

      const chips = document.createElement("div");
      chips.className = "chips";
      values.forEach(v => {
        const chip = document.createElement("label");
        chip.className = "chip";
        const colorDot = document.createElement("span");
        colorDot.style.display = "inline-block";
        colorDot.style.width = "10px";
        colorDot.style.height = "10px";
        colorDot.style.borderRadius = "9999px";
        colorDot.style.border = "1px solid #e5e7eb";
        colorDot.style.marginRight = "6px";
        if (title === "Ownership") colorDot.style.background = ownerColor[v] || "#64748b";
        chip.appendChild(colorDot);

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = selectedSet.has(v);
        cb.addEventListener("change", () => onToggle(v, cb.checked));
        chip.appendChild(cb);

        const span = document.createElement("span");
        span.textContent = v;
        chip.appendChild(span);

        chips.appendChild(chip);
      });
      wrap.appendChild(chips);
      return wrap;
    };

    root.appendChild(
      group("Ownership", owners, state.owners, (v, on) => {
        on ? state.owners.add(v) : state.owners.delete(v);
        refresh();
      })
    );
    root.appendChild(
      group("Legal Entity", legals, state.legals, (v, on) => {
        on ? state.legals.add(v) : state.legals.delete(v);
        refresh();
      })
    );

    const reset = document.createElement("button");
    reset.textContent = "Reset Filters";
    reset.onclick = () => {
      state.owners = new Set(owners);
      state.legals = new Set(legals);
      renderToolbar();
      refresh();
    };
    root.appendChild(reset);
  }

  // ---- Markers layer -------------------------------------------------------
  const layer = L.layerGroup().addTo(map);

  function withinFilters(r) {
    const own = (r.Owner || "").trim();
    const leg = (r.LegalEntity || "").trim();
    const ownOk = own ? state.owners.has(own) : true;
    const legOk = leg ? state.legals.has(leg) : true;
    return ownOk && legOk;
  }

  function popupHtml(r) {
    return `
      <div>
        <h3 style="margin:0 0 6px 0; font-size:16px;">${r.Property || ""}</h3>
        <div style="font-size:12px; opacity:.8;">${[r.Address, r.City, r.State, r.Zip].filter(Boolean).join(", ")}</div>
        <hr />
        <table style="font-size:12px; line-height:1.4;">
          <tr><td><b>Units</b></td><td>${r.Units || ""}</td></tr>
          <tr><td><b>Type</b></td><td>${r.Type || ""}</td></tr>
          <tr><td><b>Manager</b></td><td>${r.Manager || ""}</td></tr>
          <tr><td><b>APM</b></td><td>${r.AssistantMgr || ""}</td></tr>
          <tr><td><b>Compliance</b></td><td>${r.ComplianceSpec || ""}</td></tr>
          <tr><td><b>RPM</b></td><td>${r.RPM || ""}</td></tr>
          <tr><td><b>RVP</b></td><td>${r.RVP || ""}</td></tr>
          <tr><td><b>Owner</b></td><td>${r.Owner || ""}</td></tr>
          <tr><td><b>Legal Entity</b></td><td>${r.LegalEntity || ""}</td></tr>
          <tr><td><b>Email</b></td><td>${r.ManagerEmail || ""}</td></tr>
          <tr><td><b>Office</b></td><td>${r.Office || ""}</td></tr>
          <tr><td><b>Fax</b></td><td>${r.Fax || ""}</td></tr>
        </table>
      </div>`;
  }

  function markerStyleForOwner(owner) {
    const base = {
      radius: 6,
      weight: 1,
      color: "#334155",
      fillColor: ownerColor[owner] || "#64748b",
      fillOpacity: 0.70,
      opacity: 0.9
    };
    if ((owner || "").trim() === "Hall") {
      base.radius = 7.5;
      base.weight = 1.5;
      base.fillOpacity = 0.95;   // brightest
      base.color = "#111827";
    }
    return base;
  }

  function refresh() {
    layer.clearLayers();
    let count = 0;
    data.filter(withinFilters).forEach(r => {
      const lat = Number(r.Latitude) || 0;
      const lon = Number(r.Longitude) || 0;
      const owner = (r.Owner || "").trim();
      const marker = L.circleMarker([lat, lon], markerStyleForOwner(owner))
        .bindPopup(popupHtml(r));
      layer.addLayer(marker);
      count++;
    });
    console.log(`Rendered ${count} markers after filters.`);
  }

  renderToolbar();
  refresh();
})();
