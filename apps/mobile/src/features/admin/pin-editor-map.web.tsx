import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { Hint } from '../../ui/primitives';
import type { PinEditorMapProps } from './pin-types';

export const pinMapAvailable = true;

const MAP_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_CENTER: [number, number] = [105.8542, 21.0285];

setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

export default function PinEditorMap({ lat, lng, onPick, recenterTo }: PinEditorMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const [supported] = useState(webglSupported);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  function ensureMarker(map: MapLibreMap, at: [number, number]) {
    if (markerRef.current) {
      markerRef.current.setLngLat(at);
      return;
    }
    const marker = new Marker({ draggable: true }).setLngLat(at).addTo(map);
    marker.on('dragend', () => {
      const pos = marker.getLngLat();
      onPickRef.current(pos.lat, pos.lng);
    });
    markerRef.current = marker;
  }

  useEffect(() => {
    if (!containerRef.current || !supported) return;
    const hasCoords = lat !== null && lng !== null;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: hasCoords ? [lng, lat] : DEFAULT_CENTER,
      zoom: hasCoords ? 15 : 11,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl(), 'top-right');
    if (hasCoords) ensureMarker(map, [lng, lat]);

    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.lngLat;
      const degenerate =
        !Number.isFinite(clickLat) ||
        !Number.isFinite(clickLng) ||
        (Math.abs(clickLat) < 0.5 && Math.abs(clickLng) < 0.5);
      if (degenerate) return;
      ensureMarker(map, [clickLng, clickLat]);
      onPickRef.current(clickLat, clickLng);
    });
    map.on('load', () => map.resize());

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Map is created once; later lat/lng changes are applied by the effect below.
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
      <Hint>
        Trình duyệt không hỗ trợ bản đồ (WebGL) — nhập vĩ độ/kinh độ trực tiếp ở ô bên dưới.
      </Hint>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="pin-editor-map"
      style={{
        height: 256,
        width: '100%',
        borderRadius: 8,
        border: '1px solid #e2e5ea',
        overflow: 'hidden',
      }}
    />
  );
}
