# Research: FB posts + BoardGameWikia (boardgamewikia.com)

Date: 2026-10-02. Method: Chrome, read-only, FB not logged in (login wall; post text readable, comments mostly gated).
Policy per owner: cite/link to references, do not clone 1:1.

## Posts

### 1. Events ("Sự kiện") feature of BGW — https://www.facebook.com/share/p/1CAfQyWThc/
- Author (BGW maintainer) says events feature was underused ("ế"), mainly for cafés posting weekly game nights.
- After the "Top game muốn chơi" ranking, a user created a personal Unmatched kèo in HN -> first organic kèo.
- Rationale: FB group posting is faster/more visible, but a single aggregated place for all kèo/events per week/month saves hunting across groups.
- Flow: login -> Events -> Create event (game, time, place). Just added in-event comments (FB-like) for Q&A before RSVP.
- Comments (6, only 2 visible): author's own open Dune kèo; banter. No real feedback.
- Takeaway: demand for aggregated kèo is unproven; cold start problem; FB groups remain the primary channel.

### 2. Boardgami interactive rulebook — https://www.facebook.com/share/p/1DkEM3YGgD/
- Group HÓNG HỚT BOARD GAME. Third-party MVP (app.boardgami.com/vi/learn): step-by-step rules learning on phone for 4 light games (No Thanks!, Flip 7, Trio, Red7). Asks whether it beats rulebook.
- 77 reactions, 23 comments, 7 shares (high interest). Visible comments positive ("exactly what I need"). Rest gated by login.
- Takeaway: rules-teaching pain is real. Not BGW's product; unrelated to café/kèo core.

### 3. BGW Journal (Nhật ký) + Stats — https://www.facebook.com/share/p/1DWRNHcoeo/
- Maintainer says journal is modeled on BGG play logs; stats charts modeled on BG Stats ("not as good").
- Log fields: date, place, friends, notes (game quirks, mistakes, good moves). Stats auto-charted. Needs account; under profile.
- 19 reactions, 7 comments; visible comments are chit-chat only. No complaints/requests found.

## BoardGameWikia walkthrough (browse only)
- Nav: Home, Suggest, Browse Games, Shops, Events, search. VN/EN switch.
- Home: today/tomorrow event carousel (café nights + "Cá nhân" personal kèo), game lists (most wanted, trending, VN-made, beginner, new, top).
- Events (/vi/events/): filters All / this weekend / nearest / Hà Nội / TP.HCM (HN 1 vs HCM 24 events -> HCM-centric, HN nearly empty). Cards grouped by day, badges: genre, "Cá nhân" (personal), FULL. "Create event" + notification management. Event modal: cover game(s) with players/time/weight, host, venue+address, description, max players, participant list with slot counts (host can hold 2 slots), FULL state, follow host, share link, report, comment thread (like/reply/report, 1000 chars).
- Shops (/vi/shops/): café/club list by city, sort by game count or distance; shop page has events, map link, FB link, follow, game inventory list, "register" CTA on events.
- Browse: ~80 BGG-style categories (includes a stray "test category"); curated lists.
- Profile: overview with Top 10 games, collection (Tủ game), journal, events, photos, stats, notifications, settings. Journal and Stats pages show empty states for new user (charts not viewable without logging a play; not submitted).

## Gaps observed
- Event list: no calendar/table view, no waitlist (only FULL), no invite link beyond share; HN almost empty.
- Café data: game inventory exists but unclear who maintains it; no community contribution/moderation visible.
- No seat/table concept (one event = one slot pool); no RSVP-to-friends-group.
- Journal: no visible link journal<->event ("played at this kèo") ; stats unseen.
- Copy: stray test category, mixed EN/VN nav labels.
- Discovery depends on FB group traffic; no "looking for players" matching.

## Relation to BG Stats idea
BG Stats = play logging (game, players, scores, location, time) -> stats (plays, win rate, h-index, per-player). BGW journal+stats is a lightweight clone via BGG logs. For onboard-vn: logging is a retention add-on tied to kèo (auto-prefill from a finished kèo), not the core.

## Recommendations
| Feature | Verdict | Note |
|---|---|---|
| Aggregated events/kèo | Adopt (already built) | Differentiate: tables, waitlist, calendar, invite share (already in repo). Focus on café-hosted nights for supply. |
| Café directory + inventory | Adopt (already built) | Community contributions + moderation is the edge; link to BGW as reference. |
| In-event comments | Adopt (small) | Cheap; fits RSVP Q&A. |
| Play journal | Adopt later, minimal | Prefill from completed kèo; fields date/place/players/notes. |
| Stats charts (BG Stats style) | Skip / link-out | Link BG Stats app and BGG; export CSV maybe later. |
| Game database/browse/top lists | Link-out | Link to BGG/BGW game pages rather than rebuild. |
| Interactive rules (Boardgami) | Link-out | Link from game/kèo page; not core. |
| Top "most wanted" ranking | Skip for now | Needs critical mass. |

## Unresolved
- FB comments mostly hidden (no login); real user complaints not fully captured.
- BGW stats chart output not viewed (empty account; no data submitted).
- Whether BGW event/café data is community-editable unknown.

Status: DONE_WITH_CONCERNS
