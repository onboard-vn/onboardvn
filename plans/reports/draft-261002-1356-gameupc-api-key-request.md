# Draft — GameUPC production API key request

To: gameupc@grettir.org — chủ nhân tự gửi.

---

**Subject:** Production API key request — OnBoard VN (open-source, non-commercial)

Hi GameUPC team,

I'm building **OnBoard VN**, a free, open-source web app (with a native Android app coming) for Vietnamese board game players: café directory, club game nights and per-game score sheets.

I've tested your `/test` server and it works well for us. I'd like a production key for `https://api.gameupc.com/v1` to:

- Match games by barcode scan when cafés and clubs add games to their shelves.
- Search by name to resolve BGG ids for our club's ~600-game library (one-off), then small ongoing volume.
- Submit confirmations back (`POST /upc/{code}/bgg_id/{bggId}`) when our users verify a match, to contribute to your community data.

Usage:

- Key kept server-side only (API proxy), never shipped to browsers or apps.
- Low volume: cached results, well under 1 request/second, expected a few thousand requests per month.
- We store only the barcode ↔ BGG id mapping and a display name; images and descriptions are not stored.
- Attribution "Barcode data by GameUPC" with a link wherever we show it.

Project: <repo URL> · Site: <site URL>
Contact: <name>, <email>

Thanks a lot!
