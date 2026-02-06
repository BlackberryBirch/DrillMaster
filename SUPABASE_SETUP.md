# Supabase Setup Guide

This guide will help you set up Supabase for cloud storage and authentication in Equimotion Studio.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: Your project name (e.g., "horse-show-editor")
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project" and wait for it to initialize (~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll need two values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")

## Step 3: Set Up Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Important**: Never commit `.env` to git (it's already in `.gitignore`)

## Step 4: Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase/migrations/001_create_drills_table.sql`
4. Click "Run" (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

## Step 5: Set Up Storage Bucket (for Audio Files)

1. In your Supabase dashboard, go to **Storage**
2. Click "Create a new bucket"
3. Set:
   - **Name**: `drill-audio`
   - **Public bucket**: ✅ Check this (so audio files can be accessed)
4. Click "Create bucket"
5. Go to **Policies** tab for the bucket
6. Click "New Policy" → "For full customization"
7. Add this policy for SELECT (read access):
   ```sql
   CREATE POLICY "Users can view own audio files"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'drill-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```
8. Add this policy for INSERT (upload):
   ```sql
   CREATE POLICY "Users can upload own audio files"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'drill-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```
9. Add this policy for DELETE:
   ```sql
   CREATE POLICY "Users can delete own audio files"
   ON storage.objects FOR DELETE
   USING (bucket_id = 'drill-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

## Step 6: Configure Authentication

### Enable Email Authentication (Default)

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. **Email** should be enabled by default
3. Configure email settings:
   - **Enable email confirmations**: Optional (recommended for production)
   - **Secure email change**: Recommended
   - **Double confirm email changes**: Optional

### Enable OAuth Providers (Recommended)

You can enable one or more OAuth providers for easier sign-in:

#### Google OAuth Setup

1. Go to **Authentication** → **Providers** → **Google**
2. Click **Enable Google provider**
3. You'll need to create OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://[your-project-ref].supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret**
4. Paste them into Supabase Google provider settings
5. Click **Save**

#### GitHub OAuth Setup

1. Go to **Authentication** → **Providers** → **GitHub**
2. Click **Enable GitHub provider**
3. Create a GitHub OAuth App:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click **New OAuth App**
   - Application name: Your app name
   - Homepage URL: Your app URL
   - Authorization callback URL: `https://[your-project-ref].supabase.co/auth/v1/callback`
   - Copy the **Client ID** and generate a **Client Secret**
4. Paste them into Supabase GitHub provider settings
5. Click **Save**

#### Microsoft OAuth Setup

1. Go to **Authentication** → **Providers** → **Microsoft**
2. Click **Enable Microsoft provider**
3. Register app in Azure:
   - Go to [Azure Portal](https://portal.azure.com/)
   - **Azure Active Directory** → **App registrations** → **New registration**
   - Name: Your app name
   - Redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`
   - Copy **Application (client) ID** and create a **Client secret**
4. Paste them into Supabase Microsoft provider settings
5. Click **Save**

#### Discord OAuth Setup

1. Go to **Authentication** → **Providers** → **Discord**
2. Click **Enable Discord provider**
3. Create Discord application:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click **New Application**
   - Go to **OAuth2** → **General**
   - Add redirect: `https://[your-project-ref].supabase.co/auth/v1/callback`
   - Copy **Client ID** and **Client Secret**
4. Paste them into Supabase Discord provider settings
5. Click **Save**

#### Apple OAuth Setup (Advanced)

1. Go to **Authentication** → **Providers** → **Apple**
2. Click **Enable Apple provider**
3. Requires Apple Developer account ($99/year)
4. Create Service ID in Apple Developer Portal
5. Configure redirect URI and keys
6. See [Supabase Apple OAuth docs](https://supabase.com/docs/guides/auth/social-login/auth-apple) for details

### Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your app URL (e.g., `http://localhost:5173` for dev)
3. Add **Redirect URLs**:
   - `http://localhost:5173` (for development)
   - `https://your-production-domain.com` (for production)
   - `https://[your-project-ref].supabase.co/auth/v1/callback` (required for OAuth)

### Email Templates (Optional)

Customize email templates in **Authentication** → **Email Templates**:
- Confirm signup
- Magic link
- Change email address
- Reset password

## Step 7: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Check the browser console for any Supabase connection errors
3. If you see warnings about missing environment variables, double-check your `.env` file

## Troubleshooting

### "Failed to fetch drills: relation 'drills' does not exist"
- Make sure you ran the SQL migration in Step 4

### "Storage bucket does not exist"
- Make sure you created the `drill-audio` bucket in Step 5

### "User not authenticated" errors
- This is expected until authentication is set up (Step 3)
- The app will still work for local file storage

### Environment variables not loading
- Make sure your `.env` file is in the project root
- Restart your dev server after changing `.env`
- Vite requires the `VITE_` prefix for environment variables

## Next Steps

Once Supabase is set up:
1. ✅ Database table created
2. ✅ Storage bucket configured
3. ⏳ Authentication setup (coming in Step 3)
4. ⏳ Migration from local to cloud storage (coming in Step 2)

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

