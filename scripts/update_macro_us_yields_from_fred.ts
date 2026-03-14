import sqlite3 from "sqlite3";
import path from "node:path";

const FRED_API_BASE = "https://api.stlouisfed.org/fred";

type FredObs = { date: string; value: string };

type FredResponse = {
  observations: FredObs[];
};

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function monthKey(isoDate: string) {
  return isoDate.slice(0, 7); // YYYY-MM
}

function lastDayOfMonth(year: number, month1to12: number) {
  // JS: month is 0-based; day 0 gives last day of previous month
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function toMacroUsDate(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = lastDayOfMonth(y, m);
  return `${ym}-${String(d).padStart(2, "0")} 00:00:00`;
}

function openDb(dbPath: string) {
  return new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE);
}

function run(db: sqlite3.Database, sql: string, params: any[] = []) {
  return new Promise<void>((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

function get<T = any>(db: sqlite3.Database, sql: string, params: any[] = []) {
  return new Promise<T>((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T)));
  });
}

async function fetchFredSeries(seriesId: string, observationStart: string) {
  const url = new URL(`${FRED_API_BASE}/series/observations`);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", env("FRED_API_KEY"));
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "asc");
  url.searchParams.set("observation_start", observationStart);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FRED ${seriesId} HTTP ${res.status}`);
  const json = (await res.json()) as FredResponse;
  return (json.observations || [])
    .filter((o) => o.value !== ".")
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .filter((o) => Number.isFinite(o.value));
}

async function main() {
  const dbFile = process.argv[2] || "macro_quant.db";
  const dbPath = path.isAbsolute(dbFile) ? dbFile : path.join(process.cwd(), dbFile);

  const series2y = "DGS2";
  const series10y = "DGS10";
  const start = "2005-01-01";

  console.log(`[macro_us] loading FRED series: ${series2y}, ${series10y} from ${start}`);
  const [dgs2, dgs10] = await Promise.all([
    fetchFredSeries(series2y, start),
    fetchFredSeries(series10y, start),
  ]);

  const lastByMonth2y = new Map<string, number>();
  for (const p of dgs2) lastByMonth2y.set(monthKey(p.date), p.value);

  const lastByMonth10y = new Map<string, number>();
  for (const p of dgs10) lastByMonth10y.set(monthKey(p.date), p.value);

  const db = openDb(dbPath);
  try {
    const nowIso = new Date().toISOString();

    // ensure columns exist (idempotent)
    await run(db, `ALTER TABLE macro_us ADD COLUMN yield_2y REAL`).catch(() => {});
    await run(db, `ALTER TABLE macro_us ADD COLUMN yield_10y REAL`).catch(() => {});

    const { total } = await get<{ total: number }>(db, "select count(*) as total from macro_us");
    console.log(`[macro_us] sqlite rows: ${total}`);

    let updated2y = 0;
    let updated10y = 0;

    // Update only existing macro_us rows (month-end dates)
    const months = Array.from(new Set([...lastByMonth2y.keys(), ...lastByMonth10y.keys()])).sort();
    for (const ym of months) {
      const dateKey = toMacroUsDate(ym);
      const y2 = lastByMonth2y.get(ym);
      const y10 = lastByMonth10y.get(ym);

      // Skip if neither exists
      if (y2 === undefined && y10 === undefined) continue;

      // Only update rows that exist
      const row = await get<{ c: number }>(db, "select count(*) as c from macro_us where date = ?", [dateKey]);
      if (!row || row.c === 0) continue;

      if (y2 !== undefined) {
        await run(
          db,
          "update macro_us set yield_2y = coalesce(yield_2y, ?), source = coalesce(source, 'fred'), updated_at = ? where date = ?",
          [y2, nowIso, dateKey]
        );
        updated2y++;
      }

      if (y10 !== undefined) {
        await run(
          db,
          "update macro_us set yield_10y = coalesce(yield_10y, ?), source = coalesce(source, 'fred'), updated_at = ? where date = ?",
          [y10, nowIso, dateKey]
        );
        updated10y++;
      }
    }

    const stat = await get<{ nonnull_y2: number; nonnull_y10: number }>(
      db,
      "select sum(case when yield_2y is not null then 1 else 0 end) as nonnull_y2, sum(case when yield_10y is not null then 1 else 0 end) as nonnull_y10 from macro_us"
    );

    console.log(`[macro_us] updated rows: yield_2y=${updated2y}, yield_10y=${updated10y}`);
    console.log(`[macro_us] non-null counts after: yield_2y=${stat.nonnull_y2}, yield_10y=${stat.nonnull_y10}`);
    console.log("Done.");
  } finally {
    db.close();
  }
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(2);
});
