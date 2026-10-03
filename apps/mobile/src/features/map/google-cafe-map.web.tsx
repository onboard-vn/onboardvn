/// <reference types="google.maps" />
import type { CafeMapPinDto } from '@onboard/shared';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../ui/theme';
import './popup.css';
import { renderCafeMapPopupHtml } from './popup';
import { DEFAULT_MAP_CENTER, GOOGLE_MAPS_API_KEY } from './style';

let configured = false;

export function GoogleCafeMap({
  pins,
  center = DEFAULT_MAP_CENTER,
  zoom = 12,
  fitToPins = false,
}: {
  pins: CafeMapPinDto[];
  center?: [number, number];
  zoom?: number;
  fitToPins?: boolean;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const openCafeRef = useRef((slug: string) =>
    router.push({ pathname: '/cafes/[slug]', params: { slug } }),
  );
  useEffect(() => {
    openCafeRef.current = (slug) => router.push({ pathname: '/cafes/[slug]', params: { slug } });
  });

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    if (!configured) {
      setOptions({ key: GOOGLE_MAPS_API_KEY, v: 'weekly', language: 'vi', region: 'VN' });
      configured = true;
    }
    importLibrary('maps')
      .then(({ Map, InfoWindow }) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new Map(containerRef.current, {
          center: { lat: center[1], lng: center[0] },
          zoom,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        infoRef.current = new InfoWindow();
        clustererRef.current = new MarkerClusterer({ map: mapRef.current });
        setReady(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const clusterer = clustererRef.current;
    if (!ready || !map || !clusterer) return;
    const markers = pins.map((pin) => {
      const marker = new google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        title: pin.name,
      });
      marker.addListener('click', () => {
        const info = infoRef.current;
        if (!info) return;
        const box = document.createElement('div');
        box.innerHTML = renderCafeMapPopupHtml(pin);
        box.querySelector('a[data-cafe-link]')?.addEventListener('click', (event) => {
          event.preventDefault();
          openCafeRef.current(pin.slug);
        });
        info.setContent(box);
        info.open({ map, anchor: marker });
      });
      return marker;
    });
    clusterer.clearMarkers();
    clusterer.addMarkers(markers);

    if (fitToPins && pins.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      for (const pin of pins) bounds.extend({ lat: pin.lat, lng: pin.lng });
      map.fitBounds(bounds, 48);
      if (pins.length === 1) map.setZoom(15);
    }
  }, [pins, fitToPins, ready]);

  useEffect(() => {
    if (!fitToPins) mapRef.current?.setCenter({ lat: center[1], lng: center[0] });
  }, [center, fitToPins]);

  if (failed) {
    return (
      <View style={styles.unsupported}>
        <Text style={styles.unsupportedText}>
          Không tải được Google Maps. Hãy dùng danh sách quán (nút &quot;Xem danh sách&quot;) thay
          thế.
        </Text>
      </View>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="cafe-map"
      data-map-ready={ready}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

const styles = StyleSheet.create({
  unsupported: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  unsupportedText: { color: colors.muted, textAlign: 'center', fontSize: 14 },
});
