/**
 * Data Dictionary - Single Source of Truth for all Symbol/Indicator Mappings
 * 
 * Purpose: Eliminate drift between config IDs, DB columns, and API field names
 * 
 * Rules:
 * - All symbol/indicator references MUST use these canonical IDs
 * - No ad-hoc aliases (us_unemployment vs us_unemployment_rate)
 * - Display layer external sources MUST be marked as "indicative"
 */

// Data Dictionary - imports not needed, standalone types

// ============================================================================
// CANONICAL SYMBOLS (Market Data)
// ============================================================================

export const SYMBOLS = {
  // US Equities
  US_NDX: "^NDX",
  US_SPX: "^GSPC",
  US_RUT: "^RUT",
  US_VIX: "^VIX",
  
  // US Treasury Yields
  US_2Y: "US2Y",
  US_5Y: "US5Y",
  US_10Y: "US10Y",
  US_30Y: "US30Y",
  
  // CN Equities (A-shares)
  CN_HS300: "000300.SH",
  CN_500: "000905.SH",
  CN_1000: "000852.SH",
  CN_CY500: "399006.SZ",
  CN_KC50: "000688.SH",
  
  // CN Rates (ChinaBond yield curve)
  CN_2Y: "CN2Y",
  CN_5Y: "CN5Y",
  CN_10Y: "CN10Y",
  CN_CREDIT_SPREAD_5Y: "CN_CREDIT_SPREAD_5Y",
  
  // HK Equities
  HK_HSI: "HSI",
  HK_HSCEI: "HSCEI",
  HK_HSTECH: "^HSTECH",
  
  // Commodities
  COM_GOLD: "GC=F",
  COM_GOLD_SPOT: "XAUUSD=X",
  COM_SILVER: "SI=F",
  COM_OIL: "CL=F",
  COM_COPPER: "HG=F",
  COM_DJP: "DJP",
  COM_CORN: "ZC=F",
  
  // FX
  FX_DXY: "DX=F",
} as const;

export type CanonicalSymbol = typeof SYMBOLS[keyof typeof SYMBOLS];

// Reverse lookup: display name -> canonical symbol
export const SYMBOL_DISPLAY_NAMES: Record<CanonicalSymbol, string> = {
  "^NDX": "纳斯达克100",
  "^GSPC": "标普500",
  "^RUT": "罗素2000",
  "^VIX": "VIX恐慌指数",
  "US2Y": "美债2年",
  "US5Y": "美债5年",
  "US10Y": "美债10年",
  "US30Y": "美债30年",
  "000300.SH": "沪深300",
  "000905.SH": "中证500",
  "000852.SH": "中证1000",
  "399006.SZ": "创业板指",
  "000688.SH": "科创50",
  "CN2Y": "中债2年收益率",
  "CN5Y": "中债5年收益率",
  "CN10Y": "中债10年收益率",
  "CN_CREDIT_SPREAD_5Y": "AAA中短票-国债5Y利差",
  "HSI": "恒生指数",
  "HSCEI": "恒生国企指数",
  "^HSTECH": "恒生科技",
  "GC=F": "黄金期货",
  "XAUUSD=X": "现货黄金",
  "SI=F": "白银期货",
  "CL=F": "WTI原油",
  "HG=F": "伦铜",
  "DJP": "彭博商品指数",
  "ZC=F": "芝加哥玉米",
  "DX=F": "美元指数",
};

// Symbol -> Region mapping
export const SYMBOL_REGIONS: Record<CanonicalSymbol, "US" | "CN" | "HK" | "GLOBAL"> = {
  "^NDX": "US", "^GSPC": "US", "^RUT": "US", "^VIX": "US",
  "US2Y": "US", "US5Y": "US", "US10Y": "US", "US30Y": "US",
  "000300.SH": "CN", "000905.SH": "CN", "000852.SH": "CN", "399006.SZ": "CN", "000688.SH": "CN",
  "CN2Y": "CN", "CN5Y": "CN", "CN10Y": "CN", "CN_CREDIT_SPREAD_5Y": "CN",
  "HSI": "HK", "HSCEI": "HK", "^HSTECH": "HK",
  "GC=F": "GLOBAL", "XAUUSD=X": "GLOBAL", "SI=F": "GLOBAL", "CL=F": "GLOBAL", 
  "HG=F": "GLOBAL", "DJP": "GLOBAL", "ZC=F": "GLOBAL",
  "DX=F": "GLOBAL",
};

