/**
 * Event Response Templates — Four-Dimension Macro Framework
 * 
 * For each major macro event, defines:
 * - triggerDimension: which of the 4 dimensions is primarily affected
 * - scenarios: 3 outcomes (beat/inline/miss) with transmission paths,
 *   risk unit impacts, and action checklists
 * 
 * Source: locked by 杨总 2026-03-14. Do not modify without sign-off.
 */

export type RiskUnitImpact = "↑强" | "↓弱" | "→中性" | "↓↓风险" | "↑↑机会" | "?不确定";

export interface RiskUnits {
  usEquity: RiskUnitImpact;
  cnEquity: RiskUnitImpact;
  usBond: RiskUnitImpact;
  cnBond: RiskUnitImpact;
  commodity: RiskUnitImpact;
  gold: RiskUnitImpact;
}

export interface EventScenario {
  label: string;           // e.g. "高于预期（鹰派冲击）"
  trigger: string;         // e.g. "Core CPI > 预期 +0.2ppt 以上"
  probability: string;     // indicative, e.g. "35%"
  macroRegimeShift: string; // e.g. "Risk-OFF 倾向加强"
  transmission: string[];  // step-by-step transmission chain
  riskUnits: RiskUnits;
  checkList: string[];     // action items for portfolio
  keyLevels: string[];     // key price/yield levels to watch
}

export interface EventTemplate {
  eventType: string;
  displayName: string;
  description: string;
  triggerDimension: "inflation" | "policy" | "growth" | "liquidity";
  frequency: string;       // e.g. "每月第二周"
  leadTime: string;        // e.g. "前1日收盘前完成仓位确认"
  scenarios: [EventScenario, EventScenario, EventScenario]; // [beat, inline, miss]
}

