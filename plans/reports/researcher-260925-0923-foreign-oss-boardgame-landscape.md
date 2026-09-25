---
type: research
date: 2026-09-25
status: final
---

# Foreign OSS board-game landscape + naming/branding for Onboard VN

## 1. Related open-source projects/datasets abroad

| Project | URL | License | Stars / last push (2026-09-25) | What it does | Reuse potential for Onboard VN |
|---|---|---|---|---|---|
| BoardGameGeek (reference, not OSS) | boardgamegeek.com | proprietary, XML API ToC restricted | n/a | De-facto catalog/wiki; already the source Onboard links `bgg_id` to | Not reusable as code/data; keep as external link only, per existing plan |
| Open Data Boardgame Project | github.com/opendataboardgame | mixed (game repo NOASSERTION) | game repo: 62★, last push 2020 | Misleading name — it's a physical open-source **board game design**, not a game database. Dead since 2020. | Not relevant, drop from consideration |
| jzlung/boardgames ("BGG successor") | github.com/jzlung/boardgames | none | 0★, last push 2017 | Abandoned recommender experiment | Not usable — no license, dead |
| FreeBoardGames.org | github.com/freeboardgames/FreeBoardGames.org | AGPL-3.0 | 300★, active (2026-02) | FOSS platform for publishing digital board-game implementations (built on `boardgame.io`) | License-compatible (AGPL) but different domain (plays games online, not catalog/community). Low relevance, note as prior art only |
| boardgameio/boardgame.io | github.com/boardgameio/boardgame.io | MIT | 12.4k★, active (2026-09) | Turn-based game state/multiplayer engine | Not relevant to Onboard's scope (no digital play) |
| Strand94/Tabletop | github.com/Strand94/Tabletop | MIT | 0★, active (2026-09-22) | Self-hosted collection + play-session tracker, Docker (app+Postgres), translatable UI, BGG autofill | Closest analog to planned P4 "tủ game cá nhân" + play logging. Low stars/no community yet — evaluate code patterns, not a dependency |
| mregni/BoardGameTracker | github.com/mregni/BoardGameTracker | MIT | 52★, active (2026-09-24) | Self-hosted stats tracker for collection + sessions, actively developed | Best-activity BG-Stats-like OSS; MIT compatible with AGPL if code borrowed into Onboard (one-way: AGPL can absorb MIT) |
| TommyTheHuman/MeepleStats | github.com/TommyTheHuman/MeepleStats | MIT | 99★, last push 2025-12-31 (slowing) | Self-hosted match/session tracker, wishlists, achievements, Flask+React | Reference for play-logging schema/UX; MIT-compatible |
| NemeStats/NemeStats | github.com/NemeStats/NemeStats | GPL-3.0 | 54★, active (2026-09-10) | Free hosted+OSS play tracker for stable player groups, Elo-like stats | GPL-3.0 code cannot be imported into AGPL-3.0-only project's codebase without relicensing risk-free path being one-way compatible (GPLv3→AGPLv3 combination is fine per FSF); still, treat as read-only reference, don't copy verbatim without checking combined-work compatibility |
| elovation/elovation | github.com/elovation/elovation | MIT | 172★, stale since 2024-11 | Rails app, Elo/TrueSkill ranking for game results | Reference only for rating algorithm; project inactive |
| ballewcifer/BoardGameLibrary | github.com/ballewcifer/BoardGameLibrary | none declared | 0★, active (2026-09-23) | Self-hosted lending/check-out system for a physical game library (desktop+Flask+Expo mobile) | Directly maps to "danh bạ quán + kho game" lending use case, but **no license file** = cannot legally reuse code; can still study data model |
| EventideSystems/brocade.io | github.com/EventideSystems/brocade.io | AGPL-3.0 | 143★, **archived**, last push 2025-12-21 | Open GTIN/barcode → product database (code+data) | License-compatible (AGPL) and closest thing to an open barcode dataset, but archived/unmaintained; could fork/self-host rather than depend on live service |
| BenSouchet/barcode-datasets | github.com/BenSouchet/barcode-datasets | MIT | 109★, last push 2024-07 | Curated list of barcode/QR/UPC open datasets (pointers, not a live API) | Useful as a research index to find GameUPC alternatives; not integrable directly |
| GameUPC (already used by Onboard) | gameupc.com (no public OSS repo found; community wrapper repos e.g. j5bot/gameupc-hooks have no license) | proprietary/unclear | n/a | UPC→BGG lookup, the service the project already depends on | Confirms plan's existing risk note: ToS/rate-limit unresolved (see brainstorm doc open question) |
| OpenMeet-Team/openmeet-platform | github.com/OpenMeet-Team/openmeet-platform | NOASSERTION (effectively all-rights-reserved until a license is added — do not treat as OSS-safe) | 63★, active (2026-08-21) | OSS Meetup.com replacement, communities/events, AT Protocol login | Closest architecture analog for "kèo"/event flows; **license missing = cannot legally copy code** until maintainers add one — flag before reuse |
| coderbyheart/open-source-meetup-alternatives | github.com/coderbyheart/open-source-meetup-alternatives | MIT | 272★, active (2025-12-26) | Curated list of Meetup alternatives (index, not code) | Good sourcing list for phase P2 event-platform research |

