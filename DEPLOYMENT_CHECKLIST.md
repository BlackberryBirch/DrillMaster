# Pre-Deployment Checklist

Use this checklist before deploying to ensure everything is ready.

## Code Preparation

- [ ] All code is committed to Git
- [ ] Code is pushed to GitHub/GitLab/Bitbucket
- [ ] No console errors or warnings
- [ ] Build succeeds locally (`npm run build`)
- [ ] Preview works locally (`npm run preview`)

## Environment Variables

- [ ] `.env` file exists with Supabase credentials
- [ ] `.env` is in `.gitignore` (never commit secrets!)
- [ ] You have your Supabase URL ready
- [ ] You have your Supabase anon key ready

## Supabase Configuration

- [ ] Database table created (`drills` table)
- [ ] Storage bucket created (`drill-audio`)
- [ ] Storage policies configured
- [ ] Authentication providers configured (if using OAuth)
- [ ] Redirect URLs ready to update after deployment

## Testing

- [ ] App runs locally without errors
- [ ] Authentication works (sign in/sign up)
- [ ] File save/load works
- [ ] All features tested
- [ ] No TypeScript errors (`npm run build`)

## Deployment Platform Setup

- [ ] Account created on hosting platform (Vercel/Netlify/etc.)
- [ ] Platform connected to your Git repository
- [ ] Environment variables added to platform
- [ ] Build settings configured

## Post-Deployment

- [ ] App loads at production URL
- [ ] Supabase redirect URLs updated with production domain
- [ ] Authentication tested on production
- [ ] Cloud storage tested on production
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS working (should be automatic)

## Quick Test Commands

```bash
# Test build locally
npm run build

# Test preview of production build
npm run preview

# Check for TypeScript errors
npx tsc --noEmit

# Check for linting errors
npm run lint
```

## Common Issues

### Build Fails
- Check Node.js version (should match platform)
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors

### Environment Variables Not Working
- Verify they start with `VITE_`
- Check they're set in platform dashboard
- Redeploy after adding variables

### 404 on Refresh
- Check redirect rules are configured
- Verify SPA routing is set up

### Authentication Not Working
- Update Supabase redirect URLs
- Check environment variables
- Verify OAuth providers have correct redirects

## Ready to Deploy?

Once all items are checked, you're ready! Follow the steps in `DEPLOYMENT.md`.