// Symbol -> Category mapping
export const SYMBOL_CATEGORIES: Record<CanonicalSymbol, "EQUITY" | "BOND" | "COMMODITY" | "FX"> = {
  "^NDX": "EQUITY", "^GSPC": "EQUITY", "^RUT": "EQUITY", "^VIX": "EQUITY",
  "US2Y": "BOND", "US5Y": "BOND", "US10Y": "BOND", "US30Y": "BOND",
  "000300.SH": "EQUITY", "000905.SH": "EQUITY", "000852.SH": "EQUITY", "399006.SZ": "EQUITY", "000688.SH": "EQUITY",
  "CN2Y": "BOND", "CN5Y": "BOND", "CN10Y": "BOND", "CN_CREDIT_SPREAD_5Y": "BOND",
  "HSI": "EQUITY", "HSCEI": "EQUITY", "^HSTECH": "EQUITY",
  "GC=F": "COMMODITY", "XAUUSD=X": "COMMODITY", "SI=F": "COMMODITY", "CL=F": "COMMODITY",
  "HG=F": "COMMODITY", "DJP": "COMMODITY", "ZC=F": "COMMODITY",
  "DX=F": "FX",
};

// Symbol -> Preferred Data Source
export const SYMBOL_DATA_SOURCES: Record<CanonicalSymbol, "supabase" | "fred" | "chinamoney" | "eastmoney" | "yahoo"> = {
  "^NDX": "yahoo", "^GSPC": "yahoo", "^RUT": "yahoo", "^VIX": "yahoo",
  "US2Y": "fred", "US5Y": "fred", "US10Y": "fred", "US30Y": "fred",
  "000300.SH": "eastmoney", "000905.SH": "eastmoney", "000852.SH": "eastmoney", "399006.SZ": "eastmoney", "000688.SH": "eastmoney",
  "CN2Y": "chinamoney", "CN5Y": "chinamoney", "CN10Y": "chinamoney", "CN_CREDIT_SPREAD_5Y": "chinamoney",
  "HSI": "eastmoney", "HSCEI": "eastmoney", "^HSTECH": "eastmoney",
  "GC=F": "yahoo", "XAUUSD=X": "yahoo", "SI=F": "yahoo", "CL=F": "yahoo",
  "HG=F": "yahoo", "DJP": "yahoo", "ZC=F": "yahoo",
  "DX=F": "yahoo",
};

// ============================================================================
// CANONICAL INDICATORS (Macro Data)
// ============================================================================

export const INDICATORS = {
  // US Indicators
  US_ISM_SERVICES_PMI: "us_ism_services_pmi",
  US_ISM_MANUFACTURING_PMI: "us_ism_manufacturing_pmi",
  US_UNEMPLOYMENT_RATE: "us_unemployment_rate",
  US_CORE_PCE_YOY: "us_core_pce_yoy",
  US_CPI_YOY: "us_cpi_yoy",
  US_CORE_CPI_YOY: "us_core_cpi_yoy",
  US_SOFR: "us_sofr",
  US_FED_FUNDS_RATE: "us_fed_funds_rate",
  US_10Y_YIELD: "us_10y_yield",
  US_2Y_YIELD: "us_2y_yield",
  US_M2_YOY: "us_m2_yoy",
  US_FCI: "us_fci",
  
  // CN Indicators
  CN_PMI_MFG: "cn_pmi_mfg",
  CN_PMI_SERVICES: "cn_pmi_services",
  CN_CPI_YOY: "cn_cpi_yoy",
  CN_PPI_YOY: "cn_ppi_yoy",
  CN_LPR_1Y: "cn_lpr_1y",
  CN_LPR_5Y: "cn_lpr_5y",
  CN_MLF_RATE: "cn_mlf_rate",
  CN_SLF_RATE: "cn_slf_rate",
  CN_M2_YOY: "cn_m2_yoy",
  CN_SHIBOR_OVERNIGHT: "cn_shibor_overnight",
  
  // CN Rates (Yield Curve)
  CN_YIELD_2Y: "cn_yield_2y",
  CN_YIELD_5Y: "cn_yield_5y",
  CN_YIELD_10Y: "cn_yield_10y",
  CN_CREDIT_SPREAD_5Y: "cn_credit_spread_5y",
} as const;

