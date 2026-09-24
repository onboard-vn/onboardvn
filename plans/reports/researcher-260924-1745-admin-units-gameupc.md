# Research: VN admin units (2025 2-level reform) + GameUPC API

Date 2026-09-24. Read-only research, no code changes.

## Q1. Vietnam administrative units dataset

### Candidates checked

| Candidate | Format | Maintainer | Last update | License | Rows | Notes |
|---|---|---|---|---|---|---|
| **ThangLeQuoc/vietnamese-provinces-database** github.com/ThangLeQuoc/vietnamese-provinces-database | JSON/SQL(pg,mysql,mssql,oracle)/Mongo/Redis/ES, GIS geojson | ThangLeQuoc (community, 3k+ stars, "Trendshift" repo) | active, v5.2.0 pushed 2026-09-22 | **MIT** (confirmed via GH API `license.spdx_id: MIT`) | 34 provinces, wards table = 3321 (post 01/07/2025 reform, tracked release v3.0.2 for decree 19/2025/QĐ-TTg, current head keeps later decrees too) | Has `Code/Name/NameEn/FullName/FullNameEn/CodeName(slug)/ProvinceCode/PostalCode/AdministrativeUnitId` fields for both province+ward. No old-district/legacy mapping field. Versioned releases track each decree so historical pre-2025-07-01 data recoverable from git tags for building your own mapping. |
| provinces.open-api.vn (service) + backing repo hongquan/vn-open-api-provinces | REST API only, no bulk export license stated | hongquan | pushed 2026-09-20 | **none declared** (GH API `license: null`) — risky for redistribution | 34 / 3321 (per site copy) | Live API only, good for dev convenience/testing, NOT for bundling a static dataset copy in an AGPL/CC-BY-SA repo without a license grant. |
| ncdanhvn/vn-provinces-api | REST API wrapper | ncdanhvn | — | not checked (skip, redundant with above) | — | Same category as above. |
| phucanhle/vn-xaphuong-2025 github.com/phucanhle/vn-xaphuong-2025 | JSON, npm pkg | phucanhle | pushed 2026-04-25 | **no LICENSE file** (GH API `license: null`) | wards only (flat Province[]/Ward[]) | No legacy mapping either; unlicensed = redistribution risk. |
| daohoangson/dvhcvn github.com/daohoangson/dvhcvn | JSON (3-level: tỉnh/huyện/xã), GIS | daohoangson | pushed 2026-09-23 | **GPL-3.0** | pre-reform 3-level structure (has quận/huyện) | GPL-3.0 data bundled into an AGPL codebase is legally fine (both copyleft, compatible), but redistributing as part of a CC BY-SA 4.0 **dataset** is awkward (GPL-3 vs CC BY-SA 4.0 not a clean match for data-only artifacts). Also this is old 3-cấp structure, not the new 2-level scheme — would need re-derivation. `history/` dir may hold dated snapshots useful for building old→new mapping via GIS diff, not verified in depth (time-boxed). |
| phamhongduc-dev/dvhcvn github.com/phamhongduc-dev/dvhcvn | claims JSON+mapping | phamhongduc-dev | pushed 2026-09-02 | MIT declared but **repo contains no data files** (only `images/`, `license`, `readme.md` — README returns 404, likely a landing-page repo for a hosted paid/demo service `dvhcvn.phamhongduc.com`) | unverified | Cannot confirm claimed "63→34 mapping" is actually machine-readable/downloadable. Do not rely on unverified claim. |
| GSO official danhmuchanhchinh.gso.gov.vn | web UI + `.asmx` SOAP-ish web service (`DMDVHC.asmx`), Excel export per unit | Tổng cục Thống kê (GSO) | official, current | Government publication — Vietnamese law (Luật Sở hữu trí tuệ) generally does not grant copyright to legal/administrative normative documents and state-issued classification tables, so content is effectively public domain/free-to-use, but **no explicit open-data license/API terms published** on the site itself; no bulk JSON/CSV download, only per-unit Excel/UI. | 34 / 3321 (official source of truth) | Best as the **authoritative reference to verify** any third-party dataset against, not as primary machine-readable source (no clean bulk API). |
| sapnhap.bando.com.vn / sapnhap2025.github.io | map/lookup tools | Bộ NN&MT / unclear | — | unknown | — | Lookup UI, not exposed as downloadable dataset. sapnhap2025.github.io returned 404 when checked. |

