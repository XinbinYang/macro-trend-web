import akshare from "akshare";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

function monthEnd(yyyymm) {
  const y = Number(yyyymm.slice(0, 4));
  const m = Number(yyyymm.slice(4, 6));
  const d = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-${String(d).padStart(2, "0")}`;
}

function toNum(x) {
  const n = Number(String(x).trim());
  return Number.isFinite(n) ? n : null;
}

async function main() {
  console.log("[CN][SHRZGM] fetching AkShare macro_china_shrzgm() …");
  const df = await akshare.macro_china_shrzgm();
  // akshare node returns array of objects
  if (!Array.isArray(df) || df.length === 0) {
    throw new Error("AkShare returned empty dataset");
  }

  const rows = [];
  for (const r of df) {
    const ym = String(r["月份"] ?? "").slice(0, 6);
    const v = toNum(r["社会融资规模增量"]);
    if (!ym || v === null) continue;
    const d = monthEnd(ym);
    rows.push({
      date: `${d}T00:00:00+00:00`,
      social_financing_flow: v,
      source: "akshare_shrzgm",
      updated_at: new Date().toISOString(),
    });
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  console.log(`[CN][SHRZGM] months=${rows.length} range=${rows[0]?.date?.slice(0, 10)}..${rows[rows.length - 1]?.date?.slice(0, 10)}`);

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const part = rows.slice(i, i + BATCH);
    const { error } = await sb.from("macro_cn").upsert(part, { onConflict: "date" });
    if (error) throw new Error(error.message);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(2);
});
