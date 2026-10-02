import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, radius } from '../../ui/theme';
import { DEFAULT_MAP_CENTER, MAP_STYLE_URL, MAP_WORKER_URL } from '../map/style';
import { isWebglSupported } from '../map/webgl';
import type { PinEditorMapProps, RecenterTarget } from './pin-editor-map';

export type { RecenterTarget };

setWorkerUrl(MAP_WORKER_URL);

export default function PinEditorMap({ lat, lng, onPick, recenterTo }: PinEditorMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const [supported] = useState(() => isWebglSupported());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  const ensureMarker = (map: MapLibreMap, at: [number, number]) => {
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
  };

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
      const { lat: clickLat, lng: clickLng } = e.lngLat;
      const isDegenerate =
        !Number.isFinite(clickLat) ||
        !Number.isFinite(clickLng) ||
        (Math.abs(clickLat) < 0.5 && Math.abs(clickLng) < 0.5);
      if (isDegenerate) return;
      ensureMarker(map, [clickLng, clickLat]);
      onPickRef.current(clickLat, clickLng);
    });

    map.on('load', () => {
      map.resize();
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
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
      <Text style={styles.note}>
        Trình duyệt không hỗ trợ bản đồ (WebGL) — nhập vĩ độ/kinh độ trực tiếp ở ô bên dưới.
      </Text>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="pin-editor-map"
      data-map-ready={ready}
      style={{ width: '100%', height: 256, borderRadius: radius, overflow: 'hidden' }}
    />
  );
}

const styles = StyleSheet.create({ note: { color: colors.muted, fontSize: 13 } });