### Recommendation

**Use ThangLeQuoc/vietnamese-provinces-database, MIT license.**

- Rationale: only actively-maintained candidate with an explicit, redistribution-friendly license (MIT — compatible with both AGPL code and CC BY-SA 4.0 dataset attribution requirements), correct current row counts (34/3321), decree-tracked version history (each government decree gets its own tagged release, so exact 01/07/2025 reform snapshot is `v3.0.2` if a pinned pre-later-decree snapshot is wanted, vs `v5.2.0` head for latest), and includes ready-made English names + slugs (`CodeName`) that map directly to a `slug` column.
- Exact raw download for the pinned reform snapshot (recommended for reproducibility, avoid drifting with later decrees):
  - Release list: `https://github.com/ThangLeQuoc/vietnamese-provinces-database/releases` (pick tag `v3.0.2`)
  - Current head JSON (auto-updated, if head-tracking preferred): `https://raw.githubusercontent.com/ThangLeQuoc/vietnamese-provinces-database/master/json/full_json_generated_data_vn_units.json` (1.5MB, full names + English + slug + postal code) or `vn_only_simplified_json_generated_data_vn_units.json` (smaller, VN-only fields) at same path.
  - Ready SQL zip (current release): `https://vn-provinces-ds.thanglequoc.xyz/v5.2.0/postgresql/vn_provinces_postgresql_dataset_v5.2.0.zip` (also mysql/mssql/oracle/mongodb/redis/es variants at same CDN path pattern).

### Field mapping → your schema

```
provinces(code, name, slug)      <- Code, FullName (or Name), CodeName
wards(code, provinceCode, name, slug) <- Code, ProvinceCode, FullName (or Name), CodeName
```
Source field names in `full_json_generated_data_vn_units.json`: province object `{Type, Code, Name, NameEn, FullName, FullNameEn, CodeName, PostalCodePrefix, AdministrativeUnitId, ..., Wards:[...]}`; ward object `{Type, Code, Name, NameEn, FullName, FullNameEn, CodeName, ProvinceCode, PostalCode, AdministrativeUnitId, ...}`. `Code` is the official GSO numeric code (province: 2-digit, ward: 5-digit) — use as your `code` PK directly, no re-mapping needed.

### `legacy_district` ("Quận 3 cũ") — unresolved, no ready-made dataset found

No candidate ships an old-ward/old-district → new-ward mapping table. The 2025 merger was executed per-province via separate Nghị quyết UBTVQH appendices (not one unified machine-readable table); GSO site only shows current state. Two paths, both extra work beyond a plug-in dataset:
1. Diff ThangLeQuoc repo's pre-reform tag (e.g. `v2.4.1`, pre-01/07/2025, still has huyện/quận level) against `v3.0.2` using name/geography heuristics — approximate, needs manual QA per province.
2. Pull each province's own Nghị quyết appendix (published as PDF/HTML on thuvienphapluat.vn) — authoritative but manual, not bulk JSON.
Recommend scoping `legacy_district` as a v2 feature fed by manual/curated data entry per province rather than blocking on an automated mapping.

## Q2. GameUPC API (gameupc.com)

