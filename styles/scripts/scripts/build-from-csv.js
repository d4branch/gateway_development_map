// scripts/build-from-csv.js
const fs = require('fs');

const INPUT = process.env.HALL_CSV || 'data/hall_portfolio_geocoded.csv';
const OUTPUT = 'final_hall.json';

function parseCSV(text) {
  const [headerLine, ...lines] = text.replace(/\r/g,'').split('\n').filter(Boolean);
  const headers = headerLine.split(',').map(h=>h.trim());
  return lines.map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h,i)=> obj[h]= (vals[i]||'').trim());
    return obj;
  });
}

function mapRow(r){
  const num = (v)=> Number(v || 0) || 0;
  return {
    Property: r.Property || r.PROPERTY || r.Title || '',
    Type: r.Type || r.TYPE || '',
    Units: num(r.Units || r.UNITS),
    Manager: r.Manager || r.MANAGER || '',
    AssistantMgr: r.AssistantMgr || r['ASSISTANT MGR'] || r.APM || '',
    ComplianceSpec: r.ComplianceSpec || r['Compliance Specialist'] || '',
    Address: r.Address || r.ADDRESS || '',
    City: r.City || r.CITY || '',
    State: r.State || r.ST || '',
    Zip: r.Zip || r.ZIP || '',
    Office: r.Office || '',
    Fax: r.Fax || '',
    ManagerEmail: r.ManagerEmail || r['MANAGER EMAIL'] || '',
    RPM: r.RPM || '',
    RVP: r.RVP || '',
    Latitude: num(r.Latitude || r.LATITUDE),
    Longitude: num(r.Longitude || r.LONGITUDE),
    Owner: r.Owner || r.OWNER || '',
    LegalEntity: r.LegalEntity || r['LEGAL ENTITY'] || ''
  };
}

const csv = fs.readFileSync(INPUT, 'utf8');
const rows = parseCSV(csv).map(mapRow);
fs.writeFileSync(OUTPUT, JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} rows → ${OUTPUT}`);
