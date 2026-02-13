# Google OAuth Setup Instructions

Follow these steps to create Google OAuth credentials for your Resume-Agent application.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `Resume-Agent` (or your preferred name)
4. Click **Create**

## Step 2: Enable Google+ API

1. In the Google Cloud Console, select your project
2. Go to **APIs & Services** → **Library**
3. Search for "Google+ API" or "Google Identity"
4. Click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Resume-Agent
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. Skip the Scopes section (click **Save and Continue**)
7. Add test users if needed (for development)
8. Click **Save and Continue**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: **Web application**
4. Enter **Name**: Resume-Agent Web Client
5. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (for development)
   - Your production domain (e.g., `https://yourdomain.com`)
6. Add **Authorized redirect URIs**:
   - `http://localhost:8000/api/auth/google/callback` (for development)
   - Your production callback URL (e.g., `https://api.yourdomain.com/api/auth/google/callback`)
7. Click **Create**

## Step 5: Save Your Credentials

You'll see a popup with:
- **Client ID**: Something like `123456789-abc123def456.apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-abc123def456`

**Copy these values** - you'll need them in the next step!

## Step 6: Update Environment Variables

### Backend (.env)
Add these lines to `backend/.env`:
```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

### Frontend (.env)
Create `frontend/.env` with:
```
VITE_GOOGLE_CLIENT_ID=your_client_id_here
```

**Note**: Use the same Client ID for both frontend and backend!

## Security Notes

- ⚠️ **Never commit** `.env` files to version control
- ⚠️ Keep your Client Secret secure
- ✅ Add `.env` to `.gitignore` (should already be there)
- ✅ For production, use environment variables in your hosting platform

## Testing

Once configured, you can test the OAuth flow:
1. Start your backend and frontend servers
2. Click "Continue with Google" on the login page
3. You should see the Google sign-in popup
4. After signing in, you'll be redirected back to your app

## Troubleshooting

**Error: redirect_uri_mismatch**
- Check that your redirect URI in Google Console exactly matches the one in your `.env`
- Make sure there are no trailing slashes

**Error: invalid_client**
- Verify your Client ID and Client Secret are correct
- Check that you're using the correct credentials for your environment

**Error: access_denied**
- Make sure you've added yourself as a test user in the OAuth consent screen
- Check that the Google+ API is enabled
