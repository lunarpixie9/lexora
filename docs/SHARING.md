# Letting someone else try Lexora

Lexora runs on your machine. With Whisper and the phoneme layer loaded the
backend sits at roughly 0.9 GB of RAM (measured: 873 MB idle after both models
load) and rises while it analyses a recording, which takes a few seconds of CPU.
No free hosting tier will run that, so sharing means letting someone reach the
copy running on your laptop, while your laptop is on.

Both routes below serve the **dev server**, which is fine for a demo. Nothing here
is a production deployment.

---

## 1. Same room, same Wi-Fi — the reliable one

Best for the project demo, a classmate sitting next to you, or testing on your phone.

Two terminals, from the repo root:

```bash
# terminal 1 — backend (stays on localhost; the frontend proxies to it)
cd backend
python -m uvicorn app.main:app --port 8000

# terminal 2 — frontend, exposed to the local network
cd frontend
npm run dev:lan
```

Vite prints a **Network:** line. Anyone on the same Wi-Fi opens that address, e.g.

```
http://10.250.165.5:5173
```

(Your address changes between networks — always read it off the Network line.)

The first time, Windows Firewall asks whether to allow Node.js on **private**
networks. Say yes; leave "public networks" unticked.

This does not work if the two devices are on different networks, or if the Wi-Fi
has client isolation on (common on guest and campus networks).

---

## 2. Anywhere in the world — a temporary public link

For a friend who is not on your Wi-Fi. This puts a public URL in front of your
laptop, so only start it when you want it and stop it when you are done.

Install once:

```powershell
winget install --id Cloudflare.cloudflared
```

Then, with both servers already running (backend on 8000, frontend on 5173):

```bash
cloudflared tunnel --url http://localhost:5173
```

It prints a URL like `https://something-random-words.trycloudflare.com`. Send
that to your friend.

Things to know:

- **The URL changes every time you restart the tunnel.** Quick tunnels are
  throwaway; there is no way to keep the same address without a Cloudflare account
  and a domain.
- **It dies when you close the terminal or sleep the laptop.** Your friend gets an
  error page; restart the tunnel and send the new link.
- The repo already allows `*.trycloudflare.com` in `frontend/vite.config.ts`
  (`server.allowedHosts`), which is why the page loads instead of showing a Vite
  "host not allowed" error.
- While the tunnel is up, anyone with the link can reach your app — and the demo
  logins are printed on the sign-in page. Use it for a short test, then Ctrl-C.

---

## What your friend should do

1. Open the link.
2. Click **Try the demo**, then one of the demo accounts on the sign-in page —
   teacher, parent or child. No password needed.
3. As the **teacher**: open Asha for a finished report, or start a new screening
   and use **Fill with demo answers** if they have no microphone.
4. As the **child**: Practice, then an activity. The read-aloud activity needs
   microphone permission; everything else works without one.

All the demo children and their results are generated content and are labelled
**Demo data** throughout.

---

## Why there is no permanent lexora.example.com

The frontend is a static bundle and would host anywhere. The backend is the
problem:

| Requirement | Free tier reality |
|---|---|
| ~0.9 GB RAM resident for the speech models, more under load | Most free tiers cap at 512 MB |
| Several CPU-seconds per recording | Free tiers throttle or sleep |
| MySQL | Available, but only the smallest instances |

A paid small VM (2 GB RAM is enough) would run it as-is: same two commands, plus a
reverse proxy and a real `SECRET_KEY`. That is out of scope for the project
submission, which is why the demo is run locally.
