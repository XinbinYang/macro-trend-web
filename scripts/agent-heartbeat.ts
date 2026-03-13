// Lightweight agent heartbeat publisher (Option A: hit the web API)
// Usage:
//   API_BASE_URL=https://macro-trend-web.vercel.app tsx scripts/agent-heartbeat.ts \
//     --agent Data-Nexus-Agent --status RUNNING --step "Ingesting" --progress 12 --output "..."

type Payload = {
  agent: string;
  status: string;
  step?: string;
  progress?: number;
  output?: string;
};

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function getNumArg(name: string): number | undefined {
  const v = getArg(name);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function main() {
  const agent = getArg("--agent") || "";
  const status = getArg("--status") || "";
  const step = getArg("--step");
  const progress = getNumArg("--progress");
  const output = getArg("--output");

  if (!agent || !status) {
    console.log(
      "Usage: tsx scripts/agent-heartbeat.ts --agent <name> --status <RUNNING|DONE|IDLE|ERROR> [--step <text>] [--progress <0-100>] [--output <text>]"
    );
    process.exit(1);
  }

  const baseUrl =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000";

  const payload: Payload = {
    agent,
    status,
    step,
    progress,
    output,
  };

  const res = await fetch(`${baseUrl}/api/agent-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!json?.success) {
    console.error("Heartbeat failed:", json);
    process.exit(2);
  }
  console.log("ok", JSON.stringify(json.data));
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
