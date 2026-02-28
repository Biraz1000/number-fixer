# Number Fixer & Drive Tool

This tool allows you to:
1. Fix Nigerian numbers (ensure 234 prefix + 11 digits).
2. Sort and group numbers by their suffix (A-Z, symbols).
3. Detect duplicates.
4. **Login with Gmail** and **Save results directly to Google Drive**.

## Deployment to Vercel (Free Hosting)

To make this tool available online (so you can use it from any device), follow these steps:

### Step 1: Deploy Code to Vercel
1. Upload this `number-fixer` folder to **GitHub**.
2. Go to [Vercel.com](https://vercel.com) and sign up/login.
3. Click **"Add New Project"** and select your GitHub repository.
4. Click **Deploy**.
5. Once deployed, Vercel will give you a domain link (e.g., `https://number-fixer-xyz.vercel.app`). **Copy this link.**

### Step 2: Get Google Credentials (CLIENT_ID & SECRET)
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **New Project** (name it "Number Tool").
3. **Enable Drive API:**
   - Go to **APIs & Services > Library**.
   - Search for "Google Drive API" and click **Enable**.
4. **Configure Consent Screen:**
   - Go to **APIs & Services > OAuth consent screen**.
   - Select **External** > Create.
   - Fill in App Name and Emails.
   - Add your Gmail address to **"Test Users"**.
5. **Create Credentials:**
   - Go to **APIs & Services > Credentials**.
   - Click **Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized redirect URIs**:
     - Add: `https://YOUR-VERCEL-LINK.vercel.app/auth/callback`
     - (Replace `YOUR-VERCEL-LINK` with the actual link from Step 1).
   - Click **Create**.
6. Copy your **Client ID** and **Client Secret**.

### Step 3: Add Credentials to Vercel
1. Go to your project settings in **Vercel**.
2. Go to **Settings > Environment Variables**.
3. Add these 3 variables:
   - `GOOGLE_CLIENT_ID` = (Paste your Client ID)
   - `GOOGLE_CLIENT_SECRET` = (Paste your Client Secret)
   - `REDIRECT_URI` = `https://YOUR-VERCEL-LINK.vercel.app/auth/callback`
4. Go to **Deployments** tab and click **Redeploy** to apply changes.

Now your tool is ready to use from anywhere!
