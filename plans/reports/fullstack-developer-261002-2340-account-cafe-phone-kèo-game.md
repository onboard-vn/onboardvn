# Account province/shelf switch, café phone, kèo ?game prefill

Files: app/account.tsx, features/account/{privacy-types,privacy-settings}.tsx (province Select + clubShelfSuggest Switch, saved via PATCH /me/privacy; defaults province null, switch on if missing; `privacyValuesFrom`), features/my-cafes/info-form.tsx, features/admin/{cafe-body.ts,cafe-form.tsx,cafe-body.test.ts} (links.phone), features/cafes/labels.ts(+test) `telUrl`, app/cafes/[slug].tsx (tel: link in LinkRow), app/events/new.tsx + features/events/event-form.tsx (`?game=` prefill, enables table section, changeable; unknown slug ignored).

Verify: lint pass, prettier pass, tests pass except features/suggest (other agent). Typecheck errors only in features/suggest. Rebuilt packages/shared dist (stale, lacked phone) to typecheck.

Open: admin cafe edit already replaces `links` wholesale (only fanpage/maps/phone) — pre-existing, may wipe zalo/instagram. No browser check done.
