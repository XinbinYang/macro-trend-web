/**
 * CLI for logging events to Mission Control
 * Usage:
 *   npm run mission:log -- <type> <message> [key:value ...]
 * 
 * Types:
 *   phase         - Phase changes
 *   objective     - Objective updates
 *   subagent_spawn - Sub-agent spawn events
 *   subagent_complete - Sub-agent completion
 *   workflow      - Workflow milestone events
 *   checkpoint    - Checkpoint events
 * 
 * Example:
 *   npm run mission:log -- phase "P1 → P2: Alpha Engine Online"
 *   npm run mission:log -- subagent_spawn "MiniMax Coding Engine started" agent:main model:minimax
 *   npm run mission:log -- checkpoint "Data Pipeline Ready" type:bond status:live
 */
async function main() {
  const [type, message, ...detailParts] = process.argv.slice(3);
  
  if (!type || !message) {
    console.log(`Usage:
  npm run mission:log -- <type> <message> [key:value ...]
  
Types: phase, objective, subagent_spawn, subagent_complete, workflow, checkpoint
  
Examples:
  npm run mission:log -- phase "P1 → P2: Alpha Engine Online"
  npm run mission:log -- subagent_spawn "MiniMax started" agent:main model:minimax
  npm run mission:log -- checkpoint "Data Pipeline Ready" type:bond status:live`);
    process.exit(1);
  }
  
  const validTypes = ["phase", "objective", "subagent_spawn", "subagent_complete", "workflow", "checkpoint"];
  if (!validTypes.includes(type)) {
    console.error(`Invalid type: ${type}. Valid types: ${validTypes.join(", ")}`);
    process.exit(1);
  }
  
  // Parse key:value pairs
  const details: Record<string, string> = {};
  for (const part of detailParts) {
    const idx = part.indexOf(":");
    if (idx > 0) {
      const key = part.slice(0, idx);
      const value = part.slice(idx + 1);
      details[key] = value;
    }
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  
  const res = await fetch(`${baseUrl}/api/mission/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, message, details }),
  });
  
  const json = await res.json().catch(() => ({}));
  
  if (json.success) {
    console.log(`✅ Mission logged: [${type}] ${message}`);
  } else {
    console.error(`❌ Failed: ${json.error}`);
    process.exit(1);
  }
}

main();
