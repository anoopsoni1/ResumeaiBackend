# Google OAuth 2.0 Setup

**If you see "Error 401: invalid_client"** — add valid `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Backend `.env` (see below).

**If you see "Error 400: redirect_uri_mismatch"** — the redirect URI your app sends to Google does not exactly match any **Authorized redirect URI** in the Google Cloud Console. Fix it like this:
1. **Restart your backend** and look at the terminal when it starts. You should see a line like:  
   `[Passport] Google callback URL (add this exact URI in Google Console): http://localhost:5000/api/v1/auth/google/callback`
2. **Copy that URL exactly** (including `http` vs `https`, no trailing slash).
3. In **[Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)** → your OAuth 2.0 Client ID → **Edit**.
4. Under **Authorized redirect URIs**, add the copied URL **exactly** (or fix the existing one). Remove any wrong or duplicate entries. Save.
5. Try "Sign in with Google" again. Changes in Google Console can take a minute to apply.

## 1. Create Google OAuth credentials

1. Open **[Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)** and sign in with your Google account (e.g. sonianup8965@gmail.com).

2. **Create or select a project** (top bar). If needed, create a new project (e.g. "ResumeAI").

3. **OAuth consent screen** (required before creating credentials):
   - Go to **APIs & Services → OAuth consent screen**.
   - Choose **External** (unless you use a Google Workspace org).
   - Fill **App name** (e.g. "ResumeAI"), **User support email** (your email), and **Developer contact**.
   - Save. You can add scopes later if prompted; for login, the defaults are enough.

4. **Create OAuth client ID**:
   - Go back to **APIs & Services → Credentials**.
   - Click **+ Create credentials** → **OAuth client ID**.
   - **Application type**: **Web application**.
   - **Name**: e.g. "ResumeAI Web".
   - **Authorized JavaScript origins** (optional for redirect flow; add if you use a frontend origin):
     - `http://localhost:5173`
     - Your production frontend URL if deployed.
   - **Authorized redirect URIs** (required — must match **character-for-character**; no trailing slash):
     - For local backend: `http://localhost:5000/api/v1/auth/google/callback`
     - For production backend: `https://resumeaibackend-oqcl.onrender.com/api/v1/auth/google/callback`
     - Use the same base as `API_BASE_URL` in your `.env`. When in doubt, copy the URL printed in the backend console at startup (see "Error 400: redirect_uri_mismatch" above).
   - Click **Create**.

5. **Copy the Client ID and Client secret** from the popup. They look like:
   - Client ID: `123456789-xxxx.apps.googleusercontent.com`
   - Client secret: `GOCSPX-xxxxxxxxxxxx`

## 2. Add credentials to Backend `.env`

Open `Backend/.env` and set (no quotes, no spaces around `=`):

```env
GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
```

Use the **exact** values from the Google Cloud Console. If these are missing or wrong, you get **"Error 401: invalid_client"**.

Also set (for local dev you can keep these):

```env
API_BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

- **API_BASE_URL**: Your backend base URL. Must match the host used in **Authorized redirect URIs** (e.g. for production use `https://resumeaibackend-oqcl.onrender.com`).
- **FRONTEND_URL**: Where to send the user after login (your React app URL).

**Restart the backend** after changing `.env`.

## 3. Flow summary

1. User clicks **Sign in with Google** on the login page → browser goes to `GET /api/v1/auth/google`.
2. Backend redirects to Google consent screen.
3. User signs in with Google → Google redirects to `GET /api/v1/auth/google/callback?code=...`.
4. Backend exchanges code for profile, finds or creates user, generates JWT, redirects to `FRONTEND_URL/auth/callback?token=...&user=...`.
5. Frontend stores token and user, then redirects to `/dashboard`.

## 4. Security notes

- JWT is sent in the redirect URL query (one-time). Frontend immediately stores it and replaces the URL.
- `accessToken` is also set in an HTTP-only cookie by the backend for cookie-based clients.
- Existing protected routes use the same `verifyJWT` middleware (Bearer token or cookie).
