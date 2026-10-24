# Babykohen.com

Public memorial for **Kohen Kartier Wiley** — forever one.

- **Live:** https://babykohen.com  
- **Backup:** https://babykohen.pages.dev  
- **Justice record:** https://justiceforkohen.com  

## What it is
An open memorial service: light a candle, read the ode, leave a public word of love or anger, and carry his name.

## Stack
- Cloudflare Pages (static + Functions)
- KV namespace `babykohen-wall` — shared letter wall + candle counter
- Vendored React + DC runtime (no runtime CDN)

## API
- `GET /api/letters` → `{ letters, candles }` (published wall only)
- `POST /api/letters` → submit a wall letter (rate-limited) — submissions are
  **held for review** in the KV `pending` queue and never publish directly
- `GET /api/moderate` → list the review queue (header `x-mod-token`)
- `POST /api/moderate` → `{ action: "approve" | "reject", id }` — approving
  publishes the letter and counts its candle; rejecting drops it
- `GET|POST /api/candles` → community candle count

Moderation auth is the `MOD_TOKEN` Pages secret (production + preview);
the token itself is held by Atlas, never in this repo.

## Deploy
```bash
export CLOUDFLARE_API_TOKEN=...
wrangler pages deploy . --project-name=babykohen --branch=main --commit-dirty=true
```

Built with love, dignity, and a light that stays on.
