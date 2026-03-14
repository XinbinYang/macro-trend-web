import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const dbPath = process.argv[2] || path.join(process.cwd(), 'macro_quant.db');
const mode = process.argv[3] || 'A';

function openDb(p) {
  return new sqlite3.Database(p, sqlite3.OPEN_READONLY);
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertBatched(supabase, table, rows, onConflict, batchSize = 500) {
  const parts = chunk(rows, batchSize);
  for (let i = 0; i < parts.length; i++) {
    const batch = parts[i];
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) throw new Error(`[${table}] upsert error: ${error.message}`);
  }
}

async function insertBatched(supabase, table, rows, batchSize = 500) {
  const parts = chunk(rows, batchSize);
  for (let i = 0; i < parts.length; i++) {
    const batch = parts[i];
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`[${table}] insert error: ${error.message}`);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncMacro(db) {
  console.log('Sync: macro_us, macro_cn');

  const macroUs = await all(db, 'select * from macro_us order by date');
  const macroCn = await all(db, 'select * from macro_cn order by date');

  // IMPORTANT:
  // Avoid overwriting existing Supabase values with NULLs from SQLite (common for partially-updated latest rows).
  // Strategy: for the most recent window, pull existing rows from Supabase and merge (coalesce) non-null existing
  // values into the outgoing upsert payload.
  const MERGE_RECENT_N = 36; // ~3 years of monthly rows; bounded to avoid heavy queries
  const recentUs = macroUs.slice(-MERGE_RECENT_N);
  const recentDates = recentUs.map(r => String(r.date).slice(0, 10));

  if (recentDates.length > 0) {
    const { data: existing, error } = await supabase
      .from('macro_us')
      .select('*')
      .in('date', recentDates);

    if (!error && Array.isArray(existing) && existing.length > 0) {
      const byDate = new Map(existing.map(r => [String(r.date).slice(0, 10), r]));

      for (const row of recentUs) {
        const d = String(row.date).slice(0, 10);
        const ex = byDate.get(d);
        if (!ex) continue;
        // For any key where SQLite row is null/undefined, keep existing Supabase value.
        for (const k of Object.keys(ex)) {
          if (row[k] === null || row[k] === undefined) {
            row[k] = ex[k];
          }
        }
      }
    }
  }

  // Normalize: sqlite returns date as string/number depending; keep as ISO date string
  await upsertBatched(supabase, 'macro_us', macroUs, 'date');
  await upsertBatched(supabase, 'macro_cn', macroCn, 'date');

  console.log('OK macro_us rows=', macroUs.length, 'macro_cn rows=', macroCn.length);
}

async function deleteRecentYears(supabase, table, cutoffDate) {
  // Safety: only delete a bounded recent window.
  const { error } = await supabase.from(table).delete().gte('date', cutoffDate);
  if (error) throw new Error(`[${table}] delete error: ${error.message}`);
}

async function syncAssetsRecentYears(db, years = 3) {
  console.log(`Sync assets (recent ${years}y): equity/bond/commodity/fx`);

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const equity = await all(db, 'select * from assets_equity where date >= ? order by date', [cutoffDate]);
  const bond = await all(db, 'select * from assets_bond where date >= ? order by date', [cutoffDate]);
  const cmdy = await all(db, 'select * from assets_commodity where date >= ? order by date', [cutoffDate]);
  const fx = await all(db, 'select * from assets_fx where date >= ? order by date', [cutoffDate]);

  // Idempotent refresh: delete recent window first, then insert.
  console.log(`Refreshing window since ${cutoffDate} (delete→insert)`);
  await deleteRecentYears(supabase, 'assets_equity', cutoffDate);
  await deleteRecentYears(supabase, 'assets_bond', cutoffDate);
  await deleteRecentYears(supabase, 'assets_commodity', cutoffDate);
  await deleteRecentYears(supabase, 'assets_fx', cutoffDate);

  await insertBatched(supabase, 'assets_equity', equity);
  await insertBatched(supabase, 'assets_bond', bond);
  await insertBatched(supabase, 'assets_commodity', cmdy);
  await insertBatched(supabase, 'assets_fx', fx);

  console.log('OK assets equity=', equity.length, 'bond=', bond.length, 'commodity=', cmdy.length, 'fx=', fx.length);
}

async function main() {
  if (!fs.existsSync(dbPath)) {
    console.error('SQLite not found:', dbPath);
    process.exit(1);
  }

  const db = openDb(dbPath);
  try {
    if (mode === 'A' || mode === 'ALL') {
      await syncMacro(db);
    }
    if (mode === 'B1' || mode === 'ALL') {
      await syncAssetsRecentYears(db, 3);
    }
    console.log('Done.');
  } finally {
    db.close();
  }
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(2);
});
