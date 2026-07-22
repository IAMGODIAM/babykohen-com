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
- `GET /api/letters` → `{ letters, candles }`
- `POST /api/letters` → post a wall letter (rate-limited)
- `GET|POST /api/candles` → community candle count

## Deploy
```bash
export CLOUDFLARE_API_TOKEN=...
wrangler pages deploy . --project-name=babykohen --branch=main --commit-dirty=true
```

Built with love, dignity, and a light that stays on.