// ============================================================================
// CPI — US Consumer Price Index
// ============================================================================
export const CPI_TEMPLATE: EventTemplate = {
  eventType: "US_CPI",
  displayName: "美国 CPI",
  description: "美国消费者价格指数，是美联储通胀判断的核心参考之一。Core CPI（剔除食品能源）为主口径。",
  triggerDimension: "inflation",
  frequency: "每月第二周（月度）",
  leadTime: "数据发布前1个交易日收盘前完成仓位确认",
  scenarios: [
    {
      label: "高于预期（鹰派冲击）",
      trigger: "Core CPI MoM > 预期 +0.2ppt 以上，或 YoY > 预期 +0.3ppt",
      probability: "~30%（当前通胀黏性环境下）",
      macroRegimeShift: "Risk-OFF 倾向加强，降息预期回撤",
      transmission: [
        "1️⃣ 通胀超预期 → 市场重新定价降息时间表（推迟）",
        "2️⃣ 短端利率预期上移 → 美债收益率曲线熊平（2Y领涨）",
        "3️⃣ 美债价格↓（TLT/IEF承压） → 组合 Beta 中 US Bond 单元负贡献",
        "4️⃣ 美元指数↑（USD强势） → 新兴市场资本外流压力，CNY承压",
        "5️⃣ 黄金短期承压（实际利率↑） → 但若通胀预期锚失控则金中期转↑",
        "6️⃣ 美股估值承压（折现率↑），成长>价值受损；能源/原材料相对抗跌",
      ],
      riskUnits: {
        usEquity: "↓弱",
        cnEquity: "↓弱",
        usBond: "↓↓风险",
        cnBond: "→中性",
        commodity: "→中性",
        gold: "↓弱",
      },
      checkList: [
        "⚠️ 确认 US Bond 敞口是否超配 — 超配则考虑减短久期",
        "⚠️ 评估 Gold 对冲比例 — 短期承压但中期通胀对冲价值↑，不建议大幅减仓",
        "📋 检查 CN Equity 联动风险 — USD↑ + 全球 risk-off 叠加 A股脆弱期？",
        "📋 确认 Commodity 仓位 — 能源/铜在通胀环境下有相对优势",
        "📌 更新 Decision Log：记录本次通胀数据、Regime 判断及应对决策",
      ],
      keyLevels: [
        "US10Y 收益率 4.5% — 突破则债市抛压加剧",
        "DXY 105 — 上破则 EM/商品联动压力",
        "Gold $2,850 — 跌破关注实际利率进一步上行空间",
      ],
    },
    {
      label: "符合预期（中性，维持观望）",
      trigger: "Core CPI MoM 在预期 ±0.1ppt 以内",
      probability: "~45%",
      macroRegimeShift: "Regime 维持，无方向性冲击",
      transmission: [
        "1️⃣ 数据符合预期 → 降息时间表无重大重定价",
        "2️⃣ 市场短暂波动后回归前一日趋势",
        "3️⃣ 各大类资产无系统性方向冲击",
        "4️⃣ 注意：'会说话的数据' — 细看分项（住房/超核心服务）",
      ],
      riskUnits: {
        usEquity: "→中性",
        cnEquity: "→中性",
        usBond: "→中性",
        cnBond: "→中性",
        commodity: "→中性",
        gold: "→中性",
      },
      checkList: [
        "📋 深看 CPI 分项：住房（Shelter）/ 超核心服务趋势是否松动",
        "📋 更新宏观 Regime 置信度 — 中性数据是否改变原有判断？",
        "📌 Decision Log 记录：'数据符合预期，维持当前配置'",
        "👁️ 关注下周核心事件：PPI / FOMC 纪要 / 零售销售",
      ],
      keyLevels: [
        "重点观察分项趋势，而非总量",
        "留意 Bond 市场成交量 — 缩量反弹 vs 放量突破",
      ],
    },
    {
      label: "低于预期（鸽派缓解）",
      trigger: "Core CPI MoM < 预期 -0.2ppt 以上，或 YoY < 预期 -0.3ppt",
      probability: "~25%",
      macroRegimeShift: "Risk-ON 倾向加强，降息预期提前",
      transmission: [
        "1️⃣ 通胀低于预期 → 降息时间表前移，宽松预期升温",
        "2️⃣ 美债收益率下行（TLT/IEF价格↑） → US Bond 单元正贡献",
        "3️⃣ 美元指数承压（DXY↓） → EM/商品估值修复",
        "4️⃣ 黄金中短期双重利好：实际利率↓ + USD↓",
        "5️⃣ 成长股领涨（折现率预期下移）；美股整体 risk-on",
        "6️⃣ CN Equity 受益于 USD↓ + 全球 risk appetite 改善",
      ],
      riskUnits: {
        usEquity: "↑强",
        cnEquity: "↑强",
        usBond: "↑↑机会",
        cnBond: "↑强",
        commodity: "↑强",
        gold: "↑↑机会",
      },
      checkList: [
        "✅ 评估是否加仓 US Bond 久期（降息预期提前）",
        "✅ Gold 仓位 — 考虑是否加码，双重顺风",
        "📋 检查 CN Equity 仓位 — 外部环境改善，是否存在低配机会",
        "⚠️ 警惕'过度乐观'风险 — 单月数据可能被下月修正",
        "📌 Decision Log 记录：通胀缓解信号 + 配置调整逻辑",
      ],
      keyLevels: [
        "US10Y 收益率 4.0% — 跌破则久期策略回报加速",
        "Gold $3,200 — 突破视为通胀叙事切换新阶段",
        "DXY 101 — 跌破则新兴市场整体修复信号",
      ],
    },
  ],
};

