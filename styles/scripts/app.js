(async function(){
  // Load the JSON built from your CSV (workflow writes it to /final_hall.json)
  const resp = await fetch('final_hall.json', { cache:'no-cache' });
  const data = await resp.json();

  // --- map ---
  const map = L.map('map').setView([33.52, -86.8], 6); // adjust default view if needed
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // Unique Owners & Legal Entities for chips
  const owners = Array.from(new Set(data.map(d=>d.Owner).filter(Boolean))).sort();
  const legals = Array.from(new Set(data.map(d=>d.LegalEntity).filter(Boolean))).sort();

  const state = { owners: new Set(owners), legals: new Set(legals) };

  function renderToolbar(){
    const root = document.getElementById('toolbar');
    root.innerHTML = '';

    const group = (title, values, selectedSet, onToggle) => {
      const wrap = document.createElement('div');
      wrap.className = 'group';
      const label = document.createElement('strong');
      label.textContent = title + ':';
      wrap.appendChild(label);

      const chips = document.createElement('div');
      chips.className = 'chips';
      values.forEach(v => {
        const chip = document.createElement('label');
        chip.className = 'chip';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selectedSet.has(v);
        cb.addEventListener('change', () => onToggle(v, cb.checked));
        chip.appendChild(cb);
        const span = document.createElement('span');
        span.textContent = v;
        chip.appendChild(span);
        chips.appendChild(chip);
      });
      wrap.appendChild(chips);
      return wrap;
    };

    root.appendChild(group('Ownership', owners, state.owners, (v,on)=>{ on? state.owners.add(v): state.owners.delete(v); refresh(); }));
    root.appendChild(group('Legal Entity', legals, state.legals, (v,on)=>{ on? state.legals.add(v): state.legals.delete(v); refresh(); }));

    const reset = document.createElement('button');
    reset.textContent = 'Reset Filters';
    reset.onclick = ()=>{ state.owners=new Set(owners); state.legals=new Set(legals); renderToolbar(); refresh(); };
    root.appendChild(reset);
  }

  const layer = L.layerGroup().addTo(map);

  function withinFilters(r){
    const ownOk = r.Owner ? state.owners.has(r.Owner) : true;
    const legOk = r.LegalEntity ? state.legals.has(r.LegalEntity) : true;
    return ownOk && legOk;
  }

  function popupHtml(r){
    return `
      <div>
        <h3 style="margin:0 0 6px 0; font-size:16px;">${r.Property || ''}</h3>
        <div style="font-size:12px; opacity:.8;">${[r.Address,r.City,r.State,r.Zip].filter(Boolean).join(', ')}</div>
        <hr />
        <table style="font-size:12px; line-height:1.4;">
          <tr><td><b>Units</b></td><td>${r.Units||''}</td></tr>
          <tr><td><b>Type</b></td><td>${r.Type||''}</td></tr>
          <tr><td><b>Manager</b></td><td>${r.Manager||''}</td></tr>
          <tr><td><b>APM</b></td><td>${r.AssistantMgr||''}</td></tr>
          <tr><td><b>Compliance</b></td><td>${r.ComplianceSpec||''}</td></tr>
          <tr><td><b>RPM</b></td><td>${r.RPM||''}</td></tr>
          <tr><td><b>RVP</b></td><td>${r.RVP||''}</td></tr>
          <tr><td><b>Owner</b></td><td>${r.Owner||''}</td></tr>
          <tr><td><b>Legal Entity</b></td><td>${r.LegalEntity||''}</td></tr>
          <tr><td><b>Email</b></td><td>${r.ManagerEmail||''}</td></tr>
          <tr><td><b>Office</b></td><td>${r.Office||''}</td></tr>
          <tr><td><b>Fax</b></td><td>${r.Fax||''}</td></tr>
        </table>
      </div>`;
  }

  function refresh(){
    layer.clearLayers();
    data.filter(withinFilters).forEach(r => {
      const lat = Number(r.Latitude) || 0;
      const lon = Number(r.Longitude) || 0;
      if (!lat || !lon) return;
      const m = L.circleMarker([lat, lon], { radius: 6, weight:1 }).bindPopup(popupHtml(r));
      layer.addLayer(m);
    });
  }

  renderToolbar();
  refresh();
})();
