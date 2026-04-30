# 🏠 Home Chores App

A simple household chore tracker for up to **4 people**. Add chores, tick them off, and get notified when housemates complete tasks.

**Two repos to deploy:**
- `chores-api/` → Backend (Node/Express + NeonDB) → deploy to Vercel
- `chores-app/` → Frontend (React/Vite) → deploy to Vercel

---

## ✨ Features

- 👥 Up to 4 household accounts (enforced by the backend)
- 📅 Daily chore list — browse any day with ‹ › arrows
- ✅ Tick off chores, see who completed what
- 🔁 Repeat options: just today, every day, or specific weekdays
- 🔔 Push notifications when chores are added or completed
- 📱 Works as a mobile app (installable PWA)

---

## 🚀 Deployment Guide

### Prerequisites

You'll need free accounts on:
- [Vercel](https://vercel.com) — to host both repos
- [Neon](https://neon.tech) — free Postgres database

---

### Step 1 — Set up NeonDB

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new **Project** (call it `chores` or anything you like)
3. Copy the **Connection String** — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
   Keep this safe, you'll need it soon.

---

### Step 2 — Generate VAPID Keys (for push notifications)

Run this once on your computer (requires Node.js):

```bash
npx web-push generate-vapid-keys
```

This outputs a **Public Key** and **Private Key**. Save both.

If you don't want notifications, you can skip this and leave the VAPID env vars blank — notifications just won't work.

---

### Step 3 — Deploy the Backend (`chores-api`)

1. Push the `chores-api` folder to its own GitHub repo
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import that repo
3. Add these **Environment Variables** in Vercel's settings:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | Any long random string (e.g. `openssl rand -hex 32`) |
| `FRONTEND_URL` | Leave blank for now, add after deploying frontend |
| `VAPID_PUBLIC_KEY` | From Step 2 |
| `VAPID_PRIVATE_KEY` | From Step 2 |
| `VAPID_EMAIL` | Your email address |

4. Deploy! Note the URL Vercel gives you (e.g. `https://chores-api.vercel.app`)

5. **Run the database migration** — visit this URL in your browser once:
   ```
   https://your-api.vercel.app/health
   ```
   Then run the migration by calling:
   ```bash
   # Clone the api repo locally first, then:
   cd chores-api
   npm install
   DATABASE_URL="your-neon-url" node src/db/migrate.js
   ```
   Or use Neon's SQL editor and paste the contents of `src/db/migrate.js` manually.

---

### Step 4 — Deploy the Frontend (`chores-app`)

1. Push the `chores-app` folder to its own GitHub repo
2. Go to Vercel → **Add New Project** → import that repo
3. Add this **Environment Variable**:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your backend URL from Step 3 (e.g. `https://chores-api.vercel.app`) |

4. Deploy! Note the frontend URL (e.g. `https://chores-app.vercel.app`)

---

### Step 5 — Connect Frontend ↔ Backend

1. Go back to your **backend** project in Vercel
2. Add/update the environment variable:
   ```
   FRONTEND_URL = https://chores-app.vercel.app
   ```
3. **Redeploy** the backend (Vercel → Deployments → Redeploy)

---

### Step 6 — Create Accounts & Share

1. Open your frontend URL in a browser
2. Click **"Join House"** and create the first account
3. Share the URL with your housemates — they each create their own account
4. Maximum 4 accounts. Once full, registration is locked.

---

## 📱 Install as a Mobile App

On iPhone: open the app in Safari → Share → **Add to Home Screen**

On Android: open in Chrome → menu → **Install app**

The app will work offline and send notifications like a native app.

---

## 🔧 Running Locally

### Backend

```bash
cd chores-api
npm install
cp .env.example .env
# Fill in .env with your values
node src/db/migrate.js   # Run once to create tables
npm run dev
```

### Frontend

```bash
cd chores-app
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:3001
npm run dev
```

Open http://localhost:5173

---

## 📁 Project Structure

```
chores-api/
├── src/
│   ├── index.js              # Express app entry
│   ├── db/
│   │   ├── client.js         # NeonDB connection
│   │   └── migrate.js        # Run once to create tables
│   ├── middleware/
│   │   └── auth.js           # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js           # Login, register, members
│   │   ├── chores.js         # CRUD + completions
│   │   └── notifications.js  # Push subscription
│   └── services/
│       └── notifications.js  # web-push service
├── .env.example
├── package.json
└── vercel.json

chores-app/
├── public/
│   ├── sw.js                 # Service worker (push notifications)
│   ├── manifest.json         # PWA manifest
│   └── icon.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── lib/
│   │   └── api.js            # API client
│   ├── hooks/
│   │   ├── useAuth.jsx       # Auth context + hook
│   │   └── useNotifications.js
│   ├── components/
│   │   ├── ChoreItem.jsx     # Single chore row
│   │   ├── AddChoreModal.jsx # Add chore sheet
│   │   └── MembersBar.jsx    # Household members list
│   └── pages/
│       ├── AuthPage.jsx      # Login / Register
│       └── HomePage.jsx      # Main chores view
├── .env.example
├── vite.config.js
├── index.html
└── package.json
```

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `users` | Up to 4 household members |
| `chores` | Chore definitions with repeat settings |
| `chore_completions` | Who completed what and when |
| `push_subscriptions` | Browser push notification tokens |

---

## 🛠️ Troubleshooting

**"Maximum 4 accounts" on first registration**
→ Your database already has data. Check Neon's SQL editor: `SELECT * FROM users;`

**Notifications not working**
→ Make sure VAPID keys are set correctly and the frontend URL uses HTTPS (required for push notifications).

**Chores not showing up**
→ Check the date — the app shows chores per day. "Just today" chores only appear on the day they were created.

**CORS errors**
→ Make sure `FRONTEND_URL` in the backend env exactly matches your frontend Vercel URL (no trailing slash).

**Database connection errors**
→ Make sure your NeonDB connection string ends with `?sslmode=require`

---

## 🔒 Security Notes

- Passwords are hashed with bcrypt
- JWT tokens expire after 30 days
- Only CORS requests from your frontend URL are allowed
- The 4-account limit is enforced server-side

---

Made with ❤️ for keeping houses tidy.
