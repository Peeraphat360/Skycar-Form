// One-shot runner: apply migrations/002_customer_memory.sql + backfill vehicles
// Usage: node run_migration_002.cjs
const fs = require('fs');
const path = require('path');
const { makeClient } = require('./src/_pg.cjs');

const BACKFILL = `
insert into public.vehicles (user_id, plate_number, car_brand, car_model, vehicle_type, is_default)
select distinct on (b.user_id, b.vehicle_plate)
       b.user_id, b.vehicle_plate, b.vehicle_brand, b.vehicle_model, b.vehicle_type, false
from public.bookings b
where b.vehicle_plate is not null and b.vehicle_plate <> '' and b.user_id is not null
order by b.user_id, b.vehicle_plate, b.created_at desc
on conflict (user_id, plate_number) do nothing;
`;

(async () => {
  const c = makeClient();
  await c.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', '002_customer_memory.sql'), 'utf8');

    console.log('▶ applying 002_customer_memory.sql …');
    await c.query(sql);
    console.log('  ✓ migration applied');

    console.log('▶ running backfill (vehicles ← bookings) …');
    const bf = await c.query(BACKFILL);
    console.log(`  ✓ backfill inserted ${bf.rowCount} vehicle row(s)`);

    // ── verify ──
    const uc = await c.query(`select column_name from information_schema.columns
      where table_name='users' and column_name in ('consent_pdpa','consent_at','created_at','updated_at') order by column_name`);
    console.log('users new columns:', uc.rows.map(r => r.column_name).join(', '));

    const vexists = await c.query(`select count(*)::int n from information_schema.tables where table_name='vehicles'`);
    console.log('vehicles table exists:', vexists.rows[0].n === 1);

    const vidx = await c.query(`select indexname from pg_indexes where tablename='vehicles' order by indexname`);
    console.log('vehicles indexes:', vidx.rows.map(r => r.indexname).join(', '));

    const bvid = await c.query(`select count(*)::int n from information_schema.columns where table_name='bookings' and column_name='vehicle_id'`);
    console.log('bookings.vehicle_id added:', bvid.rows[0].n === 1);

    const rls = await c.query(`select relrowsecurity from pg_class where relname='vehicles'`);
    console.log('vehicles RLS enabled:', rls.rows[0]?.relrowsecurity === true);

    const vc = await c.query('select count(*)::int n from public.vehicles');
    console.log('vehicles row count:', vc.rows[0].n);
  } catch (e) {
    console.error('ERR', e.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
