(async function(){
  console.log('Loading final_development.json …');
  const resp = await fetch('final_development.json', { cache:'no-cache' });
  const data = await resp.json();
  console.log('Loaded records:', data.length);

  // Set up map
  const map = L.map('map').setView([33.5, -86.8], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // Build unique owners
  const owners = [...new Set(data.map(d => d.Owner).filter(Boolean))];
  const entities = [...new Set(data.map(d => d.LegalEntity).filter(Boolean))];

  // Assign colors
  const palette = [
    '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd',
    '#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf'
  ];
  const colorByOwner = {};
  owners.forEach((o, i) => {
    colorByOwner[o] = (o.toLowerCase().includes('hall'))
      ? '#ff0000' // Force Hall bright red
      : palette[i % palette.length];
  });

  // Draw markers
  let markers = [];
  function renderMarkers(ownerFilter, entityFilter) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    data.forEach(d => {
      if (!d.Latitude || !d.Longitude) return;
      if (ownerFilter && d.Owner !== ownerFilter) return;
      if (entityFilter && d.LegalEntity !== entityFilter) return;

      const color = colorByOwner[d.Owner] || '#555';
      const marker = L.circleMarker([+d.Latitude, +d.Longitude], {
        radius: 6,
        fillColor: color,
        color: '#333',
        weight: 1,
        fillOpacity: 0.9
      }).bindPopup(`
        <b>${d.Property || '(No name)'}</b><br/>
        ${d.Address || ''}<br/>
        Manager: ${d.Manager || ''}<br/>
        Owner: ${d.Owner || ''}<br/>
        Legal Entity: ${d.LegalEntity || ''}
      `);
      marker.addTo(map);
      markers.push(marker);
    });
  }

  // Init toolbar
  const toolbar = document.getElementById('toolbar');
  toolbar.innerHTML = `
    Ownership: <select id="ownerFilter"><option value="">All</option>
      ${owners.map(o => `<option value="${o}">${o}</option>`).join('')}
    </select>
    Legal Entity: <select id="entityFilter"><option value="">All</option>
      ${entities.map(e => `<option value="${e}">${e}</option>`).join('')}
    </select>
    <button id="resetBtn">Reset Filters</button>
  `;

  document.getElementById('ownerFilter').addEventListener('change', e => {
    renderMarkers(e.target.value, document.getElementById('entityFilter').value);
  });
  document.getElementById('entityFilter').addEventListener('change', e => {
    renderMarkers(document.getElementById('ownerFilter').value, e.target.value);
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('ownerFilter').value = '';
    document.getElementById('entityFilter').value = '';
    renderMarkers();
  });

  // First draw
  renderMarkers();
})();
