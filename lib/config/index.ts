/**
 * Config Loader - Centralized configuration access
 * Loads and provides typed access to JSON config files
 */

import macroFrameworkConfig from "@/config/macro_framework_v1.json";
import watchlistConfig from "@/config/watchlist_default.json";

// === Types ===

export interface IndicatorConfig {
  id: string;
  name: string;
  name_cn: string;
  unit: "%" | "idx" | "level";
  source: string;
  cadence: string;
  quality_tag: string;
  notes: string;
}

export interface ThresholdConfig {
  strong: number;
  weak: number;
  higherIsBetter: boolean;
}

export interface DimensionIndicators {
  main: string;
  aux: string[];
  thresholds: ThresholdConfig;
}

export interface RegionIndicators {
  main: string;
  aux: string[];
  thresholds: ThresholdConfig;
}

export interface DimensionConfig {
  name: string;
  emoji: string;
  indicators: {
    us: RegionIndicators;
    cn: RegionIndicators;
  };
}

export interface MacroFrameworkConfig {
  version: string;
  description: string;
  dimensions: {
    growth: DimensionConfig;
    inflation: DimensionConfig;
    policy: DimensionConfig;
    liquidity: DimensionConfig;
  };
  indicators: Record<string, IndicatorConfig>;
}

export interface WatchlistRepresentative {
  symbol: string;
  name: string;
  source: string;
}

export interface RiskUnit {
  name: string;
  name_en: string;
  category: string;
  representatives: WatchlistRepresentative[];
}

export interface RegionConfig {
  name: string;
  name_en: string;
  symbols: string[];
  aliases?: string[];
}

export interface WatchlistConfig {
  version: string;
  description: string;
  riskUnits: Record<string, RiskUnit>;
  regions: {
    us: RegionConfig;
    cn: RegionConfig;
    hk: RegionConfig;
    global: RegionConfig;
  };
}

// Asset classification for market-data-realtime
export interface AssetConfig {
  symbol: string;
  name: string;
  region: "US" | "CN" | "HK" | "GLOBAL";
  category: "EQUITY" | "BOND" | "COMMODITY" | "FX";
  dataType: "REALTIME" | "DELAYED" | "EOD";
  dataSource: string;
}

// Market quote type
export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: string;
  region: "US" | "CN" | "HK" | "GLOBAL";
  category: "EQUITY" | "BOND" | "COMMODITY" | "FX";
  dataType: "REALTIME" | "DELAYED" | "EOD";
  dataSource: string;
  isIndicative: boolean;
  note?: string;
}

// === Exports ===

export const macroFramework: MacroFrameworkConfig = macroFrameworkConfig as MacroFrameworkConfig;
export const watchlist: WatchlistConfig = watchlistConfig as WatchlistConfig;

// === Helper Functions ===

export function getDimensionConfig(dim: "growth" | "inflation" | "policy" | "liquidity"): DimensionConfig {
  return macroFramework.dimensions[dim];
}

export function getIndicatorConfig(indicatorId: string): IndicatorConfig | undefined {
  return macroFramework.indicators[indicatorId];
}

export function getMainIndicator(dim: "growth" | "inflation" | "policy" | "liquidity", region: "us" | "cn"): string {
  return macroFramework.dimensions[dim].indicators[region].main;
}

export function getAuxIndicators(dim: "growth" | "inflation" | "policy" | "liquidity", region: "us" | "cn"): string[] {
  return macroFramework.dimensions[dim].indicators[region].aux;
}

export function getThresholds(dim: "growth" | "inflation" | "policy" | "liquidity", region: "us" | "cn"): ThresholdConfig {
  return macroFramework.dimensions[dim].indicators[region].thresholds;
}

export function getRiskUnits(): RiskUnit[] {
  return Object.values(watchlist.riskUnits);
}

export function getRegionConfig(region: "us" | "cn" | "hk" | "global"): RegionConfig {
  return watchlist.regions[region];
}

export function resolveRegion(region: string): "us" | "cn" | "hk" | "global" {
  const lower = region.toLowerCase();
  if (lower === "us") return "us";
  if (lower === "cn" || lower === "china") return "cn";
  if (lower === "hk" || lower === "hongkong") return "hk";
  return "global";
}

export function getWatchlistByRegion(region: "us" | "cn" | "hk" | "global"): WatchlistRepresentative[] {
  const config = watchlist.regions[region];
  // Map symbols to representative configs with names
  const result: WatchlistRepresentative[] = [];
  
  for (const symbol of config.symbols) {
    // Try to find in risk units first
    for (const ru of Object.values(watchlist.riskUnits)) {
      const found = ru.representatives.find(r => r.symbol === symbol);
      if (found) {
        result.push(found);
        break;
      }
    }
  }
  
  return result;
}

export function getAllWatchlistSymbols(): string[] {
  const symbols = new Set<string>();
  for (const region of Object.values(watchlist.regions)) {
    for (const sym of region.symbols) {
      symbols.add(sym);
    }
  }
  return Array.from(symbols);
}
