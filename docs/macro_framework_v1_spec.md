
# Macro Framework V1 Spec

## 1. 宏观分析框架 (Macro-Analytical Framework)

本框架旨在建立一个系统化的流程，用于定义、监测和响应全球宏观经济状态，特别是聚焦于中美两大经济体。框架的核心是“两轴一哨兵”模型：

*   **A. 主轴 (Primary Axis): 增长 (Growth) × 通胀 (Inflation)**
    *   这是决定大类资产长期回报的核心驱动力。我们将经济体分为四个象限：复苏（增长上、通胀下）、过热（增长上、通胀上）、滞胀（增长下、通胀上）、衰退（增长下、通胀下）。
*   **B. 副轴 (Secondary Axis): 政策 (Policy) × 流动性 (Liquidity)**
    *   这是影响市场短期波动和资产价格的关键变量。我们监控主要央行的政策立场（鹰派/鸽派）以及金融体系的流动性状况（宽松/紧张）。
*   **C. 监视列表 (Watchlist)**
    *   包含一系列高频、高敏感性或具有前瞻性的指标，用于预警、验证或对冲主副轴的判断。

---

## 2. 核心指标体系 (Core Indicator System)

### 2.1 美国 (United States)

#### 2.1.1 增长 (Growth)

*   **主指标 (Primary): ISM Services PMI**
    *   **定义**: 供应管理协会服务业采购经理人指数，反映了美国服务业的商业活动景气度。
    *   **频率**: 每月发布 (Monthly)
    *   **来源**: ISM (Institute for Supply Management)
    *   **质量标签 (Quality Tag)**: `tier_1`, `high_frequency`, `market_mover`
    *   **阈值建议**:
        *   `> 55`: 强劲扩张
        *   `50 - 55`: 温和扩张
        *   `45 - 50`: 收缩警告
        *   `< 45`: 确认收缩
    *   **反证条件**: 当月的非农就业数据（尤其是服务业分项）与ISM服务业就业分项出现显著背离。

*   **辅助指标 (Secondary)**:
    1.  **Conference Board Consumer Confidence Index**: 消费者信心，反映未来消费支出意愿。
    2.  **Initial Jobless Claims (4-week moving average)**: 初请失业金人数四周移动平均，反映劳动力市场边际变化。
    3.  **Real Personal Consumption Expenditures (PCE)**: 真实的个人消费支出，反映居民实际购买力。

---

#### 2.1.2 通胀 (Inflation)

*   **主指标 (Primary): Core PCE Price Index (YoY)**
    *   **定义**: 个人消费支出物价指数（核心，剔除食品和能源），是美联储最关注的通胀指标。
    *   **频率**: 每月发布 (Monthly)
    *   **来源**: BEA (Bureau of Economic Analysis)
    *   **质量标签 (Quality Tag)**: `tier_1`, `fed_preferred`, `official_data`
    *   **阈值建议**:
        *   `> 3.0%`: 高通胀压力
        *   `2.0% - 3.0%`: 温和通胀
        *   `< 2.0%`: 通胀偏低
    *   **反证条件**: 当月的核心CPI年率数据与核心PCE出现超过50个基点的持续背离。

*   **辅助指标 (Secondary):**
    1.  **CPI (YoY)**: 消费者物价指数，市场更熟悉的高频通胀数据。
    2.  **5-Year, 5-Year Forward Inflation Expectation Rate**: 5年期/5年远期通胀预期，反映市场对未来长期通胀的看法。
    3.  **WTI Crude Oil Prices**: WTI原油价格，作为通胀的前瞻性输入项。

---

#### 2.1.3 政策 (Policy)

*   **主指标 (Primary): SOFR (Secured Overnight Financing Rate)**
    *   **定义**: 有担保隔夜融资利率，已取代LIBOR成为美元融资市场基准利率，反映了广泛的银行系统融资成本。
    *   **频率**: 每日 (Daily)
    *   **来源**: Federal Reserve Bank of New York
    *   **质量标签 (Quality Tag)**: `tier_1`, `benchmark_rate`, `financial_plumbing`
    *   **阈值建议**: 监控其相对于联邦基金利率目标区间上限的偏离度。持续高于上限可能意味着融资市场出现压力。
    *   **反证条件**: FRA-OIS利差并未同步扩大，表明SOFR的波动可能更多是技术性的而非系统性的。

*   **辅助指标 (Secondary):**
    1.  **Effective Federal Funds Rate (EFFR)**: 联邦基金有效利率，央行政策利率的直接体现。
    2.  **OIS (Overnight Index Swap) rates**: 隔夜指数掉期利率，反映市场对未来联邦基金利率的预期。
    3.  **Fed Balance Sheet Size**: 美联储资产负债表规模，反映量化宽松/紧缩的力度。

---

### 2.2 中国 (China)

#### 2.2.1 信用 (Credit)

