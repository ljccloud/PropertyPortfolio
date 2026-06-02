# Property Portfolio Manager

A mobile-first property portfolio management app built with Next.js, deployed on Vercel, with Google Drive as storage.

## Features

- **Overview** — Portfolio summary with cert status, key metrics, period filters
- **Properties** — Full property detail: owners, tenants, rent history, letting agent, key contacts
- **Finance Log** — Transaction tracking with UK tax year apportionment and MTD CSV export
- **Maintenance** — Issue tracking by property and status
- **Documents** — Upload documents to Google Drive with automatic naming and certificate/appliance metadata

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Auth**: NextAuth v4 with Google OAuth
- **Storage**: Google Drive API (files + JSON data)
- **Hosting**: Vercel (auto-deploy from GitHub)
- **Styling**: Tailwind CSS

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/portfolio-app.git
cd portfolio-app
npm install
```

### 2. Google Cloud Console setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable the **Google Drive API**
4. Go to **APIs & Services → Credentials**
5. Create **OAuth 2.0 Client ID** (Web application)
6. Add Authorised redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-app.vercel.app/api/auth/callback/google` (production)
7. Note your **Client ID** and **Client Secret**

### 3. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

```env
GOOGLE_CLIENT_ID=434046440829-4kr09lbdl6u5eu03h92g5obb12nc72fd.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=run: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploying to Vercel

### Option A: Vercel Dashboard (recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. Add environment variables in Vercel dashboard:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` = `https://your-app.vercel.app`
5. Deploy

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel
```

### After deploying

1. Copy your Vercel URL (e.g. `https://portfolio-abc123.vercel.app`)
2. Update `NEXTAUTH_URL` in Vercel env vars to that URL
3. Add the Vercel callback URL to Google Console authorised redirect URIs:
   `https://your-app.vercel.app/api/auth/callback/google`
4. Redeploy

## Google Drive Structure

The app automatically creates this folder structure in your Google Drive:

```
Portfolio App/
├── data/
│   ├── properties.json
│   ├── transactions.json
│   ├── maintenance.json
│   └── documents.json
└── properties/
    ├── 14_HighSt/         ← auto-created per property
    │   ├── 14_2506_Certificates_Gas.pdf
    │   └── ...
    └── ...
```

## UK Tax Year

Finance apportionment follows the UK tax year (6 April – 5 April). Multi-period transactions are prorated to the day, so a 12-month insurance policy is correctly split across tax years.

## MTD Export

Use the download button on the Finance screen to export a CSV of transactions for any period, suitable for Making Tax Digital reporting.

## File Naming Convention

Uploaded documents are automatically renamed:
`{FirstWordAddress}_{YYMM}_{Category}_{FirstWordDescription}.{ext}`

Example: `14_2506_Certificates_Gas.pdf`
