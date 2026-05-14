# Dropship Manager

A multi-tenant dropshipping management app for **Amazon, Shopify, and Etsy**, with **AI features in every workflow** (powered by OpenRouter → Claude Haiku 4.5 by default).

Stack: **Next.js 15 · TypeScript · Tailwind · Postgres (Drizzle ORM) · OpenRouter**.

---

## Quick start

```bash
# 1. Put your OpenRouter API key in .env (file is already created):
#    OPENROUTER_API_KEY=sk-or-v1-...
#
# 2. Boot the app — this kills stale ports, starts Postgres in docker,
#    pushes schema, seeds data, then starts Next.js with HMR.
./start.sh
```

Then open **http://localhost:3001** and click **Use demo credentials** on the login page.

The script supports a couple of flags:

```bash
./start.sh --reset      # drop & recreate the database before starting
./start.sh --no-seed    # skip seeding (use existing data)
```

> The dev server is `next dev`, so any edits to `src/**` hot-reload automatically.

---

## Features

The app ships with **12 operational features** (each fully wired with backend, frontend, list/detail/edit/delete, and a primary AI action) plus an **AI Center** with **15 AI tools**.

### Operational features
| Feature | What it does | Primary AI action |
|---|---|---|
| **Products** | Catalog across all channels | Generate descriptions |
| **Suppliers** | Vendor directory | Supplier scoring |
| **Orders** | Cross-channel order book | Demand forecasting |
| **Customers** | CRM + segmentation | Customer segmentation |
| **Inventory** | Stock per warehouse | Demand forecasting |
| **Campaigns** | Paid + email marketing | Ad copy generation |
| **Sales Channels** | Amazon / Shopify / Etsy connections | Cross-channel strategy |
| **Pricing Rules** | Markup, match, undercut | Pricing suggestion |
| **Reviews** | Customer reviews | Reply drafting |
| **Returns** | RMA workflow | Reason classification |
| **Shipments** | Outbound tracking | Executive summary |
| **Analytics** | Real-time KPIs | Executive briefing |

### AI tools (in `/ai`)
1. Product Description Writer · 2. Listing Title Optimizer · 3. SEO Tags Generator · 4. Ad Copy Generator · 5. Email Campaign Writer · 6. Customer Segmentation Analyst · 7. Demand Forecast · 8. Supplier Evaluator · 9. Pricing Suggestion · 10. Competitor Analysis · 11. Review Sentiment Analyzer · 12. Review Response Drafter · 13. Return Reason Classifier · 14. Cross-Channel Strategy · 15. Business Executive Summary

Every AI run is logged to the `ai_runs` table.

> If `OPENROUTER_API_KEY` is empty, AI tools render a tasteful **preview response** so the UI is fully demo-able before you add a key.

---

## Project layout

```
dropShipping/
├── start.sh                    # bootstraps everything
├── docker-compose.yml          # postgres only (app runs in dev mode)
├── nginx/dropship.conf         # sample nginx reverse-proxy for your VPS
├── drizzle.config.ts
├── .env / .env.example
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx            # → /login or /dashboard
    │   ├── login/              # login + demo credentials button
    │   ├── (app)/              # authenticated layout (sidebar + content)
    │   │   ├── dashboard/
    │   │   ├── analytics/
    │   │   ├── ai/             # AI Center hub
    │   │   │   └── [tool]/     # one runner page per AI tool
    │   │   └── [feature]/      # generic CRUD for all 12 features
    │   │       ├── page.tsx        # list + search + new + row click
    │   │       ├── new/page.tsx    # create form
    │   │       └── [id]/page.tsx   # detail + edit + delete
    │   └── api/
    │       ├── auth/           # login, logout, demo-credentials
    │       ├── ai/[tool]/      # one route handles all AI tools
    │       └── features/[slug] # one route handles CRUD for all features
    ├── components/             # sidebar, data-table, ai-response, …
    ├── lib/
    │   ├── db/                 # schema, client, seed
    │   ├── auth.ts             # JWT cookie session
    │   ├── openrouter.ts       # OpenRouter client + run logger
    │   ├── ai-tools.ts         # registry of all AI tools
    │   ├── features.ts         # registry of operational features
    │   └── feature-db.ts       # generic CRUD over Drizzle
    └── middleware.ts           # auth gate
```

---

## Deploying to your Hostinger VPS

1. Copy the project to your VPS (e.g. `/opt/dropship`).
2. Make sure Docker is running on the VPS.
3. Edit `nginx/dropship.conf` → set your real domain and place it in `/etc/nginx/sites-available/`.
4. Enable & reload nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/dropship.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
5. Get HTTPS with certbot:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```
6. Run the app:
   ```bash
   ./start.sh
   ```

For long-running production, swap `next dev` for `next build && next start` and keep the process up with `pm2` or a `systemd` unit.

---

## Environment variables

```env
DATABASE_URL=postgresql://dropship:dropship@localhost:5433/dropship
JWT_SECRET=<long random string>

DEMO_EMAIL=demo@dropship.local
DEMO_PASSWORD=demo1234

OPENROUTER_API_KEY=
OPENROUTER_MODEL=anthropic/claude-haiku-4.5
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
APP_URL=http://localhost:3001
```
