# SUBAGENT 任务模板（V1）

> 用于主线程下发给 subagent 的标准格式，避免口径丢失与返工。

## 任务标题
- [TYPE] 一句话（例如：`[Data/ETL] 接入 market_data.db 并写入 truth`）

## 目标（Goal）
- 期望达成的具体结果（可验收）

## 输入（Inputs）
- 文件/表/路径/接口
- 允许的数据源范围（Master/AkShare/proxy）

## 约束（Constraints）
- 状态标注：LIVE/OFF/SAMPLE/MOCK
- 不允许的行为（例如：禁止编造、禁止校准）

## 输出（Deliverables）
- 代码改动路径
- 产物路径 / API 端点
- 文档路径

## 验收（Acceptance）
- 需要通过的命令：
  - `npm run lint`
  - `npm run build`
- 数据核对 SQL / asOf 规则

## 风险点（Risks / Edge Cases）
- 可能失败原因与应对策略

## 汇报格式（1 屏内）
- DONE / RESULT / GATING / COMMIT / NEXT
