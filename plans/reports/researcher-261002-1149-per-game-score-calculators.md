# Per-game score calculators — research (2026-10-02)

## BG Stats scoresheets
- Per-game built-in templates (count unverified: 660+ per v4 blog, 3100+ per snippet) + Generic sheet + Rounds sheet.
- Row types: repeating, radio (one player), checkbox (multi), non-scoring. Cells accept + − × ÷ expressions.
- Variants/maps/languages per template.
- Limits: no user-created sheets (maybe outdated), no auto tiebreakers, no "count × pts" calc, no documented co-op/team.
- Sharing via image/play file only; no template marketplace.
- Gap = auto formulas, set collection, tiebreakers, co-op/team.

## Similar apps
| App | Platform | Cost | OSS | Notes |
|---|---|---|---|---|
| ScorePal | Android | Free | No | custom sheets, 10k+ templates claimed, BGG sync, low-score-wins, co-op. Closest match |
| MeepleStats | Web self-host | Free | MIT (2025-12) | Flask+React+Mongo; configurable sheets, BGG import |
| board-score-hub | Web | Free | MIT (2026-09) | React+TS; ~50 games as code (`src/games/*/GameDef.ts`) |
| wingspan-helper | Web | Free | MIT | single-game Vue |
| jimmyorr/counters | Web | Free | MIT | generic counter |
| ScoreKeeper / Board-Game-Score-Calculator | Android | Free | GPL-3.0 / none | dead |
| Dized | iOS/Android | Freemium | No | rules tutorials, not scoresheet engine |

Sources: bgstatsapp.com/score-sheets, bgstatsapp.com v4 post, BGG ScorePal thread, github.com/TommyTheHuman/MeepleStats, github.com/cophilot/board-score-hub, github.com/greengiraffe/wingspan-helper.

## Reusable data
- No standard score-template JSON schema exists.
- Seeds: MeepleStats configs + board-score-hub GameDefs (MIT, attribution). Hand-author top 30–50 club games.
- BGG XML API: bearer token, non-commercial only, no AI training, store BGG id only.
- ScorePal/BG Stats data proprietary — don't scrape.

## Recommended template model (Postgres jsonb, versioned)
- `gameId, version, variant, locale`
- `mode`: competitive | coop (win/lose + optional score) | team
- `winRule`: highest | lowest | none
- `categories[]`: `key, label, scope(player|team), input(number|repeating|exclusive|bool), formula(sum|multiply|table|setCollection|expr), countsToTotal`
- `expr` via sandboxed evaluator (jsep/expr-eval), never `eval`
- `tiebreakers[]`: ordered `{categoryKey, dir}`, optional shared outcome
- Play stores `{templateId, version, players[], values{category: raw}}`; totals computed by one pure TS fn in `packages/shared` (web + server; Android reuses server totals or ports fn with shared test vectors).
- Pin template version on play.

## Unresolved
- BGG license position (non-commercial?).
- User-authored templates in MVP?
- MeepleStats real config schema not reviewed.
