# Draft — BGG XML API access request

Gửi qua form đăng ký ứng dụng ở https://boardgamegeek.com/using_the_xml_api (đăng nhập BGG), hoặc email hỗ trợ BGG nếu form yêu cầu liên hệ. Chủ nhân tự gửi.

---

**Subject:** XML API access request — OnBoard VN (non-commercial, open-source board game club app)

Hello BGG team,

I'm building **OnBoard VN**, a free, open-source (no ads, no paid features) web app for Vietnamese board game players: a café directory, game-night organization for clubs, and per-game score sheets for logging plays.

I'd like to register for XML API v2 access for:

- Matching our club's ~600 owned games to BGG ids (one-off), then refreshing occasionally.
- Showing basic metadata (name, year, player count, play time, weight, categories, mechanics) with a link back to the BGG game page.
- Optionally importing a user's own collection by BGG username, on their request.

Usage plan:

- Server-side only; token kept secret, never shipped to clients.
- Low volume: cached responses, ≤1 request/second, batch `thing` calls, a few thousand requests per month at most.
- We store only BGG ids plus the metadata above; no images or descriptions are copied — we link to BGG instead.
- Attribution "Data from BoardGameGeek" with a link on every page using the data.
- No AI/LLM training on BGG data.

Project: <repo URL> · Site: <site URL>
Contact: <name>, <email>

Thank you!
