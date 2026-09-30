"use client";

import { useEffect, useRef } from "react";
import type * as LeafletTypes from "leaflet";

/**
 * Thin Leaflet + OpenStreetMap wrapper for the live fleet maps.
 *
 * NOTE (map provider decision): the client has no Google Maps / Mapbox key,
 * so tiles come from free OpenStreetMap. To switch providers later, only the
 * TILE_URL / TILE_ATTRIBUTION constants below need to change (e.g. a Google
 * or Mapbox URL + API key) — every consumer talks to this component, never
 * to Leaflet directly. Leaflet is dynamically imported so this component is
 * safe to load with `next/dynamic` `{ ssr: false }`.
 */

// Swap these two constants to move to Google Maps / Mapbox later.
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const DEFAULT_CENTER: [number, number] = [21.4225, 39.8262]; // Makkah
export const DEFAULT_ZOOM = 11;

export interface LiveBusMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  popupHtml: string;
}

export interface GeofenceOverlay {
  id: string;
  name: string;
  type: string;
  /** Polygon rings as [lng, lat] pairs (backend convention). */
  coordinates?: number[][] | null;
  centerLat?: number | null;
  centerLng?: number | null;
  radiusMeters?: number | null;
}

interface LiveMapProps {
  buses?: LiveBusMarker[];
  geofences?: GeofenceOverlay[];
  showBuses?: boolean;
  showGeofences?: boolean;
  showRoutes?: boolean;
  /** Trail polyline as [lat, lng] pairs (trip history / playback). */
  trail?: [number, number][];
  playbackPos?: [number, number] | null;
  center?: [number, number];
  zoom?: number;
  height?: number;
  onMapClick?: (lat: number, lng: number) => void;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "—").replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function busPopupHtml(b: {
  plateNumber?: string;
  driverName?: string;
  tripId?: string;
  tripName?: string;
  status?: string;
  speedKmh?: number | null;
  heading?: number | null;
  recordedAt?: string | null;
}): string {
  const rows: Array<[string, unknown]> = [
    ["Plate", b.plateNumber],
    ["Driver", b.driverName],
    ["Trip", b.tripName || b.tripId],
    ["Status", b.status],
    ["Speed", b.speedKmh !== null && b.speedKmh !== undefined ? `${b.speedKmh} km/h` : null],
    ["Heading", b.heading !== null && b.heading !== undefined ? `${b.heading}°` : null],
    ["Updated", b.recordedAt ? new Date(b.recordedAt).toLocaleTimeString() : null],
  ];
  const title = escapeHtml(b.plateNumber || "Bus");
  const body = rows
    .map(
      ([k, v]) =>
        `<div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;padding:1px 0;">` +
        `<span style="color:#6b7280;">${escapeHtml(k)}</span>` +
        `<strong style="color:#111827;">${escapeHtml(v)}</strong></div>`
    )
    .join("");
  return `<div style="min-width:170px;"><div style="font-weight:700;font-size:12px;margin-bottom:4px;">${title}</div>${body}</div>`;
}

export default function LiveMap({
  buses = [],
  geofences = [],
  showBuses = true,
  showGeofences = true,
  showRoutes = true,
  trail = [],
  playbackPos = null,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  height = 480,
  onMapClick,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletTypes.Map | null>(null);
  const busLayerRef = useRef<LeafletTypes.LayerGroup | null>(null);
  const fenceLayerRef = useRef<LeafletTypes.LayerGroup | null>(null);
  const routeLayerRef = useRef<LeafletTypes.LayerGroup | null>(null);
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  // Init once.
  useEffect(() => {
    let cancelled = false;
    let map: LeafletTypes.Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      map = L.map(containerRef.current).setView(center, zoom);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      busLayerRef.current = L.layerGroup().addTo(map);
      fenceLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      map.on("click", (e: LeafletTypes.LeafletMouseEvent) => {
        clickRef.current?.(e.latlng.lat, e.latlng.lng);
      });
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when the requested center changes materially.
  useEffect(() => {
    mapRef.current?.setView(center, mapRef.current.getZoom());
  }, [center]);

  // Bus markers.
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      const layer = busLayerRef.current;
      if (!layer) return;
      layer.clearLayers();
      if (!showBuses) return;
      buses.forEach((b) => {
        if (!Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return;
        L.circleMarker([b.lat, b.lng], {
          radius: 9,
          color: "#ffffff",
          weight: 2,
          fillColor: b.color,
          fillOpacity: 0.95,
        })
          .bindPopup(b.popupHtml)
          .addTo(layer);
      });
    })();
  }, [buses, showBuses]);

  // Geofence overlay (polygons + circles).
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      const layer = fenceLayerRef.current;
      if (!layer) return;
      layer.clearLayers();
      if (!showGeofences) return;
      geofences.forEach((g) => {
        const label = `<strong>${escapeHtml(g.name)}</strong><br/><span style="font-size:11px;">${escapeHtml(g.type)}</span>`;
        try {
          if (g.coordinates && g.coordinates.length >= 3) {
            const latlngs = g.coordinates.map(
              (c) => [c[1], c[0]] as [number, number]
            );
            L.polygon(latlngs, { color: "#2563eb", weight: 2, fillOpacity: 0.12 })
              .bindPopup(label)
              .addTo(layer);
          } else if (
            g.centerLat !== null &&
            g.centerLat !== undefined &&
            g.centerLng !== null &&
            g.centerLng !== undefined
          ) {
            L.circle([g.centerLat, g.centerLng], {
              radius: g.radiusMeters || 500,
              color: "#2563eb",
              weight: 2,
              fillOpacity: 0.12,
            })
              .bindPopup(label)
              .addTo(layer);
          }
        } catch {
          /* ignore malformed fence geometry */
        }
      });
    })();
  }, [geofences, showGeofences]);

  // Route trail + playback marker.
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      const layer = routeLayerRef.current;
      if (!layer) return;
      layer.clearLayers();
      if (!showRoutes) return;
      if (trail.length > 1) {
        L.polyline(trail, { color: "#7c3aed", weight: 3, opacity: 0.85 }).addTo(layer);
      }
      if (playbackPos) {
        L.circleMarker(playbackPos, {
          radius: 8,
          color: "#ffffff",
          weight: 2,
          fillColor: "#7c3aed",
          fillOpacity: 1,
        })
          .bindPopup("Playback position")
          .addTo(layer);
      }
    })();
  }, [trail, playbackPos, showRoutes]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%", borderRadius: "12px", zIndex: 0 }}
      role="application"
      aria-label="Live fleet map"
    />
  );
}