// ============================================================================
// FOMC — Federal Open Market Committee Meeting
// ============================================================================
export const FOMC_TEMPLATE: EventTemplate = {
  eventType: "US_FOMC",
  displayName: "美联储 FOMC",
  description: "美联储货币政策会议。重点看：利率决议、声明措辞变化、点阵图（季度）、鲍威尔发布会语气。",
  triggerDimension: "policy",
  frequency: "每年8次（约6周一次）",
  leadTime: "会议前2日完成仓位审查，避免在声明发布前30分钟内大幅操作",
  scenarios: [
    {
      label: "鹰派意外（加息 or 强硬措辞）",
      trigger: "意外加息 25bp+，或声明删除'降息将适时'措辞，或点阵图中值上移",
      probability: "~15%（当前周期末期）",
      macroRegimeShift: "Risk-OFF，流动性收紧预期强化",
      transmission: [
        "1️⃣ 鹰派信号 → 短端利率大幅重定价（2Y收益率飙升）",
        "2️⃣ 收益率曲线熊平/倒挂加深 → 信用利差走阔",
        "3️⃣ 美股估值杀估值（P/E 压缩），VIX 快速上行",
        "4️⃣ 美元指数短期强势，新兴市场资产承压",
        "5️⃣ 黄金实际利率驱动下行（短期），但若市场恐慌则避险需求支撑",
        "6️⃣ 商品（原油/铜）受需求预期下修压制",
      ],
      riskUnits: {
        usEquity: "↓↓风险",
        cnEquity: "↓弱",
        usBond: "↓↓风险",
        cnBond: "→中性",
        commodity: "↓弱",
        gold: "↓弱",
      },
      checkList: [
        "🔴 立即评估 US Bond 久期风险 — 是否需要对冲或减短",
        "🔴 VIX 若突破 25，启动组合应急评估程序",
        "⚠️ US Equity 仓位 — 鹰派超预期场景下考虑减仓或买保护",
        "📋 评估 Gold 在实际利率冲击下的净敞口",
        "📌 Decision Log：记录 FOMC 决议要点 + 应对措施 + 时间戳",
      ],
      keyLevels: [
        "US2Y 4.8% — 突破则市场完全放弃降息预期",
        "VIX 25 — 警戒线；30 — 极端压力信号",
        "SPX 5,000 — 关键支撑，失守则技术面加速",
      ],
    },
    {
      label: "符合预期（按市场定价落地）",
      trigger: "维持利率不变，声明措辞基本与前次一致，点阵图无明显变化",
      probability: "~60%",
      macroRegimeShift: "Regime 维持，短期波动后回归",
      transmission: [
        "1️⃣ 决议符合预期 → 初始波动后市场回归",
        "2️⃣ 重点转向鲍威尔发布会语气（软/硬鸽vs软/硬鹰）",
        "3️⃣ '买预期卖事实'效应可能出现，注意反向波动",
        "4️⃣ 后续重点：下次会议前的通胀/就业数据",
      ],
      riskUnits: {
        usEquity: "→中性",
        cnEquity: "→中性",
        usBond: "→中性",
        cnBond: "→中性",
        commodity: "→中性",
        gold: "→中性",
      },
      checkList: [
        "📋 精读声明全文 vs 上次声明逐字对比（变化处是信号）",
        "📋 鲍威尔发布会：关注'数据依赖'说法是否加强",
        "📋 点阵图（如为季度会议）：中值是否移动、分布是否收窄",
        "📌 Decision Log：记录关键措辞变化，更新 Regime 置信度",
      ],
      keyLevels: [
        "鲍威尔发布会 'inflation is still elevated' → 偏鹰",
        "鲍威尔发布会 'confident inflation is coming down' → 偏鸽",
      ],
    },
    {
      label: "鸽派意外（降息 or 明确宽松信号）",
      trigger: "意外降息，或明确给出降息时间表，或声明加入'将适时降息'措辞",
      probability: "~25%",
      macroRegimeShift: "Risk-ON，流动性宽松预期强化",
      transmission: [
        "1️⃣ 鸽派信号 → 降息预期前移，收益率曲线牛陡",
        "2️⃣ 美债价格大涨（TLT/IEF） → 久期资产强势",
        "3️⃣ 美元走弱 → 新兴市场+商品整体受益",
        "4️⃣ 黄金双重顺风（实际利率↓ + USD↓），金价强势",
        "5️⃣ 美股全面 risk-on，成长股领涨",
        "6️⃣ CN Equity 受益外部环境改善",
      ],
      riskUnits: {
        usEquity: "↑↑机会",
        cnEquity: "↑强",
        usBond: "↑↑机会",
        cnBond: "↑强",
        commodity: "↑强",
        gold: "↑↑机会",
      },
      checkList: [
        "✅ 加仓 US Bond 久期 — 牛陡行情最大受益方",
        "✅ Gold 仓位 — 双重顺风，考虑加码至策略上限",
        "📋 CN Equity — 外部条件改善，评估是否存在低配空间",
        "⚠️ 警惕'Good news is bad news'情景：降息若因衰退驱动，Risk-ON 可能短命",
        "📌 Decision Log：记录降息逻辑（通胀回落 vs 经济放缓）并注明差异",
      ],
      keyLevels: [
        "Gold $3,500 — 鸽派周期开启后中期目标参考",
        "US10Y 3.8% — 降息周期确立后的近期目标",
        "DXY 99 — 美元走弱趋势确认线",
      ],
    },
  ],
};

