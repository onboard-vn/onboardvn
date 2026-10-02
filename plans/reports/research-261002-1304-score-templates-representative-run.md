# Score templates — pilot + representative run (2026-10-02)

- 74 templates (15 pilot + 59 representative, stratified by scoringFamily × weight band) in `data/staging/score-templates/`, all valid vs schema v2.
- Imported to dev DB `score_templates`: 40 approved (high), 34 pending (32 medium, 2 low).
- Club data: 596 games, 585 with BGG metadata in `game_external_metadata` (private); 11 unmatched (the-7th-citadel, air-land-sea, trajan-2011, co-ty-phu, las-vegas-royale-2019, medico-2026, mission-red-planet-second-edition-2015, mystery-game, meo-no, northgard, ultimate-werewolf).
- Family/band classification: `data/private/bgg/families.json` (heuristic from BGG mechanics).

## Quality issues
- Early batches ran without `pdftotext` → secondary sources only. Re-run medium/low with official PDFs.
- Codex hit usage limit mid batch 8; Hegemony State scoring differs between rule versions → needsReview.
- Values printed only as graphics (Harmonies, Critter Kitchen, Ruins, Magical Athlete chips) → scorer inputs; need physical rulebook photo.

## Schema gaps to fix in v3
1. Outcome-dependent scoring (coop score only if win, Spirit Island).
2. Elimination / HP tracking (Madcala, Hero Realms, Dawn), "eliminated cannot win".
3. Multi-scenario per game (Orléans competitive/coop/solo) → use `variant` = separate templates (DB already supports).
4. Bool-gated multiplier (Flip 7 x2) and "first to N points" end condition as structured field.
5. Track → points lookup (input position, table maps) — partly covered by `table`; add explicit `track` input.
6. Cross-player award on bool/count ("most soup") → rankAward over bool.
7. Asymmetric 1v1 roles (Pagan).
8. Thresholds depending on remaining allies (Dawn).

## Unresolved
- Run remaining ~522 games? Cost ~15M tokens; Codex quota resets 2026-10-04 00:27.
