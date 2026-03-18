# ColorcraftAI — Deployment Guide

Online Reputation Management platform for Indian businesses, powered by Claude AI and Supabase.

---

## Project Structure

```
colorcraftai/
├── index.html          ← Homepage / marketing
├── admin.html          ← Admin dashboard (your team)
├── portal.html         ← Client portal (Sharma Dental demo)
├── chatbot.html        ← AI chatbot demo
│
├── api/
│   ├── dashboard.js    ← GET  /api/dashboard
│   ├── reviews.js      ← GET/POST  /api/reviews
│   ├── review.js       ← PATCH/DELETE  /api/review?id=
│   ├── clients.js      ← GET/POST  /api/clients
│   ├── client.js       ← GET  /api/client?slug=
│   ├── generate.js     ← POST /api/generate  (Claude AI response)
│   └── chat.js         ← POST /api/chat      (Claude chatbot)
│
├── lib/
│   └── supabase.js     ← Supabase client singleton
│
├── supabase/
│   └── schema.sql      ← Database schema + seed data
│
├── package.json
├── vercel.json
└── .env.example
```

---

## Step 1 — Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a **New Project** (any name, e.g. "colorcraftai")
3. Wait for the project to provision (~1 min)
4. Go to **SQL Editor → New Query**
5. Paste the entire contents of `supabase/schema.sql`
6. Click **Run** — this creates all tables and inserts seed data
7. Go to **Settings → API** and copy:
   - **Project URL** → this is your `SUPABASE_URL`
   - **service_role** key (under "Project API keys") → this is your `SUPABASE_SERVICE_KEY`

---

## Step 2 — Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account (add billing — pay-as-you-go, very cheap for this)
3. Go to **API Keys → Create Key**
4. Copy it — this is your `ANTHROPIC_API_KEY`

> **Cost estimate:** Each AI response generation costs ~$0.001–0.003. A chatbot conversation costs ~$0.005. Very affordable.

---

## Step 3 — Deploy to Vercel

### Option A: Via CLI (recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to project folder
cd colorcraftai

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No → create new
# - Project name: colorcraftai
# - Which directory? ./  (current)
# - Override settings? No
```

### Option B: Via GitHub

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Select your repo → Deploy

---

## Step 4 — Set Environment Variables

In Vercel Dashboard → your project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | https://xxxx.supabase.co |
| `SUPABASE_SERVICE_KEY` | your service_role key |
| `ANTHROPIC_API_KEY` | sk-ant-xxxx |

After adding variables, go to **Deployments → Redeploy** to apply them.

---

## Step 5 — Access Your App

After deployment, Vercel gives you a URL like `https://colorcraftai.vercel.app`

| Page | URL |
|---|---|
| Homepage | `https://your-app.vercel.app/` |
| Admin panel | `https://your-app.vercel.app/admin.html` |
| Client portal | `https://your-app.vercel.app/portal.html` |
| Chatbot | `https://your-app.vercel.app/chatbot.html` |

---

## Adding More Clients

To add a new client to the system:

**Option A — via Supabase dashboard:**
```sql
INSERT INTO clients (name, slug, business_type, city, contact_email, plan, monthly_fee)
VALUES ('New Clinic', 'new-clinic', 'Dental Clinic', 'Mumbai', 'owner@clinic.com', 'growth', 5999);
```

**Option B — via API:**
```bash
curl -X POST https://your-app.vercel.app/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"New Clinic","slug":"new-clinic","city":"Mumbai","plan":"growth","monthly_fee":5999}'
```

**To create a portal for a new client:**
Duplicate `portal.html`, rename it (e.g. `mehta-dental.html`), and change this line at the top of the script:
```js
const CLIENT_SLUG = 'mehta-dental'; // ← change this
```

---

## Local Development

```bash
# Install dependencies
npm install

# Create .env from template
cp .env.example .env
# Fill in your keys in .env

# Run local dev server
vercel dev

# Visit http://localhost:3000
```

---

## API Reference

### GET /api/dashboard
Returns KPIs, top clients, and recent alerts.

### GET /api/reviews?status=pending&limit=20
Returns review list. `status` can be: `pending`, `approved`, `published`, `skipped`.

### PATCH /api/review?id={uuid}
Update a review. Body: `{ response_status, ai_response }`

### POST /api/generate
Generate an AI response for a review.
Body: `{ reviewId, reviewText, businessName, businessType, platform, rating }`

### POST /api/chat
Send a message to the Claude chatbot.
Body: `{ messages: [{role, content}], mode: "admin"|"client", clientSlug }`

---

## Plans & Pricing (as configured in DB)

| Plan | Monthly Fee | Features |
|---|---|---|
| Starter | ₹2,999 | Basic review monitoring |
| Growth | ₹5,999 | AI responses + reports |
| Pro | ₹9,999 | All features + priority |
| Enterprise | Custom | White-label + API |
