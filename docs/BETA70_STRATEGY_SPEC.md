
# Beta 7.0 Strategy Specification

- **Version**: 2.0
- **Status**: SAMPLE
- **Last Updated**: 2026-03-12

## 1. Core Engine Rules

Beta 7.0 is a multi-asset risk parity strategy designed for the Sino-US markets. It operates on a monthly rebalancing cycle with a 120-day lookback period for risk calculations.

### 1.1. Risk Parity Structure

The strategy employs a two-level risk parity allocation:
1.  **Internal (Asset-Class Level)**: Risk is balanced *within* the Chinese and US equity risk units.
    -   **CN Equity**: HS300 + ZZ500
    -   **US Equity**: SPX + NDX
2.  **Unit-Level (Portfolio Level)**: Equal risk contribution is targeted across the six core risk units:
    -   CN Equity Cluster
    -   CN Bonds
    -   US Equity Cluster
    -   US Bonds
    -   Commodities
    -   Gold

### 1.2. Risk Model
- **Covariance Matrix Estimation**: The strategy uses the **Ledoit-Wolf** shrinkage estimator implemented via `sklearn.covariance.LedoitWolf`.
- **Lookback Period**: 120 trading days.
- **Rebalancing Frequency**: Monthly.

## 2. Status Labeling and Proxy Policy

### 2.1. Status Labels
- **SAMPLE**: The strategy is under evaluation. It may use proxy data, and its parameters are subject to change. Not approved for live trading.
- **LIVE**: The strategy has been audited, validated, and approved for live capital allocation. It operates only on "Truth" data.

### 2.2. Proxy Data Policy
- During the **SAMPLE** phase, proxy data is permitted to fill gaps in the historical "Truth" data.
- **Current Proxy Rule**:
    -   **US 10-Year Treasury Futures (TY00Y)**: Data for this instrument is sourced via the AkShare API. As this is not a direct "Master File" source, any portfolio utilizing this data remains in **SAMPLE** status.

## 3. Audit & Promotion Checklist (SAMPLE -> LIVE)

- [ ] All data sources are confirmed to be from the "Truth" layer (no proxies).
- [ ] Backtest results have been audited and approved by the investment committee.
- [ ] Model parameters (lookback period, rebalancing frequency) are finalized.
- [ ] The `Version` number is updated.
- [ ] The `Status` field is changed from `SAMPLE` to `LIVE`.
- [ ] The `Last Updated` field is set to the current date.