*   **主指标 (Primary): AAA-rated 3Y Medium-Term Notes Yield Spread vs. 5Y Government Bond**
    *   **定义**: 3年期AAA级企业中短期票据收益率与5年期国债收益率之间的利差。这是衡量中国高质量信用主体融资成本与无风险利率差异的关键指标，反映了信用市场的风险偏好和宽松程度。
    *   **频率**: 每日 (Daily)
    *   **来源**: CFETS (China Foreign Exchange Trade System), CCDC (China Central Depository & Clearing)
    *   **质量标签 (Quality Tag)**: `tier_1`, `credit_risk_premium`, `domestic_focus`
    *   **阈值建议**:
        *   `< 50 bps`: 信用环境非常宽松
        *   `50 - 80 bps`: 信用环境相对宽松
        *   `80 - 120 bps`: 信用环境趋紧
        *   `> 120 bps`: 信用警报
    *   **反证条件**: 如果利差扩大主要由国债收益率下行导致，而非企业债收益率上行，则可能反映的是避险情绪而非信用风险恶化。

*   **辅助指标 (Secondary):**
    1.  **Total Social Financing (TSF) Growth (YoY)**: 社会融资规模存量同比增速，反映实体经济从金融体系获得资金的总量。
    2.  **M2 Money Supply Growth (YoY)**: 广义货币供应量同比增速。
    3.  **1-Year LPR (Loan Prime Rate)**: 一年期贷款市场报价利率，作为实体贷款的定价基准。

---

## 3. 配置Schema建议 (Config JSON Schema Proposal)

为了将上述框架转化为机器可读的配置，建议使用以下JSON Schema结构。

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Macro Framework Indicator Configuration",
  "description": "Configuration for core macroeconomic indicators used in the analytical framework.",
  "type": "object",
  "properties": {
    "indicators": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/indicator"
      }
    }
  },
  "definitions": {
    "indicator": {
      "type": "object",
      "required": [
        "id",
        "name",
        "geography",
        "category",
        "isPrimary",
        "definition",
        "frequency",
        "source",
        "qualityTags"
      ],
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique identifier for the indicator (e.g., 'us_growth_ism_services')."
        },
        "name": {
          "type": "string",
          "description": "Full name of the indicator (e.g., 'ISM Services PMI')."
        },
        "geography": {
          "type": "string",
          "enum": ["US", "CN", "Global"]
        },
        "category": {
          "type": "string",
          "enum": ["Growth", "Inflation", "Policy", "Credit", "Watchlist"]
        },
        "isPrimary": {
          "type": "boolean",
          "description": "True if this is a primary indicator for its category, otherwise false."
        },
        "definition": {
          "type": "string"
        },
        "frequency": {
          "type": "string",
          "enum": ["Daily", "Weekly", "Monthly", "Quarterly"]
        },
        "source": {
          "type": "string",
          "description": "Data provider or source institution."
        },
        "qualityTags": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "thresholds": {
          "type": "object",
          "properties": {
            "strong": { "type": "string", "description": "e.g., '> 55' or '< 50 bps'" },
            "moderate": { "type": "string" },
            "weak": { "type": "string" },
            "alarm": { "type": "string" }
          },
          "description": "Thresholds for classifying the indicator's state."
        },
        "counterSignal": {
          "type": "string",
          "description": "Condition or related indicator that would challenge the primary signal."
        }
      }
    }
  }
}
```

### 示例 (Example)

```json
{
  "indicators": [
    {
      "id": "us_growth_ism_services",
      "name": "ISM Services PMI",
      "geography": "US",
      "category": "Growth",
      "isPrimary": true,
      "definition": "The ISM Services PMI monitors the business activity and sentiment in the US services sector.",
      "frequency": "Monthly",
      "source": "Institute for Supply Management (ISM)",
      "qualityTags": ["tier_1", "high_frequency", "market_mover"],
      "thresholds": {
        "strong": "> 55",
        "moderate": "50 - 55",
        "weak": "45 - 50",
        "alarm": "< 45"
      },
      "counterSignal": "Significant divergence from Non-Farm Payrolls (services component)."
    },
    {
      "id": "cn_credit_aaa_spread",
      "name": "AAA-rated 3Y MTN Yield Spread vs. 5Y Govt Bond",
      "geography": "CN",
      "category": "Credit",
      "isPrimary": true,
      "definition": "Measures the spread between high-grade corporate debt and risk-free rate, indicating credit market health.",
      "frequency": "Daily",
      "source": "CFETS, CCDC",
      "qualityTags": ["tier_1", "credit_risk_premium", "domestic_focus"],
      "thresholds": {
        "strong": "< 50 bps",
        "moderate": "50 - 80 bps",
        "weak": "80 - 120 bps",
        "alarm": "> 120 bps"
      },
      "counterSignal": "Spread widening is driven by sovereign yield collapse rather than corporate yield jump."
    }
  ]
}
```
