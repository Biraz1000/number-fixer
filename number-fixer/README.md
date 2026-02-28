# Number Fixer & Drive Tool

This tool allows you to:
1. Fix Nigerian numbers (ensure 234 prefix + 11 digits).
2. Sort and group numbers by their suffix (A-Z, symbols).
3. Detect duplicates.
4. **Login with Gmail** and **Save results directly to Google Drive**.

## Setup Instructions (Required for Google Login)

To allow "Login with Google", you must create your own Google Cloud Project credentials. This is a security requirement by Google.

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **New Project** (name it "Number Tool" or similar).
3. Select the project.

### Step 2: Enable Google Drive API
1. In the sidebar, go to **APIs & Services > Library**.
2. Search for **Google Drive API**.
3. Click **Enable**.

### Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Choose **External** (or Internal if you have a Google Workspace).
3. Fill in required fields (App name, User support email, Developer contact email).
4. Click **Save and Continue**.
5. **Scopes**: Add `.../auth/drive.file` and `.../auth/userinfo.email`.
6. **Test Users**: Add your own Gmail address (since the app is in "Testing" mode).

### Step 4: Create Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Application type: **Web application**.
4. Name: "Web Client 1".
5. **Authorized redirect URIs**: Add `http://localhost:3000/auth/callback`.
6. Click **Create**.
7. Copy your **Client ID** and **Client Secret**.

### Step 5: Configure Environment
1. Open the `.env` file in this folder.
2. Replace the placeholders with your credentials:
   ```
   GOOGLE_CLIENT_ID=your_pasted_client_id
   GOOGLE_CLIENT_SECRET=your_pasted_client_secret
   PORT=3000
   ```

## Running the Tool

1. Open a terminal in this folder (`web_tool`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser to `http://localhost:3000`.

## Usage
- Paste your numbers in the Input box.
- Click **Process Data** to clean and sort them.
- Click **Login with Google** to authorize Drive access.
- Click **Save to Google Drive** to upload the result file to your Drive root folder.
