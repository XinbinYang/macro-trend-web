import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}


// PBoC LPR (Truth)
// Primary: scrape latest official announcement from PBoC site.
// Override (optional): set env PBOC_LPR_1Y/PBOC_LPR_5Y/PBOC_LPR_ASOF for manual hotfix.

const LIST_URL = "https://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125440/3876551/index.html";

function pct(x: string) {
  const v = Number(String(x).replace(/%/g, "").trim());
  return Number.isFinite(v) ? v : null;
}

async function fetchLatestAnnouncementUrl(): Promise<string | null> {
  const html = await fetch(LIST_URL, { cache: "no-store" }).then((r) => r.text());
  // Match first detail page url in this category. These pages are usually like:
  // /zhengcehuobisi/.../3876551/<id>/index.html
  const re = /href\s*=\s*"(\/zhengcehuobisi\/125207\/125213\/125440\/3876551\/[^"]+\/index\.html)"/g;
  const m = re.exec(html);
  if (!m) return null;
  return `https://www.pbc.gov.cn${m[1]}`;
}

async function parseLprFromAnnouncement(url: string): Promise<{ asOf: string; lpr1y: number; lpr5y: number } | null> {
  const text = await fetch(url, { cache: "no-store" }).then((r) => r.text());

  // Extract date from url/title text. Prefer YYYY年M月D日 pattern.
  const dateMatch = text.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日/);
  const asOf = dateMatch
    ? `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, "0")}-${String(dateMatch[3]).padStart(2, "0")}`
    : new Date().toISOString().slice(0, 10);

  // Extract rates: “1年期LPR为3.0%，5年期以上LPR为3.5%”
  // NOTE: avoid /s (dotAll) flag for broader TS target compatibility
  const rateMatch = text.match(/1年期LPR为\s*([0-9.]+)%[\s\S]*?5年期以上LPR为\s*([0-9.]+)%/);
  if (!rateMatch) return null;

  const lpr1y = pct(rateMatch[1]);
  const lpr5y = pct(rateMatch[2]);
  if (lpr1y === null || lpr5y === null) return null;
  return { asOf, lpr1y, lpr5y };
}

export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const got = new URL(req.url).searchParams.get("secret") || req.headers.get("x-cron-secret");
      if (got !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Manual override (hotfix)
    const o1 = process.env.PBOC_LPR_1Y;
    const o5 = process.env.PBOC_LPR_5Y;
    const oDate = process.env.PBOC_LPR_ASOF;
    if (o1 && o5) {
      const lpr1y = pct(o1);
      const lpr5y = pct(o5);
      if (lpr1y === null || lpr5y === null) throw new Error("Invalid PBOC_LPR_1Y/PBOC_LPR_5Y override");
      const asOf = oDate || new Date().toISOString().slice(0, 10);

      const payload = {
        date: `${asOf}T00:00:00+00:00`,
        lpr_1y: lpr1y,
        lpr_5y: lpr5y,
        source: "pboc",
        updated_at: new Date().toISOString(),
      };

      const sb = supabaseAdmin();
      const { error } = await sb.from("macro_cn").upsert([payload], { onConflict: "date" });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, mode: "override", asOf, wrote: payload });
    }

    // Scrape official announcement
    const annUrl = await fetchLatestAnnouncementUrl();
    if (!annUrl) throw new Error("Failed to find latest PBoC LPR announcement url");

    const parsed = await parseLprFromAnnouncement(annUrl);
    if (!parsed) throw new Error("Failed to parse LPR from announcement");

    const payload = {
      date: `${parsed.asOf}T00:00:00+00:00`,
      lpr_1y: parsed.lpr1y,
      lpr_5y: parsed.lpr5y,
      source: "pboc",
      updated_at: new Date().toISOString(),
    };

    const sb = supabaseAdmin();
    const { error } = await sb.from("macro_cn").upsert([payload], { onConflict: "date" });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, mode: "scrape", announcementUrl: annUrl, asOf: parsed.asOf, wrote: payload });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
