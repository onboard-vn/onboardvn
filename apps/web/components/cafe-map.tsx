'use client';

import type { CafeMapPinDto } from '@onboard/shared';
import type { FeatureCollection, Point } from 'geojson';
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
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { renderCafeMapPopupHtml } from './cafe-map-popup';
import {
  DEFAULT_MAP_CENTER,
  isWebglSupported,
  MAP_STYLE_URL,
  MAP_WORKER_URL,
} from '@/lib/map-style';

// Must use the same `maplibre-gl` module instance the `Map`/worker are created from below —
// dynamically importing it separately would set this on a different bundler chunk instance.
setWorkerUrl(MAP_WORKER_URL);

const SOURCE_ID = 'cafe-pins';

interface PinFeatureCollection {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: CafeMapPinDto;
  }[];
}

function pinsToGeoJson(pins: CafeMapPinDto[]): PinFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pins.map((pin) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
      properties: pin,
    })),
  };
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
  /** Fits the viewport to `pins`' bounds instead of `center`/`zoom` (e.g. when a province filter narrows the set). */
  fitToPins?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [supported] = useState(() => typeof window !== 'undefined' && isWebglSupported());
  const [ready, setReady] = useState(false);
  // Kept in sync every render so the 'load' handler (which can fire well after mount, once
  // tiles/style are fetched) always adds the source with the *latest* pins, not a stale closure.
  const pinsRef = useRef(pins);
  useEffect(() => {
    pinsRef.current = pins;
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

    map.on('load', () => onMapLoad(map));

    function onMapLoad(map: MapLibreMap) {
      // The container isn't guaranteed to have its final size yet when the map is constructed
      // (e.g. right after the loading placeholder swaps in) — resize once on load.
      map.resize();
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: pinsToGeoJson(pinsRef.current) as unknown as FeatureCollection<Point>,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
      // Signals "the source now exists" to the pins-sync effect below — set only after
      // addSource so a pins update racing this handler never targets a missing source.
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
        // Feature properties come back through MapLibre's own (de)serialization, which
        // flattens nested objects like `openStatus` to JSON strings — look the pin up by its
        // (always-a-plain-string) slug from the latest pins instead of trusting `properties`.
        const slug = feature.properties?.slug as string | undefined;
        const pin = pinsRef.current.find((p) => p.slug === slug);
        if (!pin) return;
        new Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setHTML(renderCafeMapPopupHtml(pin))
          .addTo(map);
      });

      for (const layer of ['clusters', 'unclustered-point']) {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
        });
      }
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Re-created on initial mount only; pin/viewport updates are pushed via the source below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pushes `pins` into the already-created GeoJSON source. Deliberately does *not* fall back to
  // `map.once('load', ...)`: 'load' already fired by the time the source exists (see
  // `onMapLoad` above), so that would silently drop every update made while tiles are still
  // loading. If the source doesn't exist yet, this is a no-op — `pinsRef` (kept fresh every
  // render) already holds the latest pins, so `onMapLoad`'s `addSource` picks them up itself.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource<GeoJSONSource>(SOURCE_ID);
    if (!source) return;

    source.setData(pinsToGeoJson(pins) as unknown as FeatureCollection<Point>);

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
      <div className="text-muted-foreground flex h-full w-full items-center justify-center p-6 text-center text-sm">
        Trình duyệt của bạn không hỗ trợ WebGL nên không hiển thị được bản đồ. Hãy dùng{' '}
        <Link href="/cafes" className="underline">
          danh sách địa điểm chơi
        </Link>{' '}
        thay thế.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="cafe-map"
      data-map-ready={ready}
      className="h-full w-full"
    />
  );
}
