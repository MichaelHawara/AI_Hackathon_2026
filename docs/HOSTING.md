# Hosting CareerPath AI (production)

The app is one **Node/Express** process: in production it serves the Vite build from `dist/` and all `/api/*` routes on the same origin. See [`server/index.ts`](../server/index.ts) (`NODE_ENV=production`).

---

## If you have never deployed a site (start here)

You will:

1. Put your project on **GitHub** (free).
2. Sign up for a host that runs **Node.js** for you. Below uses **Render** ([render.com](https://render.com))—one place to connect GitHub, set commands, and get a public `https://…` URL. Other hosts (Railway, Fly.io, a VPS) work similarly: build → start → env vars.
3. Copy your **environment variables** from `.env.local` into the host (never commit secrets to Git).
4. Add the host’s URL to **Firebase → Authorized domains** so login works.

**Time:** first deploy often takes 10–20 minutes including GitHub setup.

---

## Step 0 — Put the code on GitHub

1. Create a free account at [github.com](https://github.com) if you don’t have one.
2. Install [Git](https://git-scm.com/downloads) on your computer if needed.
3. In your project folder (`AI_Hackathon_2026`), open a terminal:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

4. On GitHub: **New repository** → name it (e.g. `careerpath-ai`) → **Create repository** (no need to add README if you already have one locally).
5. GitHub shows commands to “push an existing repository.” Use those (they look like):

   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/careerpath-ai.git
   git branch -M main
   git push -u origin main
   ```

6. Refresh GitHub—you should see your files.

---

## Step 1 — Create a Render account and a Web Service

1. Open **[render.com](https://render.com)** → **Get Started for Free** → sign up with **GitHub** (easiest so Render can read your repo).
2. After login: **Dashboard** → **New +** → **Web Service**.
3. **Connect a repository** → find `careerpath-ai` (or your repo name) → **Connect**.
4. Fill in the form:

   | Field | What to enter |
   |--------|----------------|
   | **Name** | Anything, e.g. `careerpath-ai` (becomes part of the URL). |
   | **Region** | Choose closest to you (e.g. Oregon). |
   | **Branch** | `main` (or whatever your default branch is). |
   | **Root Directory** | Leave **empty** (project is at repo root). |
   | **Runtime** | **Node** |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |
   | **Instance type** | Free is OK for demos (app may sleep after idle—first request can be slow). |

5. **Do not click Create yet**—set environment variables first (next step).

---

## Step 2 — Environment variables on Render (critical)

Your app needs the same secrets you use locally in **`.env.local`**. On Render, open **Environment** (or **Advanced** → **Add Environment Variable**).

1. Open your local **`.env.local`** in a text editor (do **not** paste it into Git or a public chat).
2. For **each** line that looks like `NAME=value`, add a row in Render: **Key** = `NAME`, **Value** = `value` (no quotes unless your value literally needs them).

**Must include for the app to work in the browser:**

- All **`VITE_…`** variables (Firebase, Gemini, etc.). These are baked in when **`npm run build`** runs, so they **must** exist **before** the first successful build on Render.
- Server-only keys you use: **`ADZUNA_APP_ID`**, **`ADZUNA_APP_KEY`**, any `RELEVANCEAI_*` keys, optional **`GEMINI_API_KEY`**, etc.

**Optional:** **`NODE_VERSION`** = `20` (or `22`) if the build complains about Node—Render reads this.

**Note:** Render injects **`PORT`** automatically—do **not** set `PORT` yourself unless their docs say so.

3. Save environment variables, then **Create Web Service** (or **Deploy**).

4. Wait for the **Logs** tab: you want to see the build finish and the server listening. When deploy succeeds, Render shows a URL like **`https://careerpath-ai.onrender.com`**.

5. Open that URL in the browser. If the page is blank or API fails, read the **Logs** for errors (missing env var, build failure, etc.).

---

## Step 3 — Firebase (so Sign-In works on the live URL)

1. Go to [Firebase Console](https://console.firebase.google.com) → your project.
2. **Build** → **Authentication** → gear icon **Settings** → **Authorized domains**.
3. **Add domain** → paste **only the hostname** from Render, e.g. `careerpath-ai.onrender.com` (no `https://`).
4. Save.

Try logging in again on the deployed site.

---

## Step 4 — After it works (optional)

- **Custom domain:** Buy a domain from a registrar, then in Render: **Settings** → **Custom Domain** and follow their DNS instructions (CNAME or A records).
- **Google Search:** [Google Search Console](https://search.google.com/search-console) → add your `https://…` URL as a property → request indexing. Ranking is not guaranteed.

---

## Build and run locally (smoke test)

```bash
npm install
npm run build
npm start
```

Open `http://localhost:3000` (or the port in `PORT`). Health check: `GET /api/health`.

- **`PORT`** — defaults to `3000`; set to your platform’s assigned port in production.
- **`HOST`** — defaults to `0.0.0.0` (bind all interfaces); use if your host requires it.

## Environment variables on the host

Copy values from your local `.env.local` into the hosting provider’s **secrets / environment** UI.

| Kind | Examples | Notes |
|------|----------|--------|
| **Vite (client)** | `VITE_FIREBASE_*`, `VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL` | Embedded at **`npm run build`** time. Change → **rebuild** the frontend. |
| **Server only** | `ADZUNA_*`, `RELEVANCEAI_*`, `GEMINI_API_KEY`, `JOBS_*`, etc. | Read at runtime; no `VITE_` prefix. Can often change without rebuilding (except when shared with build). |

Use the same keys as [`.env.example`](../.env.example); never commit `.env.local`.

## Firebase: authorized domains

1. Open [Firebase Console](https://console.firebase.google.com) → your project → **Authentication** → **Settings** → **Authorized domains** (or Project settings → General).
2. Add your **production** hostname(s), e.g. `yourdomain.com`, `www.yourdomain.com`, and your platform’s default URL if needed (e.g. `your-app.onrender.com`).

Without this, sign-in and some OAuth flows can fail on the deployed URL.

## Typical PaaS steps

1. Connect the Git repository (or upload the project).
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start`
4. Set **all** environment variables before the build (especially `VITE_*`).
5. Ensure the platform sets **`PORT`** and uses HTTPS for public URLs.

## Search indexing (optional)

Hosting does not guarantee ranking in Google. To improve discoverability for searches like “CareerPath AI”:

1. Add a **custom domain** and point DNS (A/AAAA or CNAME) per your host’s docs.
2. Use [Google Search Console](https://search.google.com/search-console) to add your URL property and request indexing.
3. The site includes a `<meta name="description">` in [`index.html`](../index.html) for snippets.

Trademark: ensure you have rights to use the public name in your jurisdiction.
