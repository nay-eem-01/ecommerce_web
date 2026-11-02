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

Plan: `docs/ROADMAP.md` · Design: `docs/DESIGN.md` · Log: `docs/DEV_LOG.md`
