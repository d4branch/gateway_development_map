// scripts/app.js
async function initMap() {
  const response = await fetch("final_development.json");
  const data = await response.json();

  // Initialize map
  const map = L.map("map").setView([33.5, -86.8], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  // Populate filters
  populateFilters(data);

  // Draw markers
  updateMarkers(data, map);

  // Hook up events
  document.getElementById("ownerFilter").addEventListener("change", () => {
    updateMarkers(data, map);
  });
  document.getElementById("legalFilter").addEventListener("change", () => {
    updateMarkers(data, map);
  });
  document.getElementById("resetFilters").addEventListener("click", () => {
    document.getElementById("ownerFilter").value = "";
    document.getElementById("legalFilter").value = "";
    updateMarkers(data, map);
  });
}

function populateFilters(data) {
  const ownerSel = document.getElementById("ownerFilter");
  const legalSel = document.getElementById("legalFilter");

  ownerSel.innerHTML = "<option value=''>All</option>";
  legalSel.innerHTML = "<option value=''>All</option>";

  const owners = [...new Set(data.map(d => d.Owner).filter(Boolean))].sort();
  const legals = [...new Set(data.map(d => d.LegalEntity).filter(Boolean))].sort();

  owners.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    ownerSel.appendChild(opt);
  });

  legals.forEach(l => {
    const opt = document.createElement("option");
    opt.value = l;
    opt.textContent = l;
    legalSel.appendChild(opt);
  });
}

function updateMarkers(data, map) {
  if (window._layerGroup) {
    map.removeLayer(window._layerGroup);
  }

  const ownerFilter = document.getElementById("ownerFilter").value;
  const legalFilter = document.getElementById("legalFilter").value;

  const filtered = data.filter(d => {
    return (!ownerFilter || d.Owner === ownerFilter) &&
           (!legalFilter || d.LegalEntity === legalFilter);
  });

  const markers = filtered.map(d => {
    if (!d.Latitude || !d.Longitude) return null;
    const marker = L.circleMarker([d.Latitude, d.Longitude], {
      radius: 6,
      color: d.Owner === "Hall" ? "red" : "blue",
      fillOpacity: 0.7
    });
    marker.bindPopup(`
      <b>${d.Property}</b><br>
      Owner: ${d.Owner || "N/A"}<br>
      Legal: ${d.LegalEntity || "N/A"}<br>
      City: ${d.City || ""}, ${d.State || ""}
    `);
    return marker;
  }).filter(Boolean);

  window._layerGroup = L.layerGroup(markers).addTo(map);
}

document.addEventListener("DOMContentLoaded", initMap);
