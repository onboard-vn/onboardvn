# Board game interoperability: confirmed scope

Confirmed 2026-10-16; research pending, no provider capability assumed.

## Outcome

OnBoardVN supports community, personal data and clubs/cafés, prioritizing the owner's club. Users continue using whichever connected application they prefer. Goal: bidirectional interoperability wherever supported, never forced migration or cloning. Stabilize the complete web experience first; native mobile later. Web framework selection remains open pending source audit; this changes the delivery priority of the historical Expo-first plan.

Support post-game results, game-specific scoring and in-play companions when suitable. Priority games: Acquire, Agricola, Critter Kitchen, Grand Austria Hotel, The Gang. Printable cards and advanced companions belong to the product vision; identify boundaries and dependencies without implementing them.

Confirmed scoring UX direction, 2026-10-16: retain OnBoardVN's game-specific interfaces with clear quantity inputs, automatic point conversion and visible calculations. Use BG Stats/BG Catalog as behavioral references and verify scoring against official rules for the selected edition/modules. Prefer recognizable game logos or token symbols alongside text labels when suitable assets are available; asset acquisition and new visual assets require their own implementation scope. Do not replace the custom interfaces with the providers' generic score tables. See the [Grand Austria Hotel verification report](../../../plans/reports/research-261016-1518-grand-austria-scoring.md).

Research BGG, BG Stats, BG Catalog and the external club system. Cover all relevant club data: members, inventory, meetings, attendance, plays and results. No development access to the club app is assumed. Develop only on the OnBoardVN side using permitted existing interfaces. Desired two-way exchange depends on actual read/write support; mark limitations explicitly.

## Safety and non-goals

Research/planning only: no app code, migrations, configuration, database writes, account changes, sync activation, installations, commits or deployments. Preserve dirty workspace. Authorized: ADB pairing and opening BG Stats/BG Catalog, then read-only inspection. Never access private sandbox or extract credentials; never store pairing codes or private member data in repository.

## Acceptance

Five evidence-grounded docs: RESEARCH.md, FEASIBILITY.md, ARCHITECTURE.md, PLAN.md, TEST_PLAN.md. Classify every direction and data type with Supported/Partial/Unsupported/Unknown and official/experimental/hypothesis/cooperation evidence. Compare BGG hub, adapters and hybrid. Cover identity, dedup, conflicts, loops, deletion, provenance, privacy and unsupported field preservation. Roadmap includes backend/web/database tasks, dependencies, tests, effort assumptions and fallbacks. Vietnamese executive summary and blockers required.

## Approved synthetic device experiment — 2026-10-16

Owner explicitly approved local synthetic game/player/play labeled ONBOARDVN SYNC TEST in both installed apps, local backup/play-file export and QR format inspection. Keep test records for review. No club edits, external sharing, BGG posting, account/settings changes or deletion authorized. Check Auto-post/automatic outbound/cloud behavior before writes; stop affected branch if enabled or local-only behavior cannot be established. QR/upload paths requiring remote transmission remain excluded. No private sandbox/credential access. This narrow approval supersedes the read-only device rule only for listed synthetic actions, not application implementation or OnBoardVN database changes.

## Approved scoring verification and correction — 2026-10-16

Owner additionally approved isolated REA/JDK/JADX tooling under `/tmp/onboardvn-rea-debug`, copying the installed BG Stats/BG Catalog APKs for static scoring analysis, and adding Grand Austria Hotel (BGG 182874) locally in BG Stats to test an unsaved play with the existing synthetic players. No sandbox/account data inspection, settings changes, BGG posting or cloud sharing. The game remains locally with zero saved plays after discarding the test draft.

Owner then approved a five-file correction batch: five rooms per floor in the existing Grand Austria UI; executable leftover-resource tiebreaker and official base-rulebook citation in its template; scoring regression vectors; this scope record; and the linked verification report. This is a narrow exception to the research-only application-code restriction above. No database change/import, new logo/token assets, commit, push or deployment is included.

## External game companions — confirmed 2026-10-16

Owner accepts directing players to a suitable external app or website for some games. Use clear, deliberate links from game guidance; OnBoardVN retains club/session/result handling and its own readable scoring where appropriate. Do not duplicate a specialized companion solely for feature parity. Vantage example: [official Rulepop reference](https://vantage.rulepop.com/), which includes quick rules, icons and storybook lookup. Opening the destination is user initiated; no automatic data transfer or external session write is implied.

The owner also approved the [30-game scoring batch](../../../plans/261016-1553-club-priority-scoring/plan.md), including templates, related UI/helpers/tests and existing result callers. This supersedes the research-only code restriction for that listed batch only; DB/import, install, commit/push/deploy and club writes remain excluded.

Local batch status and remaining tester gates: [readiness report](../../../plans/261016-1553-club-priority-scoring/reports/readiness.md). This records local evidence, not a database template upgrade or production release.
