// scripts/app.js (smoke test) — should always show a basemap + one marker
(function () {
  try {
    const map = L.map("map").setView([33.5, -86.8], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "&copy; OpenStreetMap"
    }).addTo(map);
    L.marker([33.5, -86.8]).addTo(map).bindPopup("Loaded OK");
  } catch (e) {
    console.error("Smoke test failed:", e);
  }
})();
