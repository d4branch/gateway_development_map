// app.js guard: do nothing unless legacy CSV mode is explicitly enabled.
(function () {
  const meta = document.querySelector('meta[name="x-data-source"][content="csv"]');
  const flag = window.__ENABLE_LEGACY_CSV_MAP__ === true;
  if (!meta && !flag) return;

  // ---- legacy CSV code goes below this line ----
})();
