'use client';

import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_MAP_CENTER,
  isWebglSupported,
  MAP_STYLE_URL,
  MAP_WORKER_URL,
} from '@/lib/map-style';

// Same maplibre-gl module instance as the `Map` created below (see cafe-map.tsx for why).
setWorkerUrl(MAP_WORKER_URL);

export interface RecenterTarget {
  lat: number;
  lng: number;
  zoom?: number;
}

/** Raw MapLibre canvas for the café ghim-tay picker: draggable marker, click-to-place. Loaded
 * only via `next/dynamic({ ssr: false })` from `pin-editor.tsx` — never imported directly. */
export default function PinEditorMap({
  lat,
  lng,
  onPick,
  recenterTo,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  recenterTo?: RecenterTarget | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const [supported] = useState(() => typeof window !== 'undefined' && isWebglSupported());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  function ensureMarker(map: MapLibreMap, initial: [number, number]) {
    if (markerRef.current) {
      markerRef.current.setLngLat(initial);
      return markerRef.current;
    }
    const marker = new Marker({ draggable: true }).setLngLat(initial).addTo(map);
    marker.on('dragend', () => {
      const pos = marker.getLngLat();
      onPickRef.current(pos.lat, pos.lng);
    });
    markerRef.current = marker;
    return marker;
  }

  useEffect(() => {
    if (!containerRef.current || !supported) return;

    const hasCoords = lat !== null && lng !== null;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: hasCoords ? [lng, lat] : DEFAULT_MAP_CENTER,
      zoom: hasCoords ? 15 : 11,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl(), 'top-right');

    if (hasCoords) ensureMarker(map, [lng, lat]);

    map.on('click', (e) => {
      // Drop NaN/Null Island reads from an unsettled software-rendered transform.
      const { lat: clickLat, lng: clickLng } = e.lngLat;
      const isDegenerate =
        !Number.isFinite(clickLat) ||
        !Number.isFinite(clickLng) ||
        (Math.abs(clickLat) < 0.5 && Math.abs(clickLng) < 0.5);
      if (isDegenerate) return;
      ensureMarker(map, [clickLng, clickLat]);
      onPickRef.current(clickLat, clickLng);
    });

    // Container may not have its final size yet at construction — resize once on load.
    map.on('load', () => {
      map.resize();
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Map is created once; lat/lng updates (typed or "Xoá vị trí") are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lat === null || lng === null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    ensureMarker(map, [lng, lat]);
  }, [lat, lng]);

  useEffect(() => {
    if (recenterTo) {
      mapRef.current?.easeTo({
        center: [recenterTo.lng, recenterTo.lat],
        zoom: recenterTo.zoom ?? 15,
      });
    }
  }, [recenterTo]);

  if (!supported) {
    return (
      <p
        data-testid="pin-editor-map"
        className="text-muted-foreground rounded-md border p-4 text-sm"
      >
        Trình duyệt không hỗ trợ bản đồ (WebGL) — nhập vĩ độ/kinh độ trực tiếp ở ô bên dưới.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="pin-editor-map"
      data-map-ready={ready}
      className="h-64 w-full rounded-md border"
    />
  );
}
