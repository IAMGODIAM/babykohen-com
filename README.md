# Babykohen.com

Public memorial site for **Kohen Kartier Wiley** — forever one.

- Live: https://babykohen.com
- Backup: https://babykohen.pages.dev
- Stack: Cloudflare Pages (static), no external CDN runtime deps (React + DC runtime vendored)

## Features
- Memorial service held in the open (no doors, no hours)
- Light a candle (local persistence)
- Public letter wall — love and anger
- Family condolence note helper
- Link out to justice record

## Deploy
```bash
export CLOUDFLARE_API_TOKEN=...
wrangler pages deploy . --project-name=babykohen --branch=main --commit-dirty=true
```

Built with love, dignity, and a light that stays on.
