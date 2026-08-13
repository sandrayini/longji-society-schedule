const db = require('../server/db');

const rows = db.prepare('SELECT id, data FROM submissions').all();
let converted = 0;
let failed = [];
for (const row of rows) {
  const raw = row.data;
  if (!raw) continue;
  // already valid JSON string
  try {
    JSON.parse(raw);
    continue;
  } catch (_) {}
  // try to evaluate python-style single-quoted dict
  try {
    // heuristic: replace single quotes around keys/strings with double quotes, then true/false/null
    let s = raw.replace(/'/g, '"')
               .replace(/True/g, 'true')
               .replace(/False/g, 'false')
               .replace(/None/g, 'null');
    const obj = JSON.parse(s);
    db.prepare('UPDATE submissions SET data = ? WHERE id = ?').run(JSON.stringify(obj), row.id);
    converted++;
  } catch (err) {
    failed.push({ id: row.id, raw, error: err.message });
  }
}

// verify all rows now parse
const all = db.prepare('SELECT id, data FROM submissions').all();
const stillBad = all.filter(r => {
  try { JSON.parse(r.data); return false; } catch (_) { return true; }
});

console.log('converted', converted);
console.log('failed', failed.length);
if (failed.length) console.log(failed);
console.log('still bad after migration', stillBad.length);
if (stillBad.length) console.log(stillBad);
