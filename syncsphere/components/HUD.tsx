'use client';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface HUDProps {
  lat: number;
  lng: number;
  zoom: number;
  connectionStatus: ConnectionStatus;
  role: 'tracker' | 'tracked';
}

export default function HUD({ lat, lng, zoom, connectionStatus, role }: HUDProps) {
  const isConnected    = connectionStatus === 'connected';
  const isReconnecting = connectionStatus === 'reconnecting';

  const statusColor  = isConnected ? '#13b6ec' : isReconnecting ? '#fbbf24' : '#f87171';
  const statusLabel  = isConnected ? 'Connected' : isReconnecting ? 'Reconnecting…' : 'Disconnected';
  const roleIcon     = role === 'tracker' ? 'radar'       : 'location_on';
  const roleLabel    = role === 'tracker' ? 'Broadcasting' : 'Syncing';
  const roleBg       = role === 'tracker' ? 'rgba(19,182,236,0.12)' : 'rgba(168,85,247,0.12)';
  const roleColor    = role === 'tracker' ? '#13b6ec'    : '#c084fc';

  return (
    <div
      className="absolute bottom-5 right-5 z-[1000] flex flex-col gap-3 select-none"
      style={{ minWidth: 200 }}
    >
      {/* Main data card */}
      <div
        className="rounded-2xl border p-4 shadow-2xl backdrop-blur-xl"
        style={{
          background: 'rgba(24,40,47,0.80)',
          borderColor: '#233f48',
        }}
      >
        {/* Role row */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#233f48]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: roleBg }}>
              <span className="ms text-[16px]" style={{ color: roleColor }}>{roleIcon}</span>
            </div>
            <span className="text-sm font-semibold text-slate-200">{roleLabel}</span>
          </div>
          {/* Connection dot */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: statusColor,
                boxShadow: isConnected ? `0 0 6px ${statusColor}` : undefined,
                animation: isReconnecting ? 'pulse 1s infinite' : isConnected ? undefined : undefined,
              }}
            />
            <span className="text-[11px] font-medium" style={{ color: statusColor }}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Coordinates */}
        <div className="space-y-2 font-mono text-xs">
          <DataRow icon="explore" label="Lat" value={lat.toFixed(5)} />
          <DataRow icon="explore"  label="Lng" value={lng.toFixed(5)} />
          <DataRow icon="zoom_in"  label="Zoom" value={String(zoom)} />
        </div>
      </div>
    </div>
  );
}

function DataRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 text-slate-500">
        <span className="ms text-[14px]">{icon}</span>
        <span>{label}</span>
      </div>
      <span className="text-slate-200 tabular-nums">{value}</span>
    </div>
  );
}
