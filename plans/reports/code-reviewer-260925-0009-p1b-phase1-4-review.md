# Code review: P1b Phase 1 (SMTP) + Phase 4 (SEO/LLM)

## High

1. **robots.txt is prerendered at build and bakes in localhost.** `apps/web/app/robots.ts:11`. The build output lists `○ /robots.txt` as static. `.next/server/app/robots.txt.body` contains `Sitemap: http://localhost:3000/sitemap.xml`. The CI image is built without SITE_URL, so production serves the localhost origin. Fix: add `export const dynamic = 'force-dynamic'` (Next 16 docs, robots.md:22).
2. **The robots Sitemap URL returns 404.** `apps/web/app/sitemap.ts:29-31`. Using `generateSitemaps` means Next only serves `/sitemap/[id].xml`. The build route list shows `ƒ /sitemap/[__metadata_id__]`, and there is no `/sitemap.xml` and no index file. Crawlers get a dead link. Fix: either list each `/sitemap/${i}.xml` in `robots.sitemap` (an array), or add a route handler at `app/sitemap.xml/route.ts` that serves a sitemap index. Dropping `generateSitemaps` while the catalog is under 50k URLs is the simplest option.
3. **Unbounded API fan-out on every crawler hit, all on one shared rate-limit bucket.**
   - Affected: `lib/seo/paginate.ts:10-16`, `app/sitemap.ts:12,39`, `app/llms-full.txt/route.ts:6-9`.
   - Each request makes `ceil(games/50) + ceil(cafes/50) + 1` sequential API calls with no caching. Caddy does not honour `s-maxage`, and every sitemap chunk rebuilds all entries.
   - All of these calls come from the web container's IP, and the limiter allows 300 per minute per IP (`lib/rate-limit.ts`). With about 2k games, around 7 crawler hits per minute use up the bucket, and then all SSR pages start getting 429s.
   - Fix: add an in-process TTL memo (about 1h) around `fetchAll*`, and/or exempt internal web-to-API traffic from the limiter.

## Medium

4. **API failures produce silently truncated output.** `paginate.ts:12` treats `!res.ok` (including 429 and 5xx) as the end of the list. The sitemap or llms-full then returns 200 with missing entries, and crawlers cache that. Fix: throw on a non-ok page so the route returns 5xx.
5. **Cache-Control has no `Vary: Cookie`.** `apps/api/src/lib/cache-control.ts:12-13`. `GET /games/:slug` depends on the session (`games/routes.ts:36` isStaff). Today there is no shared cache and admin client components make no `$get` calls, so the practical risk is low. If a CDN is added, it could serve the anonymous variant to staff because of `s-maxage=300`. This does not leak data, but staff would see stale or reduced data. Fix: set `Vary: Cookie` along with the header, or add a note to the deploy docs. No other public GET varies on anything besides session and query.

## Low

6. **JSON-LD and metadata on detail pages use the cookie-forwarding `serverApi()`.** `app/games/[slug]/page.tsx:62,89`. For staff, the JSON-LD is built from the staff DTO. It is only rendered in the staff's own HTML, so there is no crawler leak, but `publicApi()` would be consistent with the design intent.
7. **`/nguon-tham-khao` is static, so `metadataBase` is baked as localhost there.** It is harmless today because the page has no relative OG or canonical URLs. All other pages are dynamic (the header reads cookies), so `metadataBase` resolves at runtime.

## Verified OK

- **Prod fails fast:** `env.ts` superRefine is covered by `env.test.ts`, and compose uses `:?`.
- **OTP:** `sendOtpEmail` awaits `mailer.send`, so errors propagate. Listeners run only after a successful send.
- **Mailer drivers:** the console driver omits the body in production, and test env is forced to console (`mailer/index.ts:19-22`).
- **Robots rules** are correct. The JSON-LD `<` escaping is correct.
- **`public_info_only`** redaction is applied API-side (`cafes/service.ts:24,60`). The public list excludes pending cafés.
- **llms-full** is capped at 500KB, with a test.
- **OpenAPI** validates and covers all 8 public read routes. Its DTO schemas contain no email or username. `/me` returns 401 for anonymous users, so it never gets the public cache header.
- **app.ts order is unchanged:** uploads, then rate limit, then CSRF, then auth, then api. `publicCache` runs after the session middleware.

## Commands

- `pnpm --filter @onboard/api test`: 17 files, 78 tests passed.
- `pnpm --filter @onboard/web test`: 4 files, 19 tests passed.
- `pnpm lint`, `pnpm typecheck`: pass (turbo cache).
- `env -u SITE_URL next build` (apps/web): passes. This rewrote the gitignored `.next/`. Output confirms findings 1, 2 and 7.

## Unresolved

- Does better-auth's `emailOTP` await `sendVerificationOTP` in the pinned version, or run it in the background? If it runs in the background, SMTP errors will be swallowed.

Status: DONE_WITH_CONCERNS
