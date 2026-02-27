/**
 * lib/socket.ts
 *
 * Singleton Socket.io client factory.
 * The socket is created lazily on first call to `getSocket()` and reused
 * for the lifetime of the browser session.  Call `disconnectSocket()` to
 * tear it down (e.g. when the user leaves a session).
 */

import { io, Socket } from 'socket.io-client';

// Configurable via .env.local (Vercel env) or falls back to local dev server
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

/**
 * Returns the shared socket instance.  Creates it if it doesn't exist yet.
 * The socket is NOT connected on creation — call `socket.connect()` explicitly
 * so callers control when the connection is established.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,       // We connect manually after joining a session
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    if (process.env.NODE_ENV === 'development') {
      socket.on('connect', () =>
        console.log(`[SyncSphere] Socket connected: ${socket?.id}`)
      );
      socket.on('disconnect', (reason) =>
        console.log(`[SyncSphere] Socket disconnected: ${reason}`)
      );
    }
  }
  return socket;
}

/**
 * Disconnects the socket and destroys the singleton so the next call to
 * `getSocket()` creates a fresh instance.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
