import React from "react";

export type ContentStatus = "LIVE" | "AI" | "SAMPLE" | "MOCK" | "OFF";

export function StatusBadge({
  status,
  note,
  title,
}: {
  status: ContentStatus;
  note?: string;
  title?: string;
}) {
  const cls =
    status === "LIVE"
      ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
      : status === "AI"
        ? "text-cyan-300 border-cyan-500/30 bg-cyan-500/10"
        : status === "SAMPLE"
          ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
          : status === "MOCK"
            ? "text-slate-300 border-slate-600 bg-slate-800/50"
            : "text-red-300 border-red-500/30 bg-red-500/10";

  return (
    <span
      className={`inline-flex items-center gap-1 border ${cls} text-[10px] px-1.5 py-0.5 rounded font-mono leading-none`}
      title={title || note}
    >
      {status}
      {note ? `·${note}` : ""}
    </span>
  );
}
