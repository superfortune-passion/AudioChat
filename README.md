# JamLink

Anonymous, audio-only random matching for musicians. Built on WebRTC + Socket.IO signaling.

## Features

- **Audio-only** — no video, mic-only WebRTC sessions
- **Anonymous random matching** — pair with any available musician
- **Interest-based matching** — match by shared instruments, genres, and styles
- **Mute / unmute** — toggle your mic during a jam
- **Skip & instant rematch** — leave a session and find someone new immediately
- **Microphone permission handling** — clear errors for denied/missing mics
- **Production-safe cleanup** — peer connections, sockets, and tracks cleaned up on leave/disconnect
- **STUN/TURN config** — env-based ICE servers for production NAT traversal

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Socket.IO client
- **Backend:** Node.js, Express, Socket.IO (signaling only — media is P2P)

## Local Development

### 1. Clone and install

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

Copy `.env.example` and set values:

```bash
cp .env.example client/.env.local   # VITE_SOCKET_URL=http://localhost:3000
```

Server uses `PORT` and `CLIENT_ORIGIN` (defaults: 3000, `*`).

### 3. Start the server

```bash
cd server
npm run dev
```

### 4. Start the client

```bash
cd client
npm run dev
```

Open `http://localhost:5173` in two browser tabs to test matching.

## Deploy for internet users (anyone worldwide)

Local/LAN only works on the same Wi‑Fi. For **anyone on the internet** to audio chat, deploy both parts publicly:

```
User A (browser)  ←—— WebRTC audio ——→  User B (browser)
       ↓                                      ↓
       └———— https://your-app.vercel.app ————┘
                         ↓
              https://your-server.onrender.com
                   (matchmaking only)
```

### Step 1 — Push code to GitHub

```bash
git init
git add .
git commit -m "JamLink audio platform"
git remote add origin https://github.com/YOUR_USER/jamlink.git
git push -u origin main
```

### Step 2 — Deploy backend (Render)

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo
3. **Root Directory:** `server`
4. **Build command:** `npm install && npm run build`
5. **Start command:** `npm start`
6. **Environment variables:**
   - `CLIENT_ORIGIN` = `https://YOUR-APP.vercel.app` (set after Step 3, then redeploy)
7. Deploy and copy your URL, e.g. `https://jamlink-server.onrender.com`

Verify: open `https://jamlink-server.onrender.com/health` → should show `{"status":"ok"}`

### Step 3 — Deploy frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **Import Project**
2. **Root Directory:** `client`
3. **Environment variables** (required for internet users):

| Variable | Value |
|----------|-------|
| `VITE_SOCKET_URL` | `https://jamlink-server.onrender.com` (your Render URL) |
| `VITE_STUN_URL` | `stun:stun.l.google.com:19302` |
| `VITE_TURN_URL` | your TURN server URL (see Step 4) |
| `VITE_TURN_USERNAME` | TURN username |
| `VITE_TURN_CREDENTIAL` | TURN password |

4. Deploy and copy your URL, e.g. `https://jamlink.vercel.app`

### Step 4 — Add TURN server (required for reliable internet audio)

STUN alone fails for many users behind routers/NAT. You need TURN so audio relays when direct P2P can't connect.

**Free option — [Metered.ca](https://www.metered.ca/tools/openrelay/):**
1. Sign up for free TURN credentials
2. Add to Vercel env vars:
   - `VITE_TURN_URL` = `turn:a.relay.metered.ca:80`
   - `VITE_TURN_USERNAME` = (from Metered dashboard)
   - `VITE_TURN_CREDENTIAL` = (from Metered dashboard)
3. **Redeploy** Vercel after adding env vars

### Step 5 — Link frontend ↔ backend

1. In Render, set `CLIENT_ORIGIN` to your exact Vercel URL (e.g. `https://jamlink.vercel.app`)
2. Redeploy Render

### Step 6 — Share and test

Share your Vercel URL. Two people anywhere in the world can:
1. Open the link
2. Allow microphone
3. Click **Start Jamming**
4. Get matched and audio chat

**Notes:**
- HTTPS is required for mic access on non-localhost (Vercel/Render provide this)
- Render free tier sleeps after inactivity — first visit may take ~30s to wake up
- Without TURN, some user pairs will connect but **no audio** — always configure TURN for production

## Deploy (reference)

### Frontend → Vercel

1. Import the repo in [Vercel](https://vercel.com)
2. Set **Root Directory** to `client`
3. Add environment variables:
   - `VITE_SOCKET_URL` → your Render server URL (e.g. `https://jamlink-server.onrender.com`)
   - `VITE_STUN_URL` → `stun:stun.l.google.com:19302`
   - `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` (recommended for production)
4. Deploy

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect the repo; set **Root Directory** to `server`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Set environment variables:
   - `CLIENT_ORIGIN` → your Vercel frontend URL (e.g. `https://jamlink.vercel.app`)
   - `PORT` → `3000` (Render sets this automatically)
6. Deploy

Alternatively, use the included `render.yaml` blueprint.

### TURN Server

STUN alone is not enough for all network conditions. For reliable production audio, provision a TURN server (e.g. [Metered.ca](https://www.metered.ca/), [Twilio STUN/TURN](https://www.twilio.com/docs/stun-turn)) and set the `VITE_TURN_*` variables in Vercel.

## Architecture

```
Client A ←—— WebRTC audio (P2P) ——→ Client B
    ↓                                    ↓
    └———— Socket.IO signaling ——————————┘
                      ↓
               JamLink Server
         (matchmaking + SDP/ICE relay)
```

Each client uses two `RTCPeerConnection`s (send + receive) with the original signaling pattern preserved and WebRTC bugs fixed: proper SDP handling, `ontrack` for remote audio, ICE candidate serialization, and full cleanup on disconnect.

## License

ISC
