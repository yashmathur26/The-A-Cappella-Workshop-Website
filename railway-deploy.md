# Railway Deployment – Custom Domain (apex + www)

If your site is hosted on **Railway** (full app or backend), use this so both **theacappellaworkshop.com** and **www.theacappellaworkshop.com** work and the search result link doesn’t break.

## 1. Add both domains in Railway

1. Open your **Railway** project → select the service (your app).
2. Go to **Settings** → **Public Networking** (or **Networking**).
3. Under **Custom Domain**, click **+ Custom Domain**.
4. Add **theacappellaworkshop.com** (apex, no www).
5. Add **www.theacappellaworkshop.com**.
6. Railway will show a **CNAME target** for each (e.g. `xxxx.up.railway.app`). You’ll use this in DNS.

## 2. DNS so the apex works (recommended: Cloudflare)

Railway uses **CNAME** records. The apex (root) domain normally can’t be a CNAME; **Cloudflare** supports “CNAME flattening” so the apex can point to Railway.

### If your DNS is on Cloudflare

1. **Cloudflare Dashboard** → your domain → **DNS** → **Records**.
2. **www (subdomain):**
   - Type: **CNAME**
   - Name: `www`
   - Target: Railway’s CNAME (e.g. `xxxx.up.railway.app`)
   - Proxy: **Proxied** (orange) is fine
3. **Apex (root):**
   - Type: **CNAME**
   - Name: `@` (or `theacappellaworkshop.com` depending on UI)
   - Target: **same** Railway CNAME (e.g. `xxxx.up.railway.app`)
   - Proxy: **Proxied**
   - Cloudflare will flatten this so the apex still works.
4. Remove any **A** record at the apex that points somewhere else, or Railway’s CNAME won’t apply.

### If your DNS is not on Cloudflare

- **Option A:** Move nameservers to Cloudflare (add the site in Cloudflare, then set your registrar’s nameservers to Cloudflare’s). Then use the steps above.
- **Option B:** Some registrars support “ALIAS”/“ANAME” at the root; point that to Railway’s hostname if your provider documents it.
- **Option C:** Use only **www** in Railway and in DNS (CNAME `www` → Railway). Then add a **redirect** from the apex to `https://www.theacappellaworkshop.com` at your DNS/registrar if they offer “forwarding” or “redirect”.

## 3. SSL

Railway issues certificates for your custom domains. After DNS is correct, wait a few minutes; HTTPS should turn on automatically. If it doesn’t, check **Settings → Domains** in Railway for errors.

## 4. Optional: redirect www → apex (or vice versa)

If you want one canonical URL:

- **In Cloudflare:** **Rules** → **Redirect Rules** → Create rule: when hostname is `www.theacappellaworkshop.com`, redirect to `https://theacappellaworkshop.com/${uri.path}` (301).
- Or the other way: apex → www.

## Summary for “the link doesn’t work”

- Search links to **https://theacappellaworkshop.com** (no www).
- In Railway, add **theacappellaworkshop.com** and **www.theacappellaworkshop.com** as custom domains.
- In DNS (ideally Cloudflare), point **both** the apex and **www** to Railway’s CNAME target.
- After DNS propagates, the search result link should open your site.
