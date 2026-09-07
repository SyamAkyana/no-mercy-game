# Deploy No Mercy to Render.com (Free Tier)

## Prerequisites
- GitHub account (free)
- Render.com account (free, no credit card needed)

## Step 1: Upload to GitHub

Since Git is not installed on your system, use GitHub's web interface:

1. Go to https://github.com/new
2. Create a new repository named `no-mercy-game`
3. Click **"uploading an existing file"**
4. Drag and drop these files from `c:\Users\syama\OneDrive\Desktop\UNO\`:
   - `server.js`
   - `game-engine.js`
   - `index.html`
   - `package.json`
   - `README.md`
   - Create a new folder `test` and upload `test/engine.test.js`
5. Commit the files

## Step 2: Deploy to Render

1. Go to https://render.com and sign up (free, no credit card)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select your `no-mercy-game` repository
5. Configure:
   - **Name**: `no-mercy-game` (or any name you want)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Click **"Create Web Service"**

## Step 3: Wait for Deployment

- Render will install dependencies and start your server
- You'll get a URL like: `https://no-mercy-game-xxxx.onrender.com`
- First deployment takes 2-3 minutes
- The server may sleep after 15 minutes of inactivity (free tier limitation)

## Step 4: Test Your Deployed Game

1. Open your Render URL in 2+ browser tabs
2. Each tab: Enter name → Play Online
3. Create room, join, ready, start game!

## Important Notes for Free Tier

⚠️ **Free tier limitations**:
- Server sleeps after 15 min inactivity (takes ~30s to wake up)
- 750 hours/month free (enough for testing)
- Rooms reset when server restarts (in-memory only)

## Alternative: Fly.io (If you prefer)

Fly.io requires the Fly CLI:

1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Run in your UNO folder:
   ```powershell
   fly auth signup
   fly launch
   fly deploy
   ```

## Need Help?

If you get stuck, let me know which step and I'll help troubleshoot!
