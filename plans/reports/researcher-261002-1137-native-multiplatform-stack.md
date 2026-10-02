# Native multiplatform stack for onboard-vn

## Current stack (from package.json)
pnpm + turbo monorepo. `apps/api`: Hono 4 + Drizzle + Zod 4 + better-auth + Postgres. `apps/web`: Next 16 / React 19. `packages/shared`: Zod schemas. TS 6, Node 22.

## Recommendation (ranked)
1. **Keep TS/Hono API as single backend. Web = Next (as is). Android = Kotlin + Compose. iOS = Swift + SwiftUI. Contract = OpenAPI 3.1 generated from Zod, clients generated per platform.**
2. Same, but iOS via Compose Multiplatform (only if SwiftUI time becomes the bottleneck; "native UI" requirement then violated on iOS).
3. KMP shared logic (Ktor + generated client) + native UI. Over-engineered here.
4. React Native/Expo, 5. Flutter: reject, they contradict "fully native UI".

Why 1: app is CRUD + lists + RSVP + sync. Domain logic is thin and server-side (sync, waitlist). Little logic to share, so KMP's main benefit (shared logic) ~ 0, while it adds Gradle/Xcode bridging cost for a solo dev. Generated clients give the same type-safety for free.

## Trade-offs
| Option | Solo effort | Native feel | Code sharing | Maintenance |
|---|---|---|---|---|
| API + 3 native UIs (rec) | Med-high (3 UIs, but sequential) | Best | Contract only | Low infra, 3 UI codebases |
| KMP logic + native UI | High (build/interop tooling) | Best | Networking/models | Extra layer, little gain |
| Compose Multiplatform | Med | Good (Skia-drawn, not UIKit; CMP iOS stable per [JetBrains docs](https://kotlinlang.org/docs/multiplatform/supported-platforms.html)) | UI+logic | Kotlin only, iOS quirks |
| RN/Expo | Low-med, reuses TS | Good, not "fully native" | High w/ web | JS bridge/SDK upgrades |
| Flutter | Med | Non-native widgets | UI+logic | New language, Dart |

## Backend
Keep TS. A rewrite (Ktor/Kotlin) buys nothing: Zod schemas + Drizzle already exist, and the 3rd-party sync is I/O-bound. Revisit only if you go KMP-everywhere (unlikely).

## API contract
- Add `@hono/zod-openapi` (or hono-openapi) so existing Zod → OpenAPI 3.1 spec; commit spec to repo, CI diff-check for breaking changes.
- Android: [openapi-generator](https://openapi-generator.tech) Kotlin (`jvm-retrofit2`/`jvm-ktor` + kotlinx.serialization) - described as stable/flexible; alternatives (openapi-kmp-gen, openapi2ktor) are young, skip.
- iOS: Apple's [swift-openapi-generator](https://github.com/apple/swift-openapi-generator) (v1.13.1, Sep 2026, 3.0/3.1 support, SPM build plugin). First-party, low risk.
- Version API under `/v1`; additive changes only (installed mobile apps can't be force-updated).

## Mobile auth
better-auth already used. Use its bearer-token plugin (session token in `Authorization` header) rather than cookies; store in Android Keystore / iOS Keychain. Social login: native Google/Apple SDK -> ID token -> better-auth idToken sign-in (Apple Sign-In mandatory on iOS if any social login exists). Confirm plugin names against current better-auth docs before implementing (not verified this session).

## Phasing
1. Web + API stabilization: OpenAPI spec, `/v1`, bearer plugin, pagination/ETag for sync-able lists.
2. Android (Compose, MVVM, generated client, Room cache optional). Ship Play internal track.
3. iOS (SwiftUI, generated client) only after Android validates the API; iOS needs $99/yr + Mac.
4. Push (FCM/APNs) for RSVP/event reminders: add after Android, backend token table.

## Limitations
No hands-on benchmark; CMP/KMP maturity from vendor docs + Medium-grade posts (low credibility). better-auth mobile specifics and hono-openapi 3.1 output not verified. No cost/store-policy deep dive.

## Unresolved
- Offline support needed (affects cache layer)?
- Social login providers wanted?
- Push notifications in v1?

Status: DONE
