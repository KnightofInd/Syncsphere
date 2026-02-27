'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Socket } from 'socket.io-client';

// Fix Leaflet default icon paths broken by webpack asset hashing
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Role-coloured dot markers
function makeRoleIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.5);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}
const TRACKER_ICON = makeRoleIcon('#3b82f6');
const TRACKED_ICON = makeRoleIcon('#a855f7');

const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 2;
const GEOLOCATE_ZOOM = 14;
const THROTTLE_MS = 150;

export interface MapSyncPayload { lat: number; lng: number; zoom: number; }

export interface MapComponentProps {
  socket: Socket;
  sessionId: string;
  role: 'tracker' | 'tracked';
  onMapMove?: (lat: number, lng: number, zoom: number) => void;
}

// Force map to recalculate its size on mount
function ResizeHandler() {
  const map = useMap();
  useEffect(() => { map.invalidateSize(); }, [map]);
  return null;
}

// Get GPS location (Tracker only) and fly there; report initial coords to HUD
function GeolocationHandler({
  role, socket, sessionId, onMapMove, onLocated,
}: MapComponentProps & { onLocated: (pos: [number, number]) => void }) {
  const map = useMap();

  useEffect(() => {
    // Report initial map center to HUD immediately on mount
    const { lat, lng } = map.getCenter();
    onMapMove?.(lat, lng, map.getZoom());

    if (role !== 'tracker' || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        map.flyTo([latitude, longitude], GEOLOCATE_ZOOM, { duration: 1.5 });
        onLocated([latitude, longitude]);
        onMapMove?.(latitude, longitude, GEOLOCATE_ZOOM);
        socket.emit('map-update', { sessionId, lat: latitude, lng: longitude, zoom: GEOLOCATE_ZOOM });
      },
      () => {
        console.warn('[SyncSphere] Geolocation denied — using default world view.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// Tracker: emit throttled move events | Tracked: receive and mirror
function MapSyncHandler({ socket, sessionId, role, onMapMove }: MapComponentProps) {
  const map = useMap();
  const lastEmitRef = useRef<number>(0);

  // Tracked — listen for incoming updates
  useEffect(() => {
    if (role !== 'tracked') return;
    const handleUpdate = ({ lat, lng, zoom }: MapSyncPayload) => {
      map.flyTo([lat, lng], zoom, { animate: true, duration: 0.25 });
      onMapMove?.(lat, lng, zoom);
    };
    socket.on('map-update', handleUpdate);
    return () => { socket.off('map-update', handleUpdate); };
  }, [map, socket, role, onMapMove]);

  // Tracker — send throttled moves
  useMapEvents({
    move() {
      const { lat, lng } = map.getCenter();
      const zoom = map.getZoom();
      onMapMove?.(lat, lng, zoom); // always update HUD

      if (role !== 'tracker') return;
      const now = Date.now();
      if (now - lastEmitRef.current < THROTTLE_MS) return;
      lastEmitRef.current = now;
      socket.emit('map-update', { sessionId, lat, lng, zoom });
    },
  });

  return null;
}

export default function MapComponent(props: MapComponentProps) {
  const { role } = props;
  const [myPos, setMyPos] = useState<[number, number] | null>(null);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ResizeHandler />
      <GeolocationHandler {...props} onLocated={setMyPos} />
      <MapSyncHandler {...props} />

      {myPos && (
        <>
          <Circle
            center={myPos}
            radius={80}
            pathOptions={{
              color: role === 'tracker' ? '#3b82f6' : '#a855f7',
              fillColor: role === 'tracker' ? '#3b82f6' : '#a855f7',
              fillOpacity: 0.2,
              weight: 2,
            }}
          />
          <Marker
            position={myPos}
            icon={role === 'tracker' ? TRACKER_ICON : TRACKED_ICON}
          >
            <Popup>
              {role === 'tracker' ? '📡 Your location (Broadcasting)' : '🛰 Your location (Syncing)'}
            </Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}