// ============================================================================
// NFP — US Non-Farm Payrolls
// ============================================================================
export const NFP_TEMPLATE: EventTemplate = {
  eventType: "US_NFP",
  displayName: "美国非农就业",
  description: "美国非农就业人数（NFP）是美联储双重使命中'最大就业'的核心观测指标。同步关注：失业率、时薪增速。",
  triggerDimension: "growth",
  frequency: "每月第一个周五",
  leadTime: "数据前日下午确认仓位，避免周五开盘前1小时内操作",
  scenarios: [
    {
      label: "超强就业（鹰派信号）",
      trigger: "新增就业 > 预期 +50k，失业率 ≤ 4.0%，时薪 MoM > 0.4%",
      probability: "~30%（劳动力市场仍偏强）",
      macroRegimeShift: "降息预期推迟，短端利率承压",
      transmission: [
        "1️⃣ 就业超强 → 美联储降息急迫性下降",
        "2️⃣ 美债短端收益率上行（2Y驱动） → 收益率曲线熊平",
        "3️⃣ 美元短期走强 → 新兴市场承压",
        "4️⃣ 美股矛盾信号：经济强（正面）vs 降息推迟（负面），成长股受压",
        "5️⃣ 时薪↑ → 通胀二次预期升温，CPI 前景复杂化",
        "6️⃣ 黄金实际利率压力，短期承压",
      ],
      riskUnits: {
        usEquity: "↓弱",
        cnEquity: "→中性",
        usBond: "↓弱",
        cnBond: "→中性",
        commodity: "→中性",
        gold: "↓弱",
      },
      checkList: [
        "⚠️ 重新评估降息时间表 — 是否需要调整久期策略",
        "⚠️ 关注时薪数据 — 若 >0.4% MoM 则通胀二次风险升温",
        "📋 US Equity 板块分化：防御/价值 > 成长/科技",
        "📌 Decision Log：记录就业数据与当前 Policy Regime 的匹配度",
      ],
      keyLevels: [
        "US2Y 4.5% — 突破则市场定价再次推迟降息至年底",
        "时薪 MoM 0.4% — 超过则触发通胀再加速担忧",
        "失业率 3.9% — 低于代表劳动力市场过热",
      ],
    },
    {
      label: "符合预期（经济软着陆叙事）",
      trigger: "新增就业在预期 ±20k 以内，失业率 4.0%-4.2%，时薪 0.2%-0.3% MoM",
      probability: "~40%",
      macroRegimeShift: "'Goldilocks' 软着陆叙事强化",
      transmission: [
        "1️⃣ 就业适中 → 软着陆预期维持，Risk-ON 基准情景",
        "2️⃣ 美债小幅波动后稳定",
        "3️⃣ 美股温和上涨，周期+成长均衡",
        "4️⃣ Gold 无明显方向冲击",
      ],
      riskUnits: {
        usEquity: "↑强",
        cnEquity: "→中性",
        usBond: "→中性",
        cnBond: "→中性",
        commodity: "↑强",
        gold: "→中性",
      },
      checkList: [
        "📋 确认当前配置是否与软着陆 Regime 匹配",
        "📋 细看行业数据：制造业 vs 服务业就业分化？",
        "📌 Decision Log：'软着陆数据印证，维持配置'",
      ],
      keyLevels: [
        "关注下周 CPI — 就业稳定 + 通胀回落 = 最佳组合",
        "VIX 15 以下 = 市场情绪健康基准",
      ],
    },
    {
      label: "就业急剧恶化（衰退信号）",
      trigger: "新增就业 < 预期 -50k，或失业率 ≥ 4.5%，或前值大幅下修",
      probability: "~30%",
      macroRegimeShift: "衰退预期升温，'Good news is bad news' 反转",
      transmission: [
        "1️⃣ 就业大幅不及预期 → 紧急降息预期升温",
        "2️⃣ 美债长端大涨（避险买盘 + 降息预期） — 注意与衰退恐慌叠加",
        "3️⃣ 美股初期暴跌（衰退恐慌），后期若降息预期主导则反弹",
        "4️⃣ 黄金避险+降息双重驱动，可能是表现最好的资产",
        "5️⃣ 商品（能源/铜）需求预期下修，承压",
        "6️⃣ USD 可能走弱（降息预期），但避险情绪下也可能走强——方向取决于速度",
      ],
      riskUnits: {
        usEquity: "↓↓风险",
        cnEquity: "↓弱",
        usBond: "↑↑机会",
        cnBond: "↑强",
        commodity: "↓弱",
        gold: "↑↑机会",
      },
      checkList: [
        "🔴 立即评估 US Equity 敞口 — 衰退叙事下估值风险",
        "✅ US Bond 久期 — 衰退场景下多头价值最大",
        "✅ Gold — 双重顺风，确认仓位是否充足",
        "⚠️ Commodity 减仓需求 — 需求预期下修",
        "📌 Decision Log：量化衰退概率判断 + 实际操作记录",
      ],
      keyLevels: [
        "失业率 4.5% — 萨姆法则（Sahm Rule）触发警戒线",
        "US10Y 3.5% — 衰退交易下的核心目标区间",
        "Gold $3,300 — 衰退+降息叠加驱动的阻力参考",
      ],
    },
  ],
};

