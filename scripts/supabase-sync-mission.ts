import { spawnSync } from 'node:child_process';
import { loadMission, saveMission, updateAgent, addNote } from "@/lib/mission-control";

const AGENT_NAME = 'supabase-sync';

interface SyncResult {
  success: boolean;
  mode: string;
  stats?: {
    macro_us?: number;
    macro_cn?: number;
    equity?: number;
    bond?: number;
    commodity?: number;
    fx?: number;
  };
  error?: string;
}

function parseSyncOutput(stdout: string): SyncResult {
  const result: SyncResult = {
    success: false,
    mode: 'unknown',
    stats: {}
  };

  // Parse mode
  if (stdout.includes('Sync: macro_us, macro_cn')) {
    result.mode = 'A';
  } else if (stdout.includes('Sync assets')) {
    result.mode = 'B1';
  }

  // Parse stats
  const macroMatch = stdout.match(/OK macro_us rows= (\d+) macro_cn rows= (\d+)/);
  if (macroMatch) {
    result.stats.macro_us = parseInt(macroMatch[1]);
    result.stats.macro_cn = parseInt(macroMatch[2]);
  }

  const assetsMatch = stdout.match(/OK assets equity= (\d+) bond= (\d+) commodity= (\d+) fx= (\d+)/);
  if (assetsMatch) {
    result.stats.equity = parseInt(assetsMatch[1]);
    result.stats.bond = parseInt(assetsMatch[2]);
    result.stats.commodity = parseInt(assetsMatch[3]);
    result.stats.fx = parseInt(assetsMatch[4]);
  }

  result.success = stdout.includes('Done.');
  return result;
}

function formatStats(stats: SyncResult['stats']): string {
  const parts: string[] = [];
  if (stats.macro_us) parts.push(`macro_us=${stats.macro_us}`);
  if (stats.macro_cn) parts.push(`macro_cn=${stats.macro_cn}`);
  if (stats.equity) parts.push(`equity=${stats.equity}`);
  if (stats.bond) parts.push(`bond=${stats.bond}`);
  if (stats.commodity) parts.push(`commodity=${stats.commodity}`);
  if (stats.fx) parts.push(`fx=${stats.fx}`);
  return parts.join(', ');
}

async function syncWithMission(mode: string) {
  const mission = loadMission();

  // Mark agent as running
  updateAgent(mission, AGENT_NAME, 'RUNNING', `Syncing SQLite → Supabase (mode ${mode})`);
  saveMission(mission);

  // Run sync script
  const result = spawnSync('node', [
    '--env-file',
    '.env.local',
    'scripts/sync_sqlite_to_supabase.mjs',
    'macro_quant.db',
    mode
  ], {
    stdio: ['inherit', 'pipe', 'pipe'],
    encoding: 'utf8'
  });

  const output = result.stdout || '';
  const error = result.stderr || '';

  // Parse results
  const syncResult = parseSyncOutput(output);
  
  if (syncResult.success) {
    updateAgent(
      mission,
      AGENT_NAME, 
      'DONE',
      `Sync complete (mode ${mode}): ${formatStats(syncResult.stats)}`
    );
  } else {
    const errorMsg = error || 'Unknown error';
    updateAgent(
      mission,
      AGENT_NAME,
      'BLOCKED',
      `Sync failed (mode ${mode}): ${errorMsg}`
    );
    addNote(mission, `[ERROR] Supabase sync failed: ${errorMsg}`);
  }

  saveMission(mission);

  // Exit with same code as sync script
  process.exit(syncResult.success ? 0 : 1);
}

const mode = process.argv[2] || 'A';
syncWithMission(mode);