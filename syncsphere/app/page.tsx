'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socket';
import SessionSetup from '@/components/SessionSetup';
import HUD, { type ConnectionStatus } from '@/components/HUD';
import type { Socket } from 'socket.io-client';
import type { MapComponentProps } from '@/components/MapComponent';

const MapComponent = dynamic<MapComponentProps>(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full" style={{ background: '#101d22' }}>
      <svg className="animate-spin h-8 w-8" style={{ color: '#13b6ec' }} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  ),
});

type Role = 'tracker' | 'tracked';
interface MapState { lat: number; lng: number; zoom: number; }

export default function Home() {
  const [sessionId, setSessionId]     = useState<string | null>(null);
  const [role, setRole]               = useState<Role>('tracker');
  const [connStatus, setConnStatus]   = useState<ConnectionStatus>('disconnected');
  const [socketReady, setSocketReady] = useState(false);
  const [connError, setConnError]     = useState(false);
  const [mapState, setMapState]       = useState<MapState>({ lat: 20, lng: 0, zoom: 2 });
  const socketRef  = useRef<Socket | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleJoin = useCallback((sid: string, r: Role) => {
    setRole(r);
    setConnError(false);
    setSessionId(sid);
  }, []);

  const handleLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    disconnectSocket();
    socketRef.current = null;
    setSocketReady(false);
    setConnStatus('disconnected');
    setConnError(false);
    setSessionId(null);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const socket = getSocket();
    socketRef.current = socket;

    // 8s timeout — show error if backend never responds
    timeoutRef.current = setTimeout(() => {
      if (!socketRef.current?.connected) {
        setConnError(true);
        setConnStatus('disconnected');
      }
    }, 8000);

    const onConnect = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setConnStatus('connected');
      setConnError(false);
      socket.emit('join-session', sessionId);
      setSocketReady(true);
    };
    const onDisconnect = () => { setConnStatus('disconnected'); setSocketReady(false); };
    const onConnectError = () => setConnStatus('reconnecting');
    const onReconnectAttempt = () => setConnStatus('reconnecting');
    const onReconnect = () => {
      setConnStatus('connected');
      setConnError(false);
      socket.emit('join-session', sessionId);
      setSocketReady(true);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);
    socket.connect();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
      disconnectSocket();
      socketRef.current = null;
      setSocketReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleMapMove = useCallback((lat: number, lng: number, zoom: number) => {
    setMapState({ lat, lng, zoom });
  }, []);

  if (!sessionId) {
    return (
      <main className="flex flex-col w-screen h-screen overflow-hidden" style={{ background: '#101d22' }}>
        <SessionSetup onJoin={handleJoin} />
      </main>
    );
  }

  const isConnected    = connStatus === 'connected';
  const isReconnecting = connStatus === 'reconnecting';
  const statusDotColor = isConnected ? '#13b6ec' : isReconnecting ? '#fbbf24' : '#f87171';
  const statusText     = isConnected ? 'Live' : isReconnecting ? 'Reconnecting' : 'Offline';

  return (
    <main className="flex flex-col w-screen h-screen overflow-hidden" style={{ background: '#101d22' }}>
      {/* Top nav */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0 gap-4"
        style={{
          background: 'rgba(16,29,34,0.90)',
          borderBottom: '1px solid #233f48',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="ms text-xl" style={{ color: '#13b6ec' }}>share_location</span>
          <span className="text-sm font-bold tracking-widest uppercase" style={{ color: '#e2eef2' }}>
            SyncSphere
          </span>
        </div>

        {/* Session ID */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(19,182,236,0.08)', border: '1px solid #233f48' }}
        >
          <span className="ms text-sm" style={{ color: '#13b6ec' }}>tag</span>
          <span className="font-mono text-xs" style={{ color: '#8fadb8' }}>Session&nbsp;</span>
          <span className="font-mono text-xs font-semibold" style={{ color: '#e2eef2' }}>{sessionId}</span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {/* Role badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: role === 'tracker' ? 'rgba(19,182,236,0.12)' : 'rgba(168,85,247,0.12)',
              border: `1px solid ${role === 'tracker' ? 'rgba(19,182,236,0.25)' : 'rgba(168,85,247,0.25)'}`,
              color: role === 'tracker' ? '#13b6ec' : '#c084fc',
            }}
          >
            <span className="ms text-sm">{role === 'tracker' ? 'radar' : 'location_on'}</span>
            {role === 'tracker' ? 'Broadcasting' : 'Syncing'}
          </div>

          {/* Status dot */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: statusDotColor,
                boxShadow: isConnected ? `0 0 6px ${statusDotColor}` : undefined,
              }}
            />
            <span className="text-xs font-medium" style={{ color: statusDotColor }}>{statusText}</span>
          </div>

          {/* Leave */}
          <button
            onClick={handleLeave}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{ color: '#8fadb8', border: '1px solid #233f48' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(248,113,113,0.4)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8fadb8'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#233f48'; }}
          >
            <span className="ms text-sm">logout</span>
            Leave
          </button>
        </div>
      </header>

      {/* Map area */}
      <div className="flex-1 w-full relative overflow-hidden">
        {socketReady && socketRef.current ? (
          <MapComponent
            socket={socketRef.current}
            sessionId={sessionId}
            role={role}
            onMapMove={handleMapMove}
          />
        ) : connError ? (
          <div
            className="flex flex-col items-center justify-center w-full h-full gap-5"
            style={{ background: '#101d22' }}
          >
            <div
              className="flex flex-col items-center gap-4 p-8 rounded-2xl"
              style={{
                background: 'rgba(24,40,47,0.65)',
                border: '1px solid #233f48',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                maxWidth: 360,
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)' }}
              >
                <span className="ms text-2xl" style={{ color: '#f87171' }}>wifi_off</span>
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm mb-1" style={{ color: '#e2eef2' }}>Cannot reach the server</p>
                <p className="text-xs" style={{ color: '#8fadb8' }}>
                  Make sure the backend is running on{' '}
                  <span className="font-mono" style={{ color: '#13b6ec' }}>localhost:4000</span>
                </p>
              </div>
              <button
                onClick={handleLeave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all w-full justify-center"
                style={{
                  background: 'rgba(19,182,236,0.12)',
                  border: '1px solid rgba(19,182,236,0.3)',
                  color: '#13b6ec',
                }}
              >
                <span className="ms text-sm">arrow_back</span>
                Back to Setup
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center w-full h-full gap-3"
            style={{ background: '#101d22' }}
          >
            <svg className="animate-spin h-9 w-9" style={{ color: '#13b6ec' }} viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-xs font-medium" style={{ color: '#8fadb8' }}>Connecting to session…</p>
            <p className="font-mono text-xs" style={{ color: '#4a6572' }}>{sessionId}</p>
          </div>
        )}

        <HUD
          lat={mapState.lat}
          lng={mapState.lng}
          zoom={mapState.zoom}
          connectionStatus={connStatus}
          role={role}
        />
      </div>
    </main>
  );
}