**License compatibility summary for Onboard VN (code = AGPL-3.0-only, dataset = CC0/CC BY-SA/MIT):**
- MIT/BSD/Apache-2.0 code (Tabletop, BoardGameTracker, MeepleStats, elovation, barcode-datasets) → safe to read/adapt into AGPL codebase (permissive → copyleft is one-directional-safe).
- GPL-3.0 (NemeStats) → combinable into an AGPL-3.0 work (GPLv3 and AGPLv3 are compatible per FSF), but don't mix into files staying pure GPL-3.0-only elsewhere; keep as reference unless doing a full-file import with attribution.
- AGPL-3.0 (brocade.io, FreeBoardGames.org) → fully compatible, but brocade.io is archived (verify before depending on it live).
- No-license repos (BoardGameLibrary, GameUPC wrappers, opendataboardgame/game) → **legally not reusable as code**; can only inspire design, cannot copy.
- OpenMeet's NOASSERTION status is a real blocker — verify current license before any reuse.

## 2. Does dropping "VN" from the name grow foreign contributor base?

Evidence says **name is a weak/indirect signal; the infra behind it is the real driver**:

- CACM "Open Source's Hidden Language Gap" and the DevOps.com i18n field report both point to the same root causes of low foreign participation: README/CONTRIBUTING only in the maintainer's language, no i18n architecture (stable keys, ICU plural rules, fallback locale), and no localization governance doc — not the project's brand name.
- Odoo case (TinyERP → OpenERP → Odoo) is the closest "renamed away from a specific identity" example found, but it was a branding/legal trademark-dispute move, not evidence the earlier names blocked foreign contributors — no causal data found linking the rename to contributor growth.
- Counter-evidence within the ecosystem itself: `mesaaberta` (Brazilian, pt-BR) and other regionally-named/regionally-labeled OSS projects run i18n as a live GitHub issue thread rather than avoiding a local name — i.e., regional identity + i18n infra coexist fine in practice.
- No case study found where a country-named OSS project's *rename alone* (without adding i18n/English docs) produced a measurable foreign-contributor uptick. Treat "keep VN vs neutral name → more contributors" as **unverified in the specific causal sense**; be honest with the user about that gap.

What actually correlates with foreign contribution (converging across sources):
1. English-first README/CONTRIBUTING/issue templates (baseline requirement, independent of project name).
2. i18n architecture ready from day one (extractable strings, locale files, fallback) — retrofitting later is expensive.
3. Good-first-issue curation + responsive maintainers (general OSS finding, not board-game-specific).
4. Data portability/open licensing (CC0/CC BY-SA, which Onboard already has) — lowers trust barrier for outside contributors to reuse/verify data.
5. Neutral governance (no single company/nationality gatekeeping) — matters more for large corporate-scale projects than a community hobby project at Onboard's stage.

## 3. Recommendation

**Keep "Onboard VN" as the product/brand name; do NOT rename the repo/product to drop "VN".** Add i18n groundwork instead. Reasoning:

- Local identity + VN SEO + community trust ("of Vietnam, for Vietnam players") is a real acquisition asset at pre-launch stage (per brainstorm doc's core positioning vs Board Game Wikia/Played Together/GameTree — the VN-specific data/language IS the differentiator, not a liability).
- No evidence a neutral name alone recruits foreign contributors; the actual levers (English docs, i18n, good-first-issues) are addable without a rename.
- Domain/trademark: "Onboard" (generic English word) has heavy prior use in **employee-onboarding SaaS** (Onboard.io-style products) and general software naming; GitHub search found no direct **board-game** project literally named "Onboard", so no board-game-specific collision — but the word is far from distinctive for trademark purposes outside a qualified/composite mark like "Onboard VN". Going fully generic ("Onboard") without a qualifier trades a differentiator (VN) for a highly crowded, hard-to-trademark generic term — worse position, not better.
- Rename costs (org/repo rename, domain, SEO reset, community-health-file churn per README's own "Tạo GitHub org" checklist) are non-trivial versus a benefit that isn't evidenced.

**Concrete low-cost steps that actually help foreign contribution, independent of naming:**
1. Add English README (top-level `README.en.md` or bilingual sections) — current README is Vietnamese-only; this is the single highest-leverage, lowest-cost fix per the evidence above.
2. English CONTRIBUTING/CODE_OF_CONDUCT/issue templates (check current files — if Vietnamese-only, mirror in English).
3. i18n-ready web strings from the start (Next.js `next-intl`/`next-i18next`), even if only `vi` shipped now — retrofitting is the expensive path per the DevOps.com report.
4. Abstract the admin-units layer for multi-region: current schema (`apps/api/src/db/schema/locations.ts`) is a hardcoded 2-level `provinces → wards` hierarchy seeded from a VN-only MIT dataset (`ThangLeQuoc/vietnamese-provinces-database`, 1.8k★, active) — this is genuinely VN-specific and would block a future non-VN instance. If international reuse is a real future goal (not just contributor optics), add a `country` dimension or make the location model pluggable; otherwise explicitly scope it as "VN instance schema" and don't over-engineer now (YAGNI) unless a second country is actually planned.
5. Tag a handful of `good first issue`s once P1 stabilizes.
6. Keep dataset licensing as-is (CC0 facts, CC BY-SA descriptions) — already the right open-data signal for outside trust; just document it clearly in English too.

## Unresolved / not covered
- Did not find a public repo/source for GameUPC itself (proprietary) — the project's existing open question about GameUPC ToS/rate limits (in brainstorm doc) remains unresolved by this research.
- Did not verify formal USPTO/WIPO trademark registries for "Onboard" (board-game class) — only did GitHub/web search; if a rename were ever pursued, a real trademark search would be needed.
- Grep of Vietnamese-literal UI strings was a high-level sample (19 hits for Tỉnh/Phường/Quận across apps/), not an exhaustive i18n audit.
