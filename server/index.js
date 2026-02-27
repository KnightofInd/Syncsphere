const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const PORT = process.env.PORT || 4000;
// Accept comma-separated origins, e.g. "https://syncsphere.vercel.app,http://localhost:3000"
const rawOrigins = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

// ── Express ────────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── HTTP + Socket.io ───────────────────────────────────────────────────────
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
  // Prefer WebSocket, fall back to polling (needed for Render free tier cold starts)
  transports: ['websocket', 'polling'],
});

// In-memory session registry: sessionId → Set<socketId>
const sessions = new Map();

function getSessionSize(sessionId) {
  return sessions.get(sessionId)?.size ?? 0;
}

function joinSession(socket, sessionId) {
  socket.join(sessionId);
  if (!sessions.has(sessionId)) sessions.set(sessionId, new Set());
  sessions.get(sessionId).add(socket.id);
  console.log(
    `[session:join] ${socket.id} → "${sessionId}" (${getSessionSize(sessionId)} peer(s))`
  );
}

function leaveSession(socket, sessionId) {
  socket.leave(sessionId);
  if (sessions.has(sessionId)) {
    sessions.get(sessionId).delete(socket.id);
    if (sessions.get(sessionId).size === 0) sessions.delete(sessionId);
  }
}

// ── Socket events ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] connected  ${socket.id}`);
  let currentSession = null;

  // Client requests to join a session room
  socket.on('join-session', (sessionId) => {
    if (!sessionId || typeof sessionId !== 'string') return;
    // Leave previous session if any
    if (currentSession) leaveSession(socket, currentSession);
    currentSession = sessionId;
    joinSession(socket, sessionId);
    // Ack back so the client knows it has entered the room
    socket.emit('session-joined', { sessionId, peers: getSessionSize(sessionId) });
  });

  // Tracker sends map position → forward to everyone else in the room
  socket.on('map-update', (payload) => {
    const { sessionId, lat, lng, zoom } = payload ?? {};
    if (
      !sessionId ||
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      typeof zoom !== 'number'
    ) {
      return; // Drop invalid payloads — basic security guard
    }
    socket.to(sessionId).emit('map-update', { lat, lng, zoom });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[-] disconnected ${socket.id} — ${reason}`);
    if (currentSession) leaveSession(socket, currentSession);
  });
});

// ── Start ──────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[SyncSphere Server] Listening on port ${PORT}`);
  console.log(`[SyncSphere Server] Allowed origins: ${allowedOrigins.join(', ')}`);
});