export type CanonicalIndicator = typeof INDICATORS[keyof typeof INDICATORS];

// Indicator -> DB Column Mapping (for Supabase queries)
export const INDICATOR_DB_COLUMNS: Record<CanonicalIndicator, string> = {
  // US
  "us_ism_services_pmi": "ism_services",
  "us_ism_manufacturing_pmi": "ism_manufacturing",
  "us_unemployment_rate": "unemployment_rate",
  "us_core_pce_yoy": "core_pce_yoy",
  "us_cpi_yoy": "cpi_yoy",
  "us_core_cpi_yoy": "core_cpi_yoy",
  "us_sofr": "sofr",
  "us_fed_funds_rate": "fed_funds_rate",
  "us_10y_yield": "yield_10y",
  "us_2y_yield": "yield_2y",
  "us_m2_yoy": "m2_yoy",
  "us_fci": "fci",
  
  // CN
  "cn_pmi_mfg": "pmi",
  "cn_pmi_services": "pmi_services",
  "cn_cpi_yoy": "cpi_yoy",
  "cn_ppi_yoy": "ppi_yoy",
  "cn_lpr_1y": "lpr_1y",
  "cn_lpr_5y": "lpr_5y",
  "cn_mlf_rate": "mlf_rate",
  "cn_slf_rate": "slf_rate",
  "cn_m2_yoy": "m2_yoy",
  "cn_shibor_overnight": "shibor_overnight",
  
  // CN Rates
  "cn_yield_2y": "yield_2y",
  "cn_yield_5y": "yield_5y",
  "cn_yield_10y": "yield_10y",
  "cn_credit_spread_5y": "credit_spread_5y",
};

// DB Column -> Indicator Reverse Lookup
export const DB_COLUMN_TO_INDICATOR: Record<string, CanonicalIndicator> = Object.fromEntries(
  Object.entries(INDICATOR_DB_COLUMNS).map(([ind, col]) => [col, ind as CanonicalIndicator])
) as Record<string, CanonicalIndicator>;