// ============================================================================
// PMI — Purchasing Managers Index (Manufacturing & Services)
// ============================================================================
export const PMI_TEMPLATE: EventTemplate = {
  eventType: "US_PMI",
  displayName: "美国/全球 PMI",
  description: "采购经理人指数。50荣枯线以上=扩张，以下=收缩。同时关注：美国ISM制造业、Markit PMI、中国官方PMI/财新PMI。",
  triggerDimension: "growth",
  frequency: "每月月初（制造业）/ 第三个工作日（服务业）",
  leadTime: "高波动时段，提前确认仓位流动性",
  scenarios: [
    {
      label: "强劲扩张（PMI > 53，且趋势向上）",
      trigger: "美国 ISM 制造业 > 53 且 新订单分项 > 55；或 Markit PMI 超预期 +2pts",
      probability: "~25%（当前周期处于周期修复阶段）",
      macroRegimeShift: "增长加速，商品/周期资产受益",
      transmission: [
        "1️⃣ PMI 超强 → 制造业活动加速，工业需求预期上修",
        "2️⃣ 商品价格（铜/能源）率先反应，通胀预期温和上行",
        "3️⃣ 周期股领涨（材料/工业/能源），科技相对落后",
        "4️⃣ 美债收益率温和上行（增长预期驱动，非恐慌性）",
        "5️⃣ 新兴市场资产（CN Equity/商品出口国）改善",
      ],
      riskUnits: {
        usEquity: "↑强",
        cnEquity: "↑强",
        usBond: "↓弱",
        cnBond: "→中性",
        commodity: "↑↑机会",
        gold: "→中性",
      },
      checkList: [
        "✅ 商品单元 — 工业金属/能源受益，确认仓位是否低配",
        "📋 CN Equity — 全球制造周期上行，中国出口链受益",
        "⚠️ US Bond 久期 — 增长叙事下略承压，考虑缩短久期",
        "📌 Decision Log：记录 PMI 分项判断（新订单/库存/就业分项）",
      ],
      keyLevels: [
        "ISM 新订单 55 — 持续领先制造业复苏",
        "铜价 $4.5/lb — 经济扩张信号的大宗印证",
        "CN PMI > 51 — 中美制造周期共振确认",
      ],
    },
    {
      label: "温和扩张/荣枯线附近（50-53）",
      trigger: "PMI 在 50-53 区间，与预期基本一致",
      probability: "~45%",
      macroRegimeShift: "增长平稳，无明显方向性冲击",
      transmission: [
        "1️⃣ PMI 温和 → 软着陆叙事延续",
        "2️⃣ 无明显资产方向性驱动",
        "3️⃣ 重点关注：分项结构（新订单>库存 = 健康扩张）",
      ],
      riskUnits: {
        usEquity: "→中性",
        cnEquity: "→中性",
        usBond: "→中性",
        cnBond: "→中性",
        commodity: "→中性",
        gold: "→中性",
      },
      checkList: [
        "📋 深挖分项：新订单 vs 库存 vs 就业分项趋势",
        "📋 对比上月分项变化，判断动能方向",
        "📌 Decision Log：'PMI 平稳，无配置调整'",
      ],
      keyLevels: [
        "新订单-库存差值 > 5 → 领先指标看扩张",
        "新订单-库存差值 < -5 → 警惕增长动能减弱",
      ],
    },
    {
      label: "收缩区间（PMI < 50，趋势向下）",
      trigger: "PMI 跌破 50 且连续 2 个月收缩，或 ISM 制造业 < 47",
      probability: "~30%",
      macroRegimeShift: "增长担忧升温，防御/债券资产受益",
      transmission: [
        "1️⃣ PMI 持续收缩 → 制造业衰退叙事确立",
        "2️⃣ 工业商品需求预期下修（铜/能源承压）",
        "3️⃣ 美债避险买盘，收益率下行",
        "4️⃣ 黄金避险属性凸显，若同时伴随降息预期则金价强势",
        "5️⃣ 美股周期板块（制造业/工业/材料）承压",
        "6️⃣ CN Equity 受全球制造周期拖累（出口链）",
      ],
      riskUnits: {
        usEquity: "↓弱",
        cnEquity: "↓弱",
        usBond: "↑强",
        cnBond: "↑强",
        commodity: "↓↓风险",
        gold: "↑强",
      },
      checkList: [
        "🔴 Commodity 仓位 — 工业金属需求预期下修，评估减仓",
        "✅ US Bond 久期 — 增长放缓环境下累积防御价值",
        "✅ Gold 仓位 — 避险+潜在降息双重驱动",
        "⚠️ CN Equity — 出口依赖度高的板块风险上升",
        "📌 Decision Log：量化增长放缓概率，记录配置调整决策",
      ],
      keyLevels: [
        "ISM 制造业 45 — 典型衰退区间入口",
        "铜价 $3.8/lb — 需求担忧的关键支撑",
        "US10Y 4.0% — 增长担忧推动的收益率下行目标",
      ],
    },
  ],
};

