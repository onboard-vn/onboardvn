---
phase: 2
title: "Score engine thuần TS"
status: pending
effort: "2.5d"
dependencies: []
---
# Phase 2: Score engine (packages/shared)

## Context
- Schema template: [data/staging/score-templates/schema.json](../../data/staging/score-templates/schema.json) (mode, winRule, scoringStyle, rounds, categories[input/formula], tiebreakers, sharedVictoryOnTie).
- Research: [per-game calculators](../reports/researcher-261002-1149-per-game-score-calculators.md) — gap BG Stats: công thức tự động, set collection, tiebreaker, coop/team.
- Không DB, không HTTP → chạy song song phase 1. Không đụng `packages/shared/src/index.ts` (phase 3 thêm export).

## Requirements
- `scoreTemplateSchema` (Zod 4) mirror 1:1 schema.json; test so khớp schema.json (cùng required/enum) để tránh drift.
- `computeScores(template, input) → ScoreResult` thuần, deterministic:
  - input: `{players:[{id, teamKey?}], values:{[playerOrTeamId]:{[categoryKey]: number|number[]|boolean|Record<string,number>}}, outcome?: 'win'|'loss', manualWinners?: string[]}`.
  - formula: `sum` (repeating → cộng mảng), `multiply` (count × points), `table` (count → points, khóa `N+`), `setCollection`/`expr` (qua evaluator), `exclusiveBonus` (người có value cao nhất nhận points; hòa theo hint → chia hoặc cùng nhận, mặc định cùng nhận).
  - `countsToTotal=false` → chỉ hiển thị/tiebreak.
  - `rounds.aggregate`: `sum|best|rounds-won`.
  - mode: competitive/solo (rank theo winRule highest/lowest), coop (`outcome` chung, tổng tùy chọn), team (cộng theo `teamKey`, rank team), hidden-traitor/`winRule=objective|none` (dùng `manualWinners`).
  - Tiebreakers theo thứ tự `{categoryKey, dir}`; không giải được → `sharedVictoryOnTie` ? cùng thắng : `tieUnresolved=true` (UI cho chọn tay).
  - Output: `{perPlayer:[{id, categories:{key:points}, total, rank}], teams?, winners:[id], tieUnresolved}`.
- Evaluator an toàn: `jsep` parse → evaluator AST whitelist (Literal, Identifier ∈ category keys/inputs, Binary `+ - * /`, Unary `-`, Call ∈ `min max floor ceil pow sum`); cấm Member/this/khác; giới hạn độ dài 500, độ sâu 32; chia 0 → 0 + cảnh báo. Không `eval`/`Function`. Fallback: tự viết Pratt parser nếu jsep không hợp ESM/TS6.
- `validateTemplate(t)`: Zod + kiểm tham chiếu (expr chỉ dùng key tồn tại, tiebreaker key tồn tại, key unique).
- Research + vector được làm theo **lô đồng nhất `scoringFamily × weightBand`** (enum từ phase 3; engine không phụ thuộc DB nên tham chiếu enum qua `packages/shared`): mỗi family có ≥1 template mẫu + vector để phủ đủ dạng formula trước khi nhân rộng.
- Test vectors: `packages/shared/src/scoring/vectors/<slug>.json` = `{template:slug, cases:[{input, expected}]}`, ưu tiên ví dụ chấm điểm trong rulebook (ghi nguồn). Test lặp mọi `data/staging/score-templates/*.json` (trừ schema.json): thiếu vector → fail.

## Files
- Create: `packages/shared/src/scoring/{template-schema,compute,expr,validate,index}.ts`, `packages/shared/src/scoring/{compute,expr,template-schema}.test.ts`, `packages/shared/src/scoring/vectors/*.json`.
- Modify: `packages/shared/package.json` (dep `jsep`, test script nếu chưa có).

## Steps
1. Zod schema + test đối chiếu schema.json. 2. Evaluator + test bảo mật/fuzz cơ bản. 3. `computeScores` theo từng formula/mode. 4. Tiebreaker/shared victory. 5. Vector runner + vector cho template đang có trong staging.

## Validation
- Unit: mỗi formula, mỗi mode, tiebreak nhiều tầng, lowest-wins, team, coop thua, exclusiveBonus hòa, `7+` table, expr độc hại (`constructor`, `a.b`, `x()`, chuỗi dài) → throw `ScoreTemplateError`.
- Vector runner pass cho mọi template staging. Coverage `scoring/` ≥ 90% dòng.

## Risks
| Risk | L×I | Mitigation |
|---|---|---|
| Schema.json không đủ diễn tả game (vd. Wingspan round goals) | H×M | `notes` + `needsReview`; dùng `expr`; nếu thiếu thật → bump schema v2 (field optional, backward-compatible) |
| Template staging chưa có/ít | M×M | engine test bằng template mẫu tự viết; seed thêm dần |
| Drift Zod ↔ schema.json | M×M | test đối chiếu tự động |

## Rollback
Thuần thư viện, chưa ai dùng → revert commit.

## Open questions
- Hòa `exclusiveBonus` mặc định cùng nhận hay chia? (đề xuất: theo template, mặc định cùng nhận).
