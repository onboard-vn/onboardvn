import type { CafeMapPinDto } from '@onboard/shared';
import { useRouter } from 'expo-router';
import {
  GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../ui/theme';
import './popup.css';
import { renderCafeMapPopupHtml } from './popup';
import { DEFAULT_MAP_CENTER, MAP_STYLE_URL, MAP_WORKER_URL } from './style';
import { isWebglSupported } from './webgl';

setWorkerUrl(MAP_WORKER_URL);

const SOURCE_ID = 'cafe-pins';

type GeoData = Parameters<GeoJSONSource['setData']>[0];

function pinsToGeoJson(pins: CafeMapPinDto[]): GeoData {
  return {
    type: 'FeatureCollection',
    features: pins.map((pin) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
      properties: pin,
    })),
  } as unknown as GeoData;
}

export function CafeMap({
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
  const mapRef = useRef<MapLibreMap | null>(null);
  const [supported] = useState(() => isWebglSupported());
  const [ready, setReady] = useState(false);
  const pinsRef = useRef(pins);
  const openCafeRef = useRef((slug: string) =>
    router.push({ pathname: '/cafes/[slug]', params: { slug } }),
  );
  useEffect(() => {
    pinsRef.current = pins;
    openCafeRef.current = (slug) => router.push({ pathname: '/cafes/[slug]', params: { slug } });
  });

  useEffect(() => {
    if (!containerRef.current || !supported) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center,
      zoom,
      attributionControl: { compact: false },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl(), 'top-right');

    map.on('load', () => {
      map.resize();
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: pinsToGeoJson(pinsRef.current),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
      setReady(true);

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#4f46e5',
          'circle-radius': ['step', ['get', 'point_count'], 16, 20, 20, 50, 26],
          'circle-opacity': 0.85,
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#4f46e5',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.on('click', 'clusters', async (e: MapLayerMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        const source = map.getSource<GeoJSONSource>(SOURCE_ID);
        if (clusterId === undefined || !source) return;
        const zoomLevel = await source.getClusterExpansionZoom(clusterId);
        const geometry = features[0]?.geometry;
        if (geometry?.type !== 'Point') return;
        map.easeTo({ center: geometry.coordinates as [number, number], zoom: zoomLevel });
      });

      map.on('click', 'unclustered-point', (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (feature?.geometry.type !== 'Point') return;
        const slug = feature.properties?.slug as string | undefined;
        const pin = pinsRef.current.find((p) => p.slug === slug);
        if (!pin) return;
        const popup = new Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setHTML(renderCafeMapPopupHtml(pin))
          .addTo(map);
        popup
          .getElement()
          .querySelector('a[data-cafe-link]')
          ?.addEventListener('click', (event) => {
            event.preventDefault();
            openCafeRef.current(pin.slug);
          });
      });

      for (const layer of ['clusters', 'unclustered-point']) {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource<GeoJSONSource>(SOURCE_ID);
    if (!source) return;

    source.setData(pinsToGeoJson(pins));

    if (fitToPins && pins.length > 0) {
      const first = pins[0]!;
      const bounds = pins.reduce(
        (b, pin) => b.extend([pin.lng, pin.lat]),
        new LngLatBounds([first.lng, first.lat], [first.lng, first.lat]),
      );
      map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 300 });
    }
  }, [pins, fitToPins, ready]);

  useEffect(() => {
    if (!fitToPins) mapRef.current?.setCenter(center);
  }, [center, fitToPins]);

  if (!supported) {
    return (
      <View style={styles.unsupported}>
        <Text style={styles.unsupportedText}>
          Trình duyệt của bạn không hỗ trợ WebGL nên không hiển thị được bản đồ. Hãy dùng danh sách
          quán (nút &quot;Xem danh sách&quot;) thay thế.
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
