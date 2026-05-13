# Deploy Docket to Railway (5 minutes)

## What's Ready
- ✅ React frontend built and embedded in Express server
- ✅ Demo data removed (clean database)
- ✅ Demo seeding disabled in production
- ✅ `railway.json` configured for auto-build
- ✅ Git repo initialized with clean commits

---

## Step 1: Push Code to GitHub

### Create a new GitHub repo
1. Go to **[github.com/new](https://github.com/new)**
2. **Repository name:** `docket`
3. Click **Create Repository**

### Push your code
Copy and paste into Terminal:

```bash
cd ~/Downloads/docket
git remote add origin https://github.com/YOUR_USERNAME/docket.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Step 2: Deploy on Railway

### Sign in to Railway
1. Go to **[railway.app](https://railway.app)**
2. Click **Login with GitHub** → Authorize

### Create project
1. Click **New Project** → **Deploy from GitHub repo**
2. Search for and select `docket`
3. Railway auto-detects the config and starts building
4. Wait for "Build Successful" ✅

### Add environment variables
1. In your Railway project → **Variables** tab
2. Add these variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `docket-secret-key-${random-string}` |
| `ANTHROPIC_API_KEY` | *(get from [console.anthropic.com](https://console.anthropic.com))* |
| `RESEND_API_KEY` | *(get from [resend.com/api-keys](https://resend.com/api-keys))* |

3. Click **Save** → Railway redeploys with the new variables

### Get your live URL
- Go to **Deployments** tab
- Once the new deployment shows "Success", click the URL
- It looks like: `https://docket-production-abc123.up.railway.app`
- That's your live app! 🎉

---

## What's Running

**Single Express server on one port:**
- `GET /api/*` → Backend API (Node.js)
- `GET /` → React app (static files from `client/dist`)
- `/uploads` → Uploaded files

**CORS:** Disabled in production (everything is same-origin)

**Database:** SQLite (stored in Railway's ephemeral filesystem, resets on redeploy)
- For persistent data with multiple users, upgrade to Railway PostgreSQL

---

## Troubleshooting

**Build fails?**
- Check the **Build Logs** in Railway → Settings
- Common issue: Missing environment variables

**App crashes after deploy?**
- Check **Deploy Logs** in Railway
- Make sure `ANTHROPIC_API_KEY` and `RESEND_API_KEY` are set

**Database resets after deploy?**
- SQLite is ephemeral on Railway
- To keep data persistent, add a PostgreSQL database (Railway offers free tier)

---

## Next Steps

- Share your Railway URL with anyone to use the app
- To make changes: edit code locally → `git push` → Railway auto-deploys
- To add a real database: In Railway, add a PostgreSQL service and update your connection string
