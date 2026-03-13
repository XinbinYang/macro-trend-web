// Periodic agent heartbeat loop (Option A)
// Usage:
//   API_BASE_URL=https://macro-trend-web.vercel.app \
//   tsx scripts/agent-heartbeat-loop.ts --agent Macro-Oracle-Agent --interval 30 \
//     --status RUNNING --step "working" --progress 10 --output "..."
//
// Tip: You can re-run this with new step/progress when state changes.

type Payload = {
  agent: string;
  status: string;
  step?: string;
  progress?: number;
  output?: string;
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function numArg(name: string, fallback: number): number {
  const v = arg(name);
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function postOnce(baseUrl: string, payload: Payload) {
  const res = await fetch(`${baseUrl}/api/agent-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.success) throw new Error(`Heartbeat failed: ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  const agent = arg("--agent") || "";
  const status = arg("--status") || "RUNNING";
  const step = arg("--step") || "";
  const output = arg("--output") || "";
  const progress = numArg("--progress", 0);
  const intervalSec = numArg("--interval", 30);

  if (!agent) {
    console.log("Usage: tsx scripts/agent-heartbeat-loop.ts --agent <name> [--interval 30] [--status RUNNING] [--step text] [--progress 0-100] [--output text]");
    process.exit(1);
  }

  const baseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const payload: Payload = {
    agent,
    status,
    step: step || undefined,
    progress: Number.isFinite(progress) ? progress : undefined,
    output: output || undefined,
  };

  console.log(`[heartbeat] agent=${agent} interval=${intervalSec}s -> ${baseUrl}`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await postOnce(baseUrl, payload);
      process.stdout.write(".");
    } catch (e) {
      console.error("\n[heartbeat] error", (e as Error).message);
    }
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
