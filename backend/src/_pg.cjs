// helper: pg client from Sky-dashboard pooler DATABASE_URL (session mode, port 5432)
const fs = require('fs');
const { Client } = require('pg');

function readEnvUrl() {
  const candidates = [
    'D:/Sky-dashboard/backend-skycarpark/.env',
    'D:/Sky-dashboard/.env',
  ];
  for (const p of candidates) {
    try {
      const txt = fs.readFileSync(p, 'utf8');
      const m = txt.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m);
      if (m && /pooler\.supabase\.com/.test(m[1])) return m[1];
    } catch {}
  }
  // fallback: first DATABASE_URL found
  for (const p of candidates) {
    try {
      const txt = fs.readFileSync(p, 'utf8');
      const m = txt.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m);
      if (m) return m[1];
    } catch {}
  }
  throw new Error('DATABASE_URL not found');
}

function makeClient() {
  return new Client({ connectionString: readEnvUrl(), ssl: { rejectUnauthorized: false } });
}

module.exports = { makeClient };

if (require.main === module) {
  (async () => {
    const c = makeClient();
    await c.connect();
    const ver = await c.query('select version()');
    console.log('connected:', ver.rows[0].version.slice(0, 40));
    const cols = await c.query(`select column_name, data_type from information_schema.columns where table_name='bookings' order by ordinal_position`);
    console.log('bookings columns:', cols.rows.map(r => r.column_name).join(', '));
    const z = await c.query('select id, name, floor from parking_zones order by name');
    console.log('zones:', JSON.stringify(z.rows));
    const sc = await c.query('select count(*)::int n from parking_slots');
    console.log('parking_slots count:', sc.rows[0].n);
    const bc = await c.query('select count(*)::int n from bookings');
    console.log('bookings count:', bc.rows[0].n);
    await c.end();
  })().catch(e => { console.error('ERR', e.message); process.exit(1); });
}
