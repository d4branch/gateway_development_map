(async function(){
  console.log('Loading final_development.json …');
  const resp = await fetch('final_development.json', { cache:'no-cache' });
  if (!resp.ok) {
    console.error('Failed to fetch JSON:', resp.status, resp.statusText);
    document.getElementById('map').innerHTML = '<div style="padding:12px;color:#b91c1c">Failed to load data file (final_development.json).</div>';
    return;
  }
  const data = await resp.json();
  console.log('Loaded records:', data.length);

  // … your existing map code continues here …

const resp = await fetch('final_development.json', { cache:'no-cache' });
