import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sourcePath = process.env.LEGACY_SQLITE_PATH || 'db/arcadefx.sqlite';
const SQL = await initSqlJs({ locateFile: (file) => fileURLToPath(new URL(`../node_modules/sql.js/dist/${file}`, import.meta.url)) });
const legacy = new SQL.Database(await readFile(sourcePath));
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } });

function rows(query) {
  const result = legacy.exec(query)[0];
  return result ? result.values.map((values) => Object.fromEntries(result.columns.map((column, index) => [column, values[index]]))) : [];
}

await client.connect();
try {
  await client.query('BEGIN');
  for (const row of rows('SELECT code, name, base_price, pip_size, type FROM symbols')) await client.query('INSERT INTO symbols (code,name,base_price,pip_size,type) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,base_price=EXCLUDED.base_price,pip_size=EXCLUDED.pip_size,type=EXCLUDED.type', Object.values(row));
  for (const row of rows('SELECT setting_key, setting_value FROM settings')) await client.query('INSERT INTO settings (setting_key,setting_value) VALUES ($1,$2::jsonb) ON CONFLICT (setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=CURRENT_TIMESTAMP', [row.setting_key, row.setting_value]);
  for (const row of rows('SELECT symbol_code, added_at FROM watchlist')) await client.query('INSERT INTO watchlist (symbol_code,added_at) VALUES ($1,$2) ON CONFLICT (symbol_code) DO NOTHING', [row.symbol_code, row.added_at]);
  for (const row of rows('SELECT symbol_code, drawing_data, updated_at FROM drawings')) await client.query('INSERT INTO drawings (symbol_code,drawing_data,updated_at) VALUES ($1,$2::jsonb,$3)', [row.symbol_code, row.drawing_data, row.updated_at]);
  for (const row of rows('SELECT symbol_code,timeframe,signal_type,score,rating,details_json,created_at FROM signals')) await client.query('INSERT INTO signals (symbol_code,timeframe,signal_type,score,rating,details_json,created_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)', Object.values(row));
  for (const row of rows('SELECT symbol_code,alert_type,condition_val,is_active,created_at FROM alerts')) await client.query('INSERT INTO alerts (symbol_code,alert_type,condition_val,is_active,created_at) VALUES ($1,$2,$3,$4,$5)', Object.values(row));
  await client.query('COMMIT');
  console.log(`Imported Arcade FX runtime data from ${sourcePath}.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
  legacy.close();
}
