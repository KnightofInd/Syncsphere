'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

type Role = 'tracker' | 'tracked';
interface SessionSetupProps { onJoin: (sessionId: string, role: Role) => void; }

export default function SessionSetup({ onJoin }: SessionSetupProps) {
  const [sessionId, setSessionId] = useState('');
  const [role, setRole]           = useState<Role>('tracker');
  const [error, setError]         = useState('');

  function createNew() {
    setSessionId(uuidv4().slice(0, 12).toUpperCase());
    setError('');
  }

  function handleJoin() {
    const trimmed = sessionId.trim();
    if (!trimmed)          { setError('Session ID cannot be empty.'); return; }
    if (trimmed.length < 4){ setError('Session ID must be at least 4 characters.'); return; }
    setError('');
    onJoin(trimmed, role);
  }

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden bg-[#101d22]">

      {/* ── Ambient blobs ── */}
      <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full pointer-events-none"
        style={{ background: 'rgba(19,182,236,0.08)', filter: 'blur(120px)' }} />
      <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full pointer-events-none"
        style={{ background: 'rgba(15,76,97,0.18)', filter: 'blur(100px)' }} />

      {/* ── Top nav ── */}
      <header className="relative z-10 shrink-0 border-b border-[#233f48]"
        style={{ background: 'rgba(16,29,34,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#13b6ec,#2563eb)', color: '#101d22' }}>
              <span className="ms text-[18px]">share_location</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">SyncSphere</h1>
          </div>
          <nav className="hidden md:flex gap-1">
            {['Documentation', 'Support'].map(l => (
              <button key={l}
                className="h-9 px-4 rounded-lg text-slate-300 text-sm font-medium transition-colors hover:bg-[#233f48] hover:text-white">
                {l}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Card ── */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-[480px] flex flex-col gap-5">

          {/* Glass card */}
          <div className="flex flex-col gap-7 rounded-2xl p-8 md:p-10 border border-[#233f48] shadow-2xl"
            style={{ background: 'rgba(24,40,47,0.65)', backdropFilter: 'blur(24px)' }}>

            {/* Title */}
            <div className="text-center space-y-1.5">
              <h2 className="text-3xl font-bold text-white tracking-tight">Join Session</h2>
              <p className="text-slate-400 text-sm">Enter your session details to begin synchronization</p>
            </div>

            {/* Role picker */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Select Role</p>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#101d22] border border-[#233f48]">
                {([
                  { value: 'tracker' as Role, icon: 'radar',       label: 'Tracker' },
                  { value: 'tracked' as Role, icon: 'location_on', label: 'Tracked' },
                ]).map(({ value, icon, label }) => (
                  <button key={value} onClick={() => setRole(value)}
                    className="flex flex-col items-center justify-center py-3 rounded-lg transition-all duration-200 gap-0.5"
                    style={role === value ? { background: '#233f48', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' } : {}}>
                    <span className="ms text-[22px] transition-colors"
                      style={{ color: role === value ? '#13b6ec' : '#64748b' }}>{icon}</span>
                    <span className="text-sm font-medium transition-colors"
                      style={{ color: role === value ? '#f1f5f9' : '#64748b' }}>{label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 ml-1">
                {role === 'tracker'
                  ? 'Your map movements will be broadcast to all Tracked participants.'
                  : "Your map will automatically mirror the Tracker's movements."}
              </p>
            </div>

            {/* Session ID */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Session ID</p>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="ms text-[20px] text-slate-500">key</span>
                </div>
                <input
                  type="text"
                  value={sessionId}
                  onChange={e => { setSessionId(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder="e.g. 849-221-XY"
                  spellCheck={false}
                  className="block w-full rounded-xl pl-10 pr-4 py-3.5 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600"
                  style={{
                    background: '#101d22',
                    border: error ? '1px solid #f87171' : '1px solid #233f48',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.border = error ? '1px solid #f87171' : '1px solid #13b6ec';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19,182,236,0.12),inset 0 2px 4px rgba(0,0,0,0.2)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.border = error ? '1px solid #f87171' : '1px solid #233f48';
                    e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
                  }}
                />
              </div>
              {error && (
                <p className="text-xs text-red-400 flex items-center gap-1 ml-1">
                  <span className="ms text-[14px]">error</span>{error}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button onClick={handleJoin}
                className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-base h-12 px-6 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
                style={{
                  background: '#13b6ec', color: '#101d22',
                  boxShadow: '0 0 20px rgba(19,182,236,0.3)',
                }}>
                <span>Join Session</span>
                <span className="ms text-[20px]">arrow_forward</span>
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#233f48]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-slate-500 bg-[#18282f]">or</span>
                </div>
              </div>

              <button onClick={createNew}
                className="w-full flex items-center justify-center gap-2 rounded-xl text-slate-200 text-sm font-semibold h-10 px-6 border border-[#233f48] transition-all hover:bg-[#233f48] hover:text-white"
                style={{ background: 'rgba(35,63,72,0.5)' }}>
                <span className="ms text-[20px]">add_circle</span>
                <span>Create New Session</span>
              </button>
            </div>
          </div>

          {/* Footer badges */}
          <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="ms text-[14px] text-emerald-400">encrypted</span>
              End-to-end Encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="ms text-[14px] text-[#13b6ec]">speed</span>
              Low Latency Mode
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
