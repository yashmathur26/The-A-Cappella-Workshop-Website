# Cloudflare Pages Deployment Guide

This guide will help you deploy your AquaWave website to Cloudflare Pages so you can share it with others.

## Prerequisites

1. A Cloudflare account (free tier works fine)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### Option 1: Deploy via Cloudflare Dashboard (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
   - If you haven't already, create a repository and push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Go to Cloudflare Dashboard**
   - Visit https://dash.cloudflare.com
   - Log in to your account

3. **Create a new Pages project**
   - Click on "Workers & Pages" in the sidebar
   - Click "Create application"
   - Select "Pages" → "Connect to Git"
   - Authorize Cloudflare to access your Git provider
   - Select your repository

4. **Configure build settings**
   - **Framework preset**: None (or Vite if available)
   - **Build command**: `npm run build:frontend`
   - **Build output directory**: `dist/public`
   - **Root directory**: `/` (leave as default)

5. **Set environment variables** (if needed)
   - In the project settings, go to "Environment variables"
   - Add any required environment variables (like API keys, database URLs, etc.)
   - Note: Your backend API will need to be hosted separately (see Backend Deployment below)

6. **Deploy**
   - Click "Save and Deploy"
   - Cloudflare will build and deploy your site
   - You'll get a URL like: `https://your-project.pages.dev`

### Option 2: Deploy via Wrangler CLI

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Deploy**
   ```bash
   npm run build:frontend
   wrangler pages deploy dist/public
   ```

## Important Notes

### Backend API Deployment

Your Express backend server needs to be hosted separately since Cloudflare Pages is for static sites. Here are your options:

1. **Keep backend on current hosting** (if you have one)
   - Update your frontend API calls to point to your backend URL
   - Make sure CORS is configured on your backend

2. **Deploy backend to Cloudflare Workers** (requires code adaptation)
   - This would require rewriting your Express routes to Cloudflare Workers format

3. **Use another hosting service for backend**
   - Services like Railway, Render, Fly.io, or Heroku can host your Express backend
   - Update your frontend to use the backend URL

### Updating API Endpoints

If your backend is hosted separately, you'll need to configure the API base URL:

1. **In Cloudflare Pages Dashboard:**
   - Go to your project → Settings → Environment variables
   - Add a new variable:
     - **Variable name**: `VITE_API_BASE_URL`
     - **Value**: Your backend URL (e.g., `https://your-backend.railway.app` or `https://api.yourdomain.com`)
   - Make sure to add it to both "Production" and "Preview" environments

2. **The frontend is already configured** to use `VITE_API_BASE_URL` if set, otherwise it will use relative URLs (same origin)

3. **Important**: Make sure your backend has CORS configured to allow requests from your Cloudflare Pages domain

### Custom Domain and fixing “the link doesn’t work” (no www)

Search results often show **https://theacappellaworkshop.com** (no www). If that URL doesn’t load but **https://www.theacappellaworkshop.com** does, the apex domain isn’t connected. Do this so both work:

1. **Add both domains in Cloudflare Pages**
   - In your Pages project go to **Settings → Custom domains**
   - Add **theacappellaworkshop.com** (apex/root)
   - Add **www.theacappellaworkshop.com**
   - Use the DNS instructions Cloudflare shows for each

2. **DNS (if the domain is on Cloudflare)**
   - **DNS → Records**
   - For the apex: either a **CNAME** to your Pages hostname (e.g. `your-project.pages.dev`) with **Proxy** on, or the **A** record Cloudflare suggests for Pages
   - For **www**: **CNAME** to `your-project.pages.dev` (or the hostname Pages gives you)

3. **Optional: redirect www → non‑www**
   - **Rules → Redirect Rules → Create rule**
   - Name: e.g. “WWW to apex”
   - When: **Hostname** equals `www.theacappellaworkshop.com`
   - Then: **Dynamic redirect** to `https://theacappellaworkshop.com/${uri.path}` with status **301**
   - Save and deploy

After this, **https://theacappellaworkshop.com** (the link from search) should load the site.

### Custom Domain (summary)

1. In your Cloudflare Pages project, go to **Custom domains**
2. Add both **theacappellaworkshop.com** and **www.theacappellaworkshop.com**
3. Apply the DNS records Cloudflare shows for your project

## Troubleshooting

- **Build fails**: Check the build logs in Cloudflare dashboard
- **Routes not working**: Ensure `_redirects` file is in `dist/public` after build
- **API calls failing**: Check CORS settings on your backend and verify API URL is correct
- **Search result link (theacappellaworkshop.com) doesn’t work**: The apex domain isn’t set. Add **theacappellaworkshop.com** in Pages Custom domains and fix DNS (see “Custom Domain and fixing the link” above).

## Quick Deploy Command

After initial setup, you can quickly redeploy with:
```bash
npm run build:frontend && wrangler pages deploy dist/public
```

Your site will be live at: `https://your-project.pages.dev`

## Summary

✅ **What's been set up:**
- `wrangler.toml` - Cloudflare Pages configuration
- `client/public/_redirects` - SPA routing support
- Updated API request utility to support separate backend URL via `VITE_API_BASE_URL`
- `build:frontend` script for frontend-only builds

📝 **Next steps:**
1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repo to Cloudflare Pages
3. Set `VITE_API_BASE_URL` environment variable if backend is hosted separately
4. Deploy and share your link!
