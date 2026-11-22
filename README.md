# Senpai Supply web

Storefront for Senpai Supply: anime figures, cosplay, bottles and bags, delivered across Bangladesh. Spin every
product in 360 before you buy; pay cash on delivery.

## Run

Needs Node 20.19+ and the backend running on `http://localhost:8080`
(`../E-commerce-application-with-springboot`, development profile for the demo catalog).

```bash
npm install
npm run dev       # http://localhost:5173
npm test
npm run lint
npm run build
npm run gen:api   # regenerate src/api/schema.d.ts from the running backend
npm run e2e       # end-to-end, backend running
```

Deploy: any static host. `vercel.json` rewrites every path to `index.html` and sets security headers; set
`VITE_API_BASE_URL` when the API is on another origin (see `.env.example`).

Set `VITE_GOOGLE_CLIENT_ID` to the same Google web client ID as the API and add your Vercel
origin to Google's Authorized JavaScript origins and the API's `CORS_ALLOWED_ORIGINS`.

For the shopper Playwright tests, start `python3 e2e/smtp_sink.py /tmp/shopper-mail.jsonl`.
Point the development API at `MAIL_HOST=127.0.0.1`, `MAIL_PORT=25252`,
`MAIL_SMTP_AUTH=false`, and `MAIL_SMTP_STARTTLS=false`. Set `STOREFRONT_URL=http://localhost:5174`
and run `E2E_MAILBOX=/tmp/shopper-mail.jsonl npm run e2e`.

Plan: `docs/ROADMAP.md` · Design: `docs/DESIGN.md` · Log: `docs/DEV_LOG.md`
