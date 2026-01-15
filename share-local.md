# Share Your Local Server

Quick guide to share your local development server with others temporarily.

## Option 1: Using Cloudflare Tunnel (Recommended - Free & Reliable)

1. **Install cloudflared** (if not already installed):
   ```bash
   brew install cloudflared
   ```
   Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

2. **Start your development server:**
   ```bash
   npm run dev
   ```
   Your server will run on `http://localhost:5000` (or whatever PORT you set)

3. **In a new terminal, create the tunnel:**
   ```bash
   npm run share
   ```
   Or directly:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```
   
   This will give you a URL like: `https://random-name.trycloudflare.com`
   
   **Share this URL with others!** They can access your local server through this link.

4. **To stop sharing:** Just press `Ctrl+C` in the cloudflared terminal.

## Option 2: Using localtunnel (Alternative)

1. **Install cloudflared:**
   ```bash
   brew install cloudflared
   ```
   (Or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)

2. **Start your dev server:**
   ```bash
   npm run dev
   ```

3. **Create the tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```
   
   This will give you a URL like: `https://random-name.trycloudflare.com`

## Option 3: Using ngrok (Requires Free Account)

1. **Sign up at https://ngrok.com** (free account works)

2. **Install ngrok:**
   ```bash
   brew install ngrok
   ```
   Or download from https://ngrok.com/download

3. **Start your dev server:**
   ```bash
   npm run dev
   ```

4. **Create tunnel:**
   ```bash
   ngrok http 5000
   ```
   
   You'll get a URL like: `https://abc123.ngrok.io`

## Quick Script

I've created a helper script using Cloudflare Tunnel. After starting your dev server, run:

```bash
npm run share
```

This will automatically create a Cloudflare tunnel to port 5000. Make sure you have `cloudflared` installed first (see Option 1 above).

## Important Notes

- ⚠️ **The tunnel only works while your dev server is running**
- ⚠️ **The URL changes each time** (unless you use ngrok with a paid plan)
- ⚠️ **Anyone with the URL can access your site** - only share with trusted people
- ⚠️ **Stop the tunnel when done** to prevent unauthorized access
