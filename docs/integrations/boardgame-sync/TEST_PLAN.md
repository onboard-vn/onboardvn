# Verification plan

2026-10-16. [Roadmap](PLAN.md), [architecture](ARCHITECTURE.md). Source/documentation/device read-only checks performed; approved BG Stats synthetic local create/replay/update/export now completed as recorded below. No application automated tests run.

## Baseline và safety

Preserve dirty WIP. Use synthetic participants and dedicated accounts, disable test-account Auto-post before approved BG Stats writes. Không thay đổi real account settings trong nghiên cứu. Owner approval required trước create/import/post/delete/backup fixtures; backup + restore-check trước DB schema/data changes. Không force provider throttling, credential extraction, sandbox access hoặc private API.

ADB pairing and opening installed apps completed; menus/manifests observed per [device report](../../../plans/261016-1043-boardgame-interoperability/reports/device-findings.md). Remaining device experiments pending, not passed.

## Unit/contract fixtures

| Area | Cases | Pass condition |
|---|---|---|
| Parser/security | malformed/huge XML/JSON, XML entities, archive traversal/bomb, unsupported version, missing refs/duplicate IDs | Bounded parse/reject with safe message, no remote entity fetch or filesystem escape |
| IDs | same UUID, file-local IDs, different source/account IDs, copies, missing stable ID | Exact scoped upsert; no name/date-only automatic merge |
| Values | raw string scores/null/negative/decimal, co-op/no-points/team/rank, unknown fields | Loss preview and canonical preservation, no invented zero/rank |
| Dates | date-only, UTC crossing midnight, DST/timezone unknown, quantity aggregation | No invented precision or duplicate splitting |
| Updates | absent vs null, older/newer modificationDate, local/source both changed | Baseline-based safe update or conflict; no silent overwrite |
| Export/link | stable source IDs, encoding, Unicode, long notes, unsupported fields | Deterministic tested payload, bounded size, no private fields in URL logs |
| Scoring | five game agreed editions, engine fixtures, imported score-only mode | Server-calculated flows authoritative; historical scores untouched by unrelated templates |

## Database/API integration

- Same import twice, parallel apply and retries: one scoped mapping/result, deterministic counts.
- Rev/permissions changed after preview: reject stale snapshot; transaction rollback without partial writes.
- Multi-user/club/privacy: non-member denied; participant identity not granted from nickname/BGG username; external login IDs never exported/logged.
- Same physical session reported by multiple accounts/providers: candidate review and preserved source copies; no duplicate source record after explicit merge.
- Full snapshot incomplete/page failed/202/timeout: no tombstone, deletion or watermark advance.
- Soft delete/reappearance, disconnect and imported-data removal: preserve other actors' shared plays; no remote delete without approved operation.
- Worker lease expiry/crash/restart, 401/403/429/500/503, Retry-After, malformed body: bounded retries/action-required and resumable checkpoints. Use local synthetic failure fixtures, not provider abuse.
- Echo cycles and lost write receipt: suppress unchanged observations, reconcile supported ID before retry; no inferred acknowledgement from link launch.
- Dry-run no canonical writes; apply audit redacted; rollback skips fields edited after batch.

## Web E2E

Select framework first; run narrow owning package tests before broad lint/type/build affected contracts. Source selection → scope → preview → conflicts/losses → confirm → reload/history. Own final scores persist through real API. No mocks in delivered flow. Keyboard/mobile-browser accessible forms and duplicate retry states.

Desktop QR → first-party authenticated review on phone → explicit BG Stats link. Test expired/unauthorized review token, app absent/default link off, popup blocked, offline and oversized payload. URL open shown as handoff attempted, cancellation not success. No sensitive query in analytics/referrers/logs. Export/disconnect/removal state matches permissions.

## Physical Android PoCs

| Experiment | Current status | Approval/test evidence needed |
|---|---|---|
| ADB and installed versions | Passed read-only | Android 16, BG Stats 6.17.1, BG Catalog 2.61 |
| Launch both apps | Passed | Visual welcome/home; no record created |
| BG Catalog backup menu | Passed read-only | Create/View-share/Restore menu observed; schema not verified |
| BG Stats settings | Passed read-only follow-up | BGG collection/tag/posting/import and file/backup menus observed; no actions triggered |
| Verified/default links and ACTION_VIEW | BG Stats domains verified; resolver lists app + Chrome | Default routing/payload untested; synthetic createPlay only after write approval |
| Fixed source IDs createPlay repeat/edit/cancel | Create/identical replay/changed-score update passed one fixture | Cancellation/namespace/cross-device remain pending; Auto-post/cloud off verified |
| JSON/.bgsplay round trip | Pending | Synthetic current export, UUID older/newer file, verify matching |
| Catalog backup/QR/share | Backup menu observed; payload pending | Owner-authorized synthetic file/QR, validate schema and permitted handling |
| SEND/MULTIPLE | Manifest only | Structured file vs image semantics; success cannot be inferred from resolver |
| BGG read and API errors | Pending | Approved application/token and privacy-safe account/fixtures |
| BGG/club writes | Blocked contract | Licensed documented operation and separate approval |

Record exact package/version, initial state, action, expected/actual and redacted artifact hash. Recheck focus before input. Stop before any real-data confirmation. No production UI automation as sync mechanism.

## Game and print acceptance

Acquire: agreed bonus/category calculations and final balance, no unsupported stock ledger claim. Agricola: exact edition/variant/template golden cases. Critter Kitchen: supported meals/stars plus explicit rumor/Sauces exclusions. Grand Austria Hotel: edition-specific scoring and optional rules separated. The Gang: co-op success/heist outcomes, no fabricated numerical ranks.

Advanced companions require per-game setup/hidden-state/round/finalization scenarios. Print validation needs licensed assets, actual size/bleed/duplex alignment, readable translated text and proof sheet. These tests are planned, not completed.

## Follow-up regression contracts

BGG-new-only import must not be treated as existing-play update; JSON/.bgsplay update tests are separate. Quantity splits preserve source group and only-first-BGG-link behavior; mapping links support non-1:1 relationships. Structured expansion/variant preservation must not be inferred from human-readable comments. CLB history/table/RSVP aggregates do not create completed plays automatically. RSC internal POST requests observed from normal reads must not be replayed for mutation tests.

BG Catalog logged-in BGG screen provides daily game/play download option: next approved fixture test must separate initial pull, old edit, remote delete, duplicate and scheduled-run behavior. UI status labels alone are not successful-sync receipts.

## Exit gates

MVP release requires capability-specific contract fixtures, idempotency/privacy tests, real web persistence, provider approval where applicable and explicit unsupported states. Broaden tests only for changed shared contracts or unresolved failures. Research docs validated for links/consistency; source audit and device observations do not establish production readiness.

## Synthetic run evidence

[BG Stats PoC report](../../../plans/261016-1043-boardgame-interoperability/reports/bgstats-synthetic-poc.md): final local JSON one play, scores11.5/-2, revision2, no duplicate. UUIDs present but before/after stability not measured; source IDs not exposed by same exported field names; date display conversion unresolved. Current JSON exported locally; no file reimport/.bgsplay/QR/deletion tested. Approved records retained; no BGG ID or remote posting/settings changes. This narrow approved batch overrides baseline read-only restrictions only for listed fixture actions.

Catalog synthetic creation stopped before save: manual dialog local-only behavior not established; daily download off does not itself rule out outbound behavior. No record or export created. This is an unexecuted capability test, not a failed import or evidence the feature is impossible. Separate input-method naming issue also observed. See bgcatalog-synthetic-poc.md in plan reports.
