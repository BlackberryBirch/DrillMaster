# Cloud Deployment Guide

This guide will help you deploy Equimotion Studio to various cloud hosting platforms.

## Quick Start - Recommended Platforms

### Option 1: Vercel (Recommended) ⭐
- **Best for**: React/Vite apps, automatic deployments
- **Free tier**: Excellent
- **Setup time**: ~5 minutes
- **Auto-deploy**: Yes (from GitHub)

### Option 2: Netlify
- **Best for**: Static sites, easy setup
- **Free tier**: Excellent
- **Setup time**: ~5 minutes
- **Auto-deploy**: Yes (from GitHub)

### Option 3: Cloudflare Pages
- **Best for**: Global CDN, performance
- **Free tier**: Excellent
- **Setup time**: ~5 minutes
- **Auto-deploy**: Yes (from GitHub)

## Prerequisites

1. ✅ Your code is in a Git repository (GitHub, GitLab, or Bitbucket)
2. ✅ You have a Supabase project set up (for cloud features)
3. ✅ Your `.env` file has your Supabase credentials

## Deployment Steps

### Method 1: Vercel (Recommended)

#### Step 1: Prepare Your Repository
```bash
# Make sure your code is committed and pushed to GitHub
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### Step 2: Deploy to Vercel

**Option A: Via Vercel Dashboard (Easiest)**
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Vite settings
6. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
7. Click "Deploy"
8. Wait ~2 minutes for deployment
9. Your app will be live at `https://your-project.vercel.app`

**Option B: Via Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from project root)
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? horse-show-editor
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

#### Step 3: Player links and Deployment Protection
Shareable player links (`/play/:token`) must be reachable without a login. If you have **Vercel Deployment Protection** (Vercel Authentication or Password Protection) enabled:

- **Standard Protection** (default): Only **Production Custom Domains** are exempt. The default `*.vercel.app` URL will require a Vercel login.
- **Fix:** Add a **Production Custom Domain** to your project (e.g. `yourapp.com`). Traffic to that domain is not protected, so `https://yourapp.com/play/xxx` will load without forcing a login. Share player links using your custom domain, not the `*.vercel.app` URL.
- If you use **All Deployments** protection (Pro/Enterprise), every URL is protected; use **Deployment Protection Exceptions** (Pro add-on or Enterprise) to allow a domain, or switch to Standard Protection and use a custom domain for production.

#### Step 4: Configure Custom Domain (Optional)
1. In Vercel dashboard → Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

### Method 2: Netlify

#### Step 1: Prepare Your Repository
Same as Vercel - make sure code is pushed to GitHub.

#### Step 2: Deploy to Netlify

**Option A: Via Netlify Dashboard**
1. Go to [netlify.com](https://netlify.com)
2. Sign up/Login with GitHub
3. Click "Add new site" → "Import an existing project"
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click "Show advanced" → "New variable"
   - Add `VITE_SUPABASE_URL`
   - Add `VITE_SUPABASE_ANON_KEY`
7. Click "Deploy site"
8. Your app will be live at `https://random-name.netlify.app`

**Option B: Via Netlify CLI**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Initialize (from project root)
netlify init

# Follow prompts, then:
netlify env:set VITE_SUPABASE_URL "your-url"
netlify env:set VITE_SUPABASE_ANON_KEY "your-key"

# Deploy
netlify deploy --prod
```

### Method 3: Cloudflare Pages

#### Step 1: Prepare Your Repository
Same as above.

#### Step 2: Deploy to Cloudflare Pages
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → **Create a project**
3. Connect your Git repository
4. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click "Save and Deploy"
7. Your app will be live at `https://your-project.pages.dev`

## Environment Variables

All platforms require your Supabase environment variables. Make sure to add:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Never commit `.env` files to Git. Always use the platform's environment variable settings.

## Post-Deployment Checklist

### 1. Update Supabase Redirect URLs
After deployment, update your Supabase auth settings:

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your production URL to **Redirect URLs**:
   - `https://your-app.vercel.app`
   - `https://your-app.netlify.app`
   - etc.

### 2. Test Your Deployment
- [ ] App loads correctly
- [ ] Authentication works (sign in/sign up)
- [ ] OAuth providers work (if configured)
- [ ] Cloud storage works (save/load drills)
- [ ] All features work as expected

### 3. Set Up Custom Domain (Optional)
- [ ] Add custom domain in hosting platform
- [ ] Configure DNS records
- [ ] Update Supabase redirect URLs with custom domain
- [ ] Enable HTTPS (usually automatic)

## Continuous Deployment

All recommended platforms support automatic deployments:

1. **Push to main branch** → Auto-deploys to production
2. **Push to other branches** → Creates preview deployments
3. **Pull requests** → Creates preview deployments for review

## Build Optimization

Your `vite.config.ts` is already optimized, but you can add:

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable in production for smaller builds
    minify: 'esbuild', // Fast minification
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          konva: ['konva', 'react-konva'],
        },
      },
    },
  },
});
```

## Troubleshooting

### Build Fails
- Check build logs in platform dashboard
- Ensure all dependencies are in `package.json`
- Run `npm run build` locally to test

### Environment Variables Not Working
- Verify variable names start with `VITE_`
- Check variable values are correct
- Redeploy after adding variables

### Authentication Not Working
- Verify Supabase redirect URLs include your production domain
- Check environment variables are set correctly
- Ensure OAuth providers have correct redirect URLs

### 404 Errors on Refresh
- This is a SPA routing issue
- Most platforms handle this automatically
- If not, add redirect rules (see platform-specific docs)

## Platform Comparison

| Feature | Vercel | Netlify | Cloudflare Pages |
|---------|--------|---------|------------------|
| Free Tier | Excellent | Excellent | Excellent |
| Auto-Deploy | ✅ | ✅ | ✅ |
| Custom Domain | ✅ Free | ✅ Free | ✅ Free |
| HTTPS | ✅ Auto | ✅ Auto | ✅ Auto |
| CDN | ✅ Global | ✅ Global | ✅ Global |
| Preview Deploys | ✅ | ✅ | ✅ |
| Build Time | Fast | Fast | Very Fast |
| Best For | React Apps | Static Sites | Performance |

## Recommended: Vercel

For this React + Vite app, **Vercel is recommended** because:
- ✅ Zero configuration for Vite
- ✅ Excellent React support
- ✅ Fast deployments
- ✅ Great developer experience
- ✅ Free custom domains
- ✅ Automatic HTTPS

## Next Steps

1. Choose a platform (Vercel recommended)
2. Push your code to GitHub
3. Follow deployment steps above
4. Add environment variables
5. Update Supabase redirect URLs
6. Test your live app!

Your app will be live in minutes! 🚀