// Indicator Display Names
export const INDICATOR_DISPLAY_NAMES: Record<CanonicalIndicator, { name: string; name_cn: string; unit: string }> = {
  "us_ism_services_pmi": { name: "US ISM Services PMI", name_cn: "美国ISM非制造业PMI", unit: "idx" },
  "us_ism_manufacturing_pmi": { name: "US ISM Manufacturing PMI", name_cn: "美国ISM制造业PMI", unit: "idx" },
  "us_unemployment_rate": { name: "US Unemployment Rate", name_cn: "美国失业率", unit: "%" },
  "us_core_pce_yoy": { name: "US Core PCE YoY", name_cn: "美国核心PCE同比", unit: "%" },
  "us_cpi_yoy": { name: "US CPI YoY", name_cn: "美国CPI同比", unit: "%" },
  "us_core_cpi_yoy": { name: "US Core CPI YoY", name_cn: "美国核心CPI同比", unit: "%" },
  "us_sofr": { name: "US SOFR", name_cn: "美国担保隔夜融资利率", unit: "%" },
  "us_fed_funds_rate": { name: "US Fed Funds Rate", name_cn: "美国联邦基金利率", unit: "%" },
  "us_10y_yield": { name: "US 10Y Treasury Yield", name_cn: "美国10年期国债收益率", unit: "%" },
  "us_2y_yield": { name: "US 2Y Treasury Yield", name_cn: "美国2年期国债收益率", unit: "%" },
  "us_m2_yoy": { name: "US M2 YoY", name_cn: "美国M2同比", unit: "%" },
  "us_fci": { name: "US Financial Conditions Index", name_cn: "美国金融条件指数", unit: "idx" },
  "cn_pmi_mfg": { name: "CN PMI Manufacturing", name_cn: "中国制造业PMI", unit: "idx" },
  "cn_pmi_services": { name: "CN PMI Services", name_cn: "中国非制造业PMI", unit: "idx" },
  "cn_cpi_yoy": { name: "CN CPI YoY", name_cn: "中国CPI同比", unit: "%" },
  "cn_ppi_yoy": { name: "CN PPI YoY", name_cn: "中国PPI同比", unit: "%" },
  "cn_lpr_1y": { name: "CN LPR 1Y", name_cn: "中国贷款市场报价利率(1年期)", unit: "%" },
  "cn_lpr_5y": { name: "CN LPR 5Y", name_cn: "中国贷款市场报价利率(5年期)", unit: "%" },
  "cn_mlf_rate": { name: "CN MLF Rate", name_cn: "中国中期借贷便利利率", unit: "%" },
  "cn_slf_rate": { name: "CN SLF Rate", name_cn: "中国常备借贷便利利率", unit: "%" },
  "cn_m2_yoy": { name: "CN M2 YoY", name_cn: "中国M2同比", unit: "%" },
  "cn_shibor_overnight": { name: "CN SHIBOR Overnight", name_cn: "中国隔夜SHIBOR", unit: "%" },
  "cn_yield_2y": { name: "CN 2Y Treasury Yield", name_cn: "中债2年收益率", unit: "%" },
  "cn_yield_5y": { name: "CN 5Y Treasury Yield", name_cn: "中债5年收益率", unit: "%" },
  "cn_yield_10y": { name: "CN 10Y Treasury Yield", name_cn: "中债10年收益率", unit: "%" },
  "cn_credit_spread_5y": { name: "CN AAA-5Y Credit Spread", name_cn: "AAA中短票-国债5Y利差", unit: "bp" },
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate symbol is canonical
 */
export function isCanonicalSymbol(s: string): s is CanonicalSymbol {
  return Object.values(SYMBOLS).includes(s as CanonicalSymbol);
}

/**
 * Validate indicator is canonical
 */
export function isCanonicalIndicator(i: string): i is CanonicalIndicator {
  return Object.values(INDICATORS).includes(i as CanonicalIndicator);
}

/**
 * Get canonical symbol or throw
 */
export function canonicalizeSymbol(s: string): CanonicalSymbol {
  if (isCanonicalSymbol(s)) return s;
  throw new Error(`Invalid canonical symbol: ${s}`);
}

/**
 * Get canonical indicator or throw
 */
export function canonicalizeIndicator(i: string): CanonicalIndicator {
  if (isCanonicalIndicator(i)) return i;
  throw new Error(`Invalid canonical indicator: ${i}`);
}

/**
 * Get all CN rate symbols
 */
export function getCnRateSymbols(): CanonicalSymbol[] {
  return [SYMBOLS.CN_2Y, SYMBOLS.CN_5Y, SYMBOLS.CN_10Y, SYMBOLS.CN_CREDIT_SPREAD_5Y];
}

/**
 * Get all US Treasury symbols
 */
export function getUsTreasurySymbols(): CanonicalSymbol[] {
  return [SYMBOLS.US_2Y, SYMBOLS.US_5Y, SYMBOLS.US_10Y, SYMBOLS.US_30Y];
}
