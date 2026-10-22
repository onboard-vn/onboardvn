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
import { themeStyles, colors } from '../../ui/theme';
import './popup.css';
import { renderCafeMapPopupHtml } from './popup';
import { DEFAULT_MAP_CENTER, getMapStyleUrl, MAP_WORKER_URL } from './style';
import { isWebglSupported } from './webgl';
import { useAppPreferences } from '../../ui/preferences';
import { t } from '../../ui/i18n';
import { applyMapLibreControlLocale, getMapLibreLocale } from './locale';



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
  const { language, theme } = useAppPreferences();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const styleThemeRef = useRef(theme);
  const popupRef = useRef<Popup | null>(null);
  const popupPinRef = useRef<CafeMapPinDto | null>(null);
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

    let handlersRegistered = false;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: getMapStyleUrl(theme),
      locale: getMapLibreLocale(language),
      center,
      zoom,
      attributionControl: { compact: false },
    });
    styleThemeRef.current = theme;
    mapRef.current = map;
    map.addControl(new NavigationControl(), 'top-right');

    const bindPopupLink = (popup: Popup, pin: CafeMapPinDto) => {
      popup
        .getElement()
        .querySelector('a[data-cafe-link]')
        ?.addEventListener('click', (event) => {
          event.preventDefault();
          openCafeRef.current(pin.slug);
        });
    };

    map.on('load', () => map.resize());
    map.on('style.load', () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: pinsToGeoJson(pinsRef.current),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });
      }
      setReady(true);

      if (!map.getLayer('clusters')) map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': colors.primary,
          'circle-radius': ['step', ['get', 'point_count'], 16, 20, 20, 50, 26],
          'circle-opacity': 0.85,
        },
      });
      if (!map.getLayer('cluster-count')) map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
        paint: { 'text-color': colors.onPrimary },
      });
      if (!map.getLayer('unclustered-point')) map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': colors.primary,
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': colors.card,
        },
      });

      if (handlersRegistered) return;
      handlersRegistered = true;
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
        popupRef.current = popup;
        popupPinRef.current = pin;
        bindPopupLink(popup, pin);
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
    if (!containerRef.current) return;
    applyMapLibreControlLocale(containerRef.current, language);
    const observer = new MutationObserver(() => {
      if (containerRef.current) applyMapLibreControlLocale(containerRef.current, language);
    });
    observer.observe(containerRef.current, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });
    return () => observer.disconnect();
  }, [language]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleThemeRef.current === theme) return;
    styleThemeRef.current = theme;
    map.setStyle(getMapStyleUrl(theme));
  }, [theme]);

  useEffect(() => {
    const popup = popupRef.current;
    const pin = popupPinRef.current;
    if (!popup?.isOpen() || !pin) return;
    popup.setHTML(renderCafeMapPopupHtml(pin));
    popup
      .getElement()
      .querySelector('a[data-cafe-link]')
      ?.addEventListener('click', (event) => {
        event.preventDefault();
        openCafeRef.current(pin.slug);
      });
  }, [language]);

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
          {t("Trình duyệt của bạn không hỗ trợ WebGL nên không hiển thị được bản đồ. Hãy dùng danh sách\n          quán (nút \"Xem danh sách\") thay thế.")}
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

const styles = themeStyles(() => StyleSheet.create({
  unsupported: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  unsupportedText: { color: colors.muted, textAlign: 'center', fontSize: 14 },
}));
