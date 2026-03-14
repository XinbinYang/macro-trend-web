import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/import_cn_lpr_from_master_csv.mjs <csvPath>");
  process.exit(1);
}

function monthEnd(ym) {
  const [y, m] = ym.split("-").map(Number);
  // last day of month: UTC(y, m, 0)
  const d = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(d).padStart(2, "0")}`;
}

function parseNum(s) {
  if (s === undefined || s === null) return null;
  const t = String(s).trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Read & parse
const raw = fs.readFileSync(path.resolve(inputPath), "utf8");
const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

// Expect rows like: YYYY-MM-DD,3,3.5
const rows = [];
for (const line of lines) {
  if (!/^\d{4}-\d{2}-\d{2},/.test(line)) continue;
  const parts = line.split(",");
  const date = parts[0];
  const lpr1 = parseNum(parts[1]);
  const lpr5 = parseNum(parts[2]);
  rows.push({ date, lpr_1y: lpr1, lpr_5y: lpr5 });
}

if (rows.length === 0) {
  console.error("No data rows found (expected YYYY-MM-DD,...) ");
  process.exit(2);
}

// Aggregate to month-end (macro_cn is monthly snapshot table)
const byYm = new Map();
for (const r of rows) {
  const ym = r.date.slice(0, 7);
  const prev = byYm.get(ym);
  if (!prev || r.date > prev.rawDate) {
    byYm.set(ym, { rawDate: r.date, lpr_1y: r.lpr_1y, lpr_5y: r.lpr_5y });
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fetch existing macro_cn rows for these month-end dates, then merge to avoid wiping other CN macro fields.
const monthEnds = Array.from(byYm.keys()).map((ym) => `${monthEnd(ym)}T00:00:00+00:00`);
const existingByDate = new Map();
for (let i = 0; i < monthEnds.length; i += 200) {
  const slice = monthEnds.slice(i, i + 200);
  const { data, error } = await supabase.from("macro_cn").select("*").in("date", slice);
  if (error) throw new Error(error.message);
  for (const r of data || []) {
    existingByDate.set(String(r.date), r);
  }
}

const nowIso = new Date().toISOString();
const payload = Array.from(byYm.entries())
  .sort((a, b) => (a[0] < b[0] ? -1 : 1))
  .map(([ym, v]) => {
    const d = monthEnd(ym);
    const dateIso = `${d}T00:00:00+00:00`;
    const ex = existingByDate.get(dateIso) || {};

    return {
      ...ex,
      date: dateIso,
      // only overwrite LPR fields
      lpr_1y: v.lpr_1y,
      lpr_5y: v.lpr_5y,
      // keep previous source if it was a higher-priority upstream; otherwise mark as this master import
      source: ex.source || "master_wind_manual",
      updated_at: nowIso,
    };
  });

console.log(`[LPR] parsed rows=${rows.length}, months=${payload.length} (merge existing macro_cn)`);

// upsert in batches
const BATCH = 500;
for (let i = 0; i < payload.length; i += BATCH) {
  const batch = payload.slice(i, i + BATCH);
  const { error } = await supabase.from("macro_cn").upsert(batch, { onConflict: "date" });
  if (error) throw new Error(error.message);
}

console.log("Done.");
