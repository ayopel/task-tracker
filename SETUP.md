# TaskTracker — Setup Guide

TaskTracker is a frontend-only React app that uses **Google Sheets as its database** and **Google Drive** for storage. No backend server is needed.

---

## Prerequisites

- A Google account
- Node.js 18+ installed
- A Google Cloud project with OAuth 2.0 configured

---

## Step 1 — Clone & Install

```bash
git clone <your-repo-url>
cd TaskTracker
npm install
```

---

## Step 2 — Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"New Project"**, give it a name (e.g. "TaskTracker"), click **Create**
3. Make sure your new project is selected in the top bar

---

## Step 3 — Enable Required APIs

In your Google Cloud project, go to **APIs & Services → Library** and enable:

- **Google Drive API**
- **Google Sheets API**
- **People API** (for member search when sharing boards)

---

## Step 4 — Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **"+ Create Credentials" → OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - User type: **External**
   - App name: TaskTracker (or anything you like)
   - Add your email as a test user
4. For Application type, choose **Web application**
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (for local development)
   - Your production domain if deploying (e.g. `https://yourdomain.com`)
6. Leave Authorized redirect URIs empty (not needed for token-based OAuth)
7. Click **Create** — copy the **Client ID**

---

## Step 5 — Create an API Key

1. Go to **APIs & Services → Credentials**
2. Click **"+ Create Credentials" → API Key**
3. Copy the key
4. Click **"Edit API key"** and restrict it:
   - **Application restriction**: HTTP referrers
   - Add your domains: `localhost:5173/*` and your production domain
   - **API restriction**: Restrict to Google Drive API, Google Sheets API, People API

---

## Step 6 — Configure Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your_api_key
```

> ⚠️ **Never commit `.env.local` to git.** It is already in `.gitignore`.

---

## Step 7 — Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with Google.

On first sign-in, the app will automatically create a **"TaskTracker"** folder in your Google Drive with all the necessary Sheets structure.

---

## Deploying for Others to Use

### Option A — Netlify (Recommended, free)

1. Push your code to a GitHub/GitLab repo
2. Go to [netlify.com](https://netlify.com) → **"Add new site" → Import from Git**
3. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Go to **Site settings → Environment variables** and add:
   - `VITE_GOOGLE_CLIENT_ID` = your client ID
   - `VITE_GOOGLE_API_KEY` = your API key
5. Add your Netlify domain to Google Cloud Console under **Authorized JavaScript origins**

### Option B — Vercel (also free)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → **"New Project" → Import your repo**
3. Add environment variables in the Vercel dashboard
4. Add your Vercel domain to Google Cloud Console

### Option C — GitHub Pages

1. Install the deploy plugin: `npm install --save-dev gh-pages`
2. Add to `package.json` scripts: `"deploy": "gh-pages -d dist"`
3. Build and deploy: `npm run build && npm run deploy`
4. Add your GitHub Pages URL to Google Cloud Console

---

## Sharing with Your Team

Each person who uses TaskTracker needs to:

1. **Sign in** with their own Google account — the app will create their own TaskTracker folder in their Drive
2. To collaborate on the same boards: one person creates the board and **shares it** from the board's Settings → Members tab

> Note: Users can only share boards they own. Shared users can view and edit tasks based on their permission level.

---

## Security Notes

- **Never commit `.env.local`** — it contains your API key
- The Google Client ID is safe to expose (it's public-facing by design)
- The API key should have HTTP referrer restrictions set (see Step 5)
- Each user's data lives in their own Google Drive — you have no access to their data

---

## Troubleshooting

**"Sign in" button does nothing**
- Check that `VITE_GOOGLE_CLIENT_ID` is set correctly in `.env.local`
- Check the browser console for errors

**"Failed to load board data"**
- Ensure Google Sheets API and Google Drive API are enabled in your Cloud project

**Blank page after sign-in**
- Check the browser console; usually an API key issue or missing API enabled

**OAuth popup blocked**
- Allow popups for the app's domain in your browser settings
