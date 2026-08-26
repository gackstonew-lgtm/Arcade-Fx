import { readFile } from 'node:fs/promises';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(await readFile(new URL('../database/migrations/001_initial_postgres.sql', import.meta.url), 'utf8'));
  console.log('Arcade FX PostgreSQL migration completed.');
} finally { await client.end(); }
