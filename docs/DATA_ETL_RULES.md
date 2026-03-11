
# Data ETL Rules and Pipeline Specification

- **Version**: 1.0
- **Status**: DRAFT
- **Last Updated**: 2026-03-12

## 1. Data Pipeline Stages

The data pipeline ensures that all incoming data is processed, validated, and transformed into a reliable "source of truth" for all downstream applications, including strategy backtesting and portfolio construction. The process is strictly linear and auditable.

- **Raw**: Unprocessed data directly from the source (e.g., AkShare API, Master files).
- **Staging**: Data copied to a temporary, controlled environment for processing.
- **Clean**: Data that has undergone cleaning, validation, and normalization.
- **Truth**: The official, final, and immutable version of the data, used by all other systems.
- **Artifacts**: Processed outputs derived from the "Truth" layer, such as risk models or strategy signals.

## 2. Core Principles & Policies

### Source Priority
1.  **Master Files**: Manually uploaded and verified data files take absolute precedence.
2.  **AkShare API**: Official data fetched from the AkShare source.

### Deduplication Policy
- Data is uniquely identified by `(ticker, date)`.
- During the `Raw -> Staging -> Clean` process, if duplicate entries are found for the same identifier, the entry from the higher-priority source is retained. If duplicates exist within the same source, the most recently ingested record is used, and a warning is logged.

### Handling of Missing Data
- **Default**: No interpolation or forward-filling is applied automatically. Missing data points are logged as anomalies.
- **Explicit Imputation**: Any imputation must be explicitly configured and performed at the "Artifacts" stage, not on the "Truth" data itself.

### Anomaly Logging
Any data point that is removed, modified, or identified as an outlier during the cleaning process is logged with the following information:
- Timestamp
- Source
- Ticker & Date
- Original Value
- Reason for anomaly (e.g., "duplicate", "data type mismatch", "outlier threshold exceeded")

### No Numeric Calibration by Default
The `Clean -> Truth` pipeline **does not** perform any numerical adjustments, calibrations, or transformations (e.g., converting to a different currency, adjusting for inflation). The "Truth" layer must reflect the original data as accurately as possible. All such transformations are the responsibility of downstream "Artifacts" generation.