No public web docs page rendered (gameupc.com/#api and boardgamegeek.com threads both blocked fetch with 403 from this environment); reconstructed from `https://gameupc.com/demo.py` (official demo script, fetched successfully) and the `gameupc-hooks` npm package source (v1.0.12, `dist/server-LHHepc3b.js`) used by the production ShelfScan app (github.com/j5bot/shelfscan, official 3rd-party client referenced from BGG blog).

- **Base URL**: production `https://api.gameupc.com/v1` ; test/sandbox `https://api.gameupc.com/test` (both confirmed literally in `gameupc-hooks` source: `` `https://api.gameupc.com/${test ? "test" : "v1"}` ``).
- **Auth header**: `x-api-key: <token>`. Free/test key hardcoded and publicly usable for the test stage: `test_test_test_test_test` (works only against `/test/...` endpoints with fixed dummy UPCs; live-verified below). Production requires a real key — not self-serve/documented as free; `gameupc-hooks` reads it from env var `GAMEUPC_TOKEN`, falling back to the test key if unset. No public signup form found for a production key in the sources checked (unresolved — likely requires contacting the maintainer via the BGG thread).
- **Lookup endpoint**: `GET /upc/{code}` (optionally `?search={terms}` to re-search by name instead of the UPC-derived guess). Live test call (verified 2026-09-24):
  ```
  GET https://api.gameupc.com/test/upc/111111111117
  x-api-key: test_test_test_test_test
  ```
  Response (200, truncated):
  ```json
  {
    "upc": "111111111117",
    "name": "Splendor",
    "searched_for": "splendor",
    "bgg_info_status": "verified",
    "bgg_info": [
      {
        "id": 148228,
        "name": "Splendor",
        "published": "2014",
        "thumbnail_url": "...",
        "image_url": "...",
        "page_url": "https://boardgamegeek.com/boardgame/148228",
        "data_url": "https://api.geekdo.com/xmlapi2/thing?id=148228",
        "update_url": "https://api.gameupc.com/test/upc/111111111117/bgg_id/148228",
        "version_status": "verified",
        "confidence": 96,
        "versions": [ { "version_id": 393050, "name": "Splendor (English first edition)", "language": "English", "confidence": 95, "update_url": ".../bgg_id/148228/version/393050" } ]
      }
    ],
    "stage": "test",
    "status": "ok"
  }
  ```
- **Voting/submit endpoint**: no separate submit path — voting is done by POSTing to the `update_url` returned inside a candidate's `bgg_info` entry: `POST {update_url}` with JSON body `{"user_id": "<stable-per-user-id>"}` and same `x-api-key` header. Per demo.py comment: "generally takes two uncontested votes for a UPC→bgg_id mapping to be considered 'good'". Response is the same UPC-lookup JSON shape, refreshed (`bgg_info_status` becomes `verified` once threshold met).
- **Test UPCs** (documented in demo.py comments): `111111111117`/`1` = high-confidence verified match; `222222222224`/`2` = ambiguous, needs user disambiguation; `333333333331`/`3` = lookup failure (empty `bgg_info`).
- **Response fields**: `upc`, `name`, `searched_for`, `bgg_info_status` (`verified` | presumably `unverified`/pending), `bgg_info[]` (each: `id`=BGG id, `name`, `published`, `thumbnail_url`, `image_url`, `page_url`, `data_url` (BGG XML API2 passthrough), `update_url`, `version_status`, `confidence` 0-100, `versions[]` with per-language/edition breakdown), `stage` (`test`/`v1`), `status`.
- **Rate limits / terms of use**: not documented in any source reachable this session (BGG thread + gameupc.com both 403'd to automated fetch; no rate-limit headers or 429 handling present in gameupc-hooks source). **Unresolved** — needs manual visit to https://gameupc.com/#api or the BGG thread (https://boardgamegeek.com/thread/2579359/new-rest-service-for-upc-bgg-lookups) by a human browser, or contacting the maintainer, before relying on this for production traffic volume planning.
- **Non-commercial/open-source suitability**: no explicit ToS text obtained (blocked). ShelfScan (official reference client, MIT-adjacent ecosystem project but itself "not licensed for modification" per its own README) uses the same `x-api-key`/`GAMEUPC_TOKEN` pattern in production, suggesting individual production keys are issued per-app on request rather than a universal public key.

## Unresolved questions

1. How to obtain a production `GAMEUPC_TOKEN` for gameupc.com (no public signup found) — likely requires contacting maintainer via BGG thread.
2. GameUPC rate limits and formal terms of use text — source pages returned 403 to automated fetch this session; need human browser check of gameupc.com/#api.
3. No machine-readable old-ward/old-district → new-ward mapping ("Quận 3 cũ") dataset exists publicly; decide whether `legacy_district` ships as manual/curated data or is descoped for v1.
4. daohoangson/dvhcvn `history/` directory possibly contains dated snapshots usable to derive an old→new mapping via geometry diff — not explored in depth (time-boxed), worth a follow-up if `legacy_district` becomes a hard requirement.
