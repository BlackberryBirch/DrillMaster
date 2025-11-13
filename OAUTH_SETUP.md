# OAuth Provider Setup Guide

This guide explains how to configure third-party authentication providers (OAuth) for the Horse Show Editor.

## Supported Providers

The app supports the following OAuth providers:

- ✅ **Google** - Most popular, easy setup
- ✅ **GitHub** - Great for developers
- ✅ **Microsoft** - Good for enterprise users
- ✅ **Discord** - Popular for communities
- ✅ **Apple** - iOS/Mac users (requires paid developer account)

## How OAuth Works

1. User clicks "Sign in with Google" (or other provider)
2. User is redirected to provider's login page
3. User authorizes the app
4. Provider redirects back to your app with authentication token
5. Supabase handles the token exchange
6. User is signed in automatically

## Quick Setup Guide

### 1. Google OAuth (Recommended - Easiest)

**Time: ~5 minutes**

1. **Get Google OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create/select a project
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - Add authorized redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`
   - Copy **Client ID** and **Client Secret**

2. **Configure in Supabase**:
   - Supabase Dashboard → **Authentication** → **Providers**
   - Enable **Google**
   - Paste Client ID and Client Secret
   - Click **Save**

3. **Test**:
   - Click "Sign In" in the app
   - Click "Google" button
   - Should redirect to Google login

### 2. GitHub OAuth

**Time: ~3 minutes**

1. **Create GitHub OAuth App**:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click **New OAuth App**
   - **Application name**: "Horse Show Editor" (or your app name)
   - **Homepage URL**: Your app URL
   - **Authorization callback URL**: `https://[your-project-ref].supabase.co/auth/v1/callback`
   - Click **Register application**
   - Copy **Client ID**
   - Click **Generate a new client secret**
   - Copy **Client Secret**

2. **Configure in Supabase**:
   - Supabase Dashboard → **Authentication** → **Providers**
   - Enable **GitHub**
   - Paste Client ID and Client Secret
   - Click **Save**

### 3. Microsoft OAuth

**Time: ~10 minutes**

1. **Register App in Azure**:
   - Go to [Azure Portal](https://portal.azure.com/)
   - Navigate to **Azure Active Directory** → **App registrations**
   - Click **New registration**
   - **Name**: Your app name
   - **Supported account types**: Choose appropriate (usually "Accounts in any organizational directory and personal Microsoft accounts")
   - **Redirect URI**: 
     - Platform: Web
     - URI: `https://[your-project-ref].supabase.co/auth/v1/callback`
   - Click **Register**

2. **Get Credentials**:
   - Copy **Application (client) ID**
   - Go to **Certificates & secrets**
   - Click **New client secret**
   - Copy the **Value** (this is your Client Secret - save it now, you can't see it again!)

3. **Configure in Supabase**:
   - Supabase Dashboard → **Authentication** → **Providers**
   - Enable **Microsoft**
   - Paste Application ID and Client Secret
   - Click **Save**

### 4. Discord OAuth

**Time: ~5 minutes**

1. **Create Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click **New Application**
   - Give it a name
   - Go to **OAuth2** → **General**
   - Add redirect: `https://[your-project-ref].supabase.co/auth/v1/callback`
   - Copy **Client ID**
   - Click **Reset Secret** and copy **Client Secret**

2. **Configure in Supabase**:
   - Supabase Dashboard → **Authentication** → **Providers**
   - Enable **Discord**
   - Paste Client ID and Client Secret
   - Click **Save**

### 5. Apple OAuth (Advanced)

**Requirements**: Apple Developer Account ($99/year)

1. **Create Service ID**:
   - Go to [Apple Developer Portal](https://developer.apple.com/)
   - **Certificates, Identifiers & Profiles** → **Identifiers**
   - Create new **Services ID**
   - Configure domains and redirect URLs
   - Create **Key** for Sign in with Apple

2. **Configure in Supabase**:
   - Supabase Dashboard → **Authentication** → **Providers**
   - Enable **Apple**
   - Enter Service ID, Key ID, Team ID, and Private Key
   - See [Supabase Apple OAuth docs](https://supabase.com/docs/guides/auth/social-login/auth-apple) for detailed steps

## Finding Your Supabase Project Reference

Your project reference is in your Supabase URL:
- URL: `https://abcdefghijklmnop.supabase.co`
- Project ref: `abcdefghijklmnop`

Or find it in Supabase Dashboard → **Settings** → **API** → **Project URL**

## Enabling/Disabling Providers in the UI

Edit `src/config/authProviders.ts` to enable/disable providers:

```typescript
export const authProviders: AuthProviderConfig[] = [
  {
    id: 'google',
    name: 'Google',
    enabled: true,  // Set to false to hide
    // ...
  },
  // ...
];
```

## Testing OAuth

1. **Start your app**: `npm run dev`
2. **Click "Sign In"** in the toolbar
3. **Click an OAuth provider button** (e.g., "Google")
4. **You should be redirected** to the provider's login page
5. **After logging in**, you'll be redirected back to your app
6. **You should be signed in** automatically

## Troubleshooting

### "Redirect URI mismatch" error
- **Problem**: Redirect URI in provider settings doesn't match Supabase
- **Solution**: Use exact URL: `https://[your-project-ref].supabase.co/auth/v1/callback`

### OAuth button doesn't appear
- **Problem**: Provider not enabled in `authProviders.ts`
- **Solution**: Check `enabled: true` in config file

### "Provider not enabled" error
- **Problem**: Provider not configured in Supabase dashboard
- **Solution**: Enable the provider in Supabase → Authentication → Providers

### Redirects to wrong URL after OAuth
- **Problem**: Site URL not configured correctly
- **Solution**: Set correct Site URL in Supabase → Authentication → URL Configuration

### OAuth works but user not signed in
- **Problem**: Redirect URL not in allowed list
- **Solution**: Add your app URL to Redirect URLs in Supabase settings

## Security Best Practices

1. ✅ **Never commit OAuth secrets** to git
2. ✅ **Use environment variables** for sensitive data
3. ✅ **Enable HTTPS** in production
4. ✅ **Set proper redirect URLs** (don't use wildcards)
5. ✅ **Regularly rotate** OAuth secrets
6. ✅ **Monitor** OAuth usage in Supabase dashboard

## Provider-Specific Notes

### Google
- Free to use
- Requires Google Cloud project
- Supports both personal and workspace accounts

### GitHub
- Free to use
- Great for developer-focused apps
- Users can grant repository access (optional)

### Microsoft
- Free to use
- Supports personal Microsoft accounts and Azure AD
- Good for enterprise integration

### Discord
- Free to use
- Popular with gaming/community apps
- Requires Discord account

### Apple
- Requires paid Apple Developer account
- Required for iOS App Store apps
- More complex setup
- Better privacy controls

## Recommended Provider Order

For best user experience, enable providers in this order:

1. **Google** - Most users have Google accounts
2. **GitHub** - If targeting developers
3. **Microsoft** - For enterprise users
4. **Discord** - For community/gaming apps
5. **Apple** - If targeting iOS users or need Apple Sign In

## Next Steps

After setting up OAuth:
1. ✅ Test each provider
2. ✅ Configure email templates (optional)
3. ✅ Set up production redirect URLs
4. ✅ Monitor authentication in Supabase dashboard