// ============================================================================
// Central Bank — PBOC Policy (CN)
// ============================================================================
export const PBOC_TEMPLATE: EventTemplate = {
  eventType: "CN_PBOC",
  displayName: "中国央行政策（PBOC）",
  description: "包括：LPR 调整、MLF 操作、RRR 降准、央行工作会议表态。是中国 Regime 判断的核心政策锚。",
  triggerDimension: "policy",
  frequency: "LPR 每月20日；RRR/MLF 不定期；重要会议前后",
  leadTime: "LPR 公告日前确认 CN Bond 仓位",
  scenarios: [
    {
      label: "超预期宽松（降息/降准幅度超预期）",
      trigger: "LPR 单次下调 ≥ 20bp，或 RRR 降准 ≥ 0.5ppt，或多工具联动",
      probability: "~20%",
      macroRegimeShift: "CN 宽松周期加速，内需修复预期增强",
      transmission: [
        "1️⃣ 超预期宽松 → CN 流动性宽松预期快速修复",
        "2️⃣ CN Bond 价格上涨（收益率下行，尤其长端）",
        "3️⃣ A股房地产/银行/消费板块领涨（利率敏感）",
        "4️⃣ CNY 短期承压（宽松 → 利差收窄），但若经济复苏预期主导则CNY稳",
        "5️⃣ 黄金受益于全球宽松叙事蔓延",
        "6️⃣ HK 股受益（南下资金 + 国际资本回流）",
      ],
      riskUnits: {
        usEquity: "→中性",
        cnEquity: "↑↑机会",
        usBond: "→中性",
        cnBond: "↑↑机会",
        commodity: "↑强",
        gold: "↑强",
      },
      checkList: [
        "✅ CN Equity — 超级宽松场景下核心加仓机会",
        "✅ CN Bond — 宽松驱动，久期资产受益",
        "📋 商品 — 内需修复预期下工业金属尤其铜受益",
        "⚠️ 评估 CNY 汇率风险对 CN 资产人民币回报的影响",
        "📌 Decision Log：记录政策力度判断 + 组合再平衡逻辑",
      ],
      keyLevels: [
        "CN10Y 收益率 1.6% — 央行隐性下限参考",
        "HS300 4,800 — 政策宽松行情的短期阻力参考",
        "CNY 7.2 — 贬值压力观察线（超过则外资流出担忧）",
      ],
    },
    {
      label: "符合预期或小幅调整",
      trigger: "LPR 小幅调整 ≤ 10bp，或维持不变但央行表态偏中性宽松",
      probability: "~55%",
      macroRegimeShift: "政策预期平稳，等待更强信号",
      transmission: [
        "1️⃣ 政策符合预期，市场平稳",
        "2️⃣ 重点观察央行措辞中对'信贷扩张'/'结构性工具'的表述",
        "3️⃣ CN 资产短期无明显方向",
      ],
      riskUnits: {
        usEquity: "→中性",
        cnEquity: "→中性",
        usBond: "→中性",
        cnBond: "→中性",
        commodity: "→中性",
        gold: "→中性",
      },
      checkList: [
        "📋 深读央行声明：'适时适度'vs'加大力度'措辞变化",
        "📋 关注 MLF 利率与 LPR 的传导效率",
        "📌 Decision Log：'政策平稳，维持 CN 配置'",
      ],
      keyLevels: [
        "关注下月 LPR 日期，跟踪政策节奏",
      ],
    },
    {
      label: "政策收紧或意外按兵不动",
      trigger: "市场预期降息但 LPR 维持，或央行声明偏鹰，担忧汇率/资产泡沫",
      probability: "~25%",
      macroRegimeShift: "CN 宽松预期落空，短期 Risk-OFF",
      transmission: [
        "1️⃣ 宽松预期落空 → CN 资产短期回调",
        "2️⃣ CN Bond 收益率小幅反弹（宽松延迟）",
        "3️⃣ A股情绪降温，房地产/消费板块承压",
        "4️⃣ CNY 短期走强（收紧信号），但出口商担忧升温",
      ],
      riskUnits: {
        usEquity: "→中性",
        cnEquity: "↓弱",
        usBond: "→中性",
        cnBond: "↓弱",
        commodity: "↓弱",
        gold: "→中性",
      },
      checkList: [
        "⚠️ 评估 CN Equity 仓位 — 宽松预期落空下是否超配",
        "📋 CN Bond 久期 — 短期略承压，等待下次政策窗口",
        "📌 Decision Log：记录政策意外 + 调整逻辑",
      ],
      keyLevels: [
        "CN10Y 2.0% — 收益率反弹至此则宽松预期明显逆转",
        "HS300 4,400 — 政策预期落空的支撑参考",
      ],
    },
  ],
};

// ============================================================================
// Exports
// ============================================================================
export const ALL_EVENT_TEMPLATES: Record<string, EventTemplate> = {
  US_CPI: CPI_TEMPLATE,
  US_FOMC: FOMC_TEMPLATE,
  US_NFP: NFP_TEMPLATE,
  US_PMI: PMI_TEMPLATE,
  CN_PBOC: PBOC_TEMPLATE,
};

export const EVENT_TYPE_LIST = Object.keys(ALL_EVENT_TEMPLATES) as Array<keyof typeof ALL_EVENT_TEMPLATES>;
