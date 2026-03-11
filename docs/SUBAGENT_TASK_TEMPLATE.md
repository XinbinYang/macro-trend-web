# SUBAGENT Task Template

把下面模板复制给 subagent，确保可并行、可集成、可验收。

---

## Task
一句话目标：

## Scope (allowed changes)
- Allowed paths:
  - 
- Forbidden paths:
  - 

## Constraints
- Must: LIVE/AI/SAMPLE/MOCK/OFF 显式标注
- Must: AI 必须真 AI（失败=OFF，不准冒充）
- Must: 不改动未授权路径

## Deliverables
- Changes summary (<=5 bullets)
- Files changed (list)
- Verification steps (URLs / API / screenshots)
- Risks & rollback notes

## Acceptance Criteria
- Lint/build should pass after Main integration
- UI 不误导：写死数据必须 SAMPLE/—

