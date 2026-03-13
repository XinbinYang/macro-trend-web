import { z } from "zod";

const MacroIndicatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.enum(["%", "idx", "level"]).or(z.string()),
  value: z.number().nullable(),
  status: z.enum(["LIVE", "STALE", "OFF"]).or(z.string()),
  asOf: z.string().nullable(),
  updatedAt: z.string().optional(),
  source: z.string().optional(),
  quality_tag: z.enum(["Truth", "Indicative"]).optional(),
  is_stale: z.boolean().optional(),
});

const MacroIndicatorsResponseSchema = z.object({
  updatedAt: z.string(),
  indicators: z.array(MacroIndicatorSchema),
  debug: z.record(z.string(), z.any()).optional(),
});

export type MacroIndicator = z.infer<typeof MacroIndicatorSchema>;
export type MacroIndicatorsResponse = z.infer<typeof MacroIndicatorsResponseSchema>;

export async function fetchMacroIndicatorsAbs(origin: string): Promise<MacroIndicatorsResponse | null> {
  try {
    const res = await fetch(`${origin}/api/macro-indicators`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = MacroIndicatorsResponseSchema.safeParse(json);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function indexById(indicators: MacroIndicator[]): Record<string, MacroIndicator> {
  return indicators.reduce((acc, it) => {
    acc[it.id] = it;
    return acc;
  }, {} as Record<string, MacroIndicator>);
}

export function formatValue(value: number | null, unit: string): string {
  if (value === null || Number.isNaN(value)) return "—";
  if (unit === "%") return `${value.toFixed(2)}%`;
  if (unit === "idx") return value.toFixed(2);
  return String(value);
}
