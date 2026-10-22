import { t, translateKnown } from '../ui/i18n';
import { useAppPreferences } from '../ui/preferences';
import type { ShelfItemDto, ShelfListResult } from '@onboard/shared';
import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { RequireLogin } from '../auth/require-login';
import { errorMessage } from '../features/errors';
import { AddGame } from '../features/shelf/add-game';
import { readStored, writeStored } from '../features/shelf/local-storage';
import {
  COLUMN_OPTIONS,
  SORT_OPTIONS,
  parseColumns,
  sortShelf,
  type ShelfColumn,
  type ShelfSort,
} from '../features/shelf/logic';
import { ShelfGrid } from '../features/shelf/shelf-grid';
import { ShelfRow, type ShelfPatch } from '../features/shelf/shelf-row';
import { useFetch } from '../features/use-fetch';
import { Button, Chip, Collapsible, Hint, Segmented } from '../ui/primitives';
import { themeStyles, colors, space } from '../ui/theme';

const COLUMNS_KEY = 'onboard.shelf.columns';
const VIEW_KEY = 'onboard.shelf.view';

const loadShelf = (signal: AbortSignal) => api<ShelfListResult>('/me/shelf', { signal });

type ViewMode = 'list' | 'grid';

function ShelfManager() {
  useAppPreferences();
  const shelf = useFetch(loadShelf);
  const { setData, reload } = shelf;
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>(() =>
    readStored(VIEW_KEY) === 'grid' ? 'grid' : 'list',
  );
  const [sort, setSort] = useState<ShelfSort>('name');
  const [columns, setColumns] = useState<ShelfColumn[]>(() =>
    parseColumns(readStored(COLUMNS_KEY)),
  );
  const [now] = useState(() => Date.now());

  const items = shelf.data && !shelf.data.hidden ? shelf.data.items : null;
  const sorted = items ? sortShelf(items, sort) : [];

  const changeView = (v: ViewMode) => {
    setView(v);
    writeStored(VIEW_KEY, v);
  };

  const toggleColumn = (c: ShelfColumn) => {
    const next = columns.includes(c)
      ? columns.filter((x) => x !== c)
      : COLUMN_OPTIONS.map((o) => o.value).filter((x) => x === c || columns.includes(x));
    setColumns(next);
    writeStored(COLUMNS_KEY, JSON.stringify(next));
  };

  const upsert = (item: ShelfItemDto) =>
    setData((prev) =>
      prev.hidden
        ? prev
        : { hidden: false, items: [item, ...prev.items.filter((i) => i.game.id !== item.game.id)] },
    );

  const save = async (gameId: string, patch: ShelfPatch) => {
    setError(null);
    try {
      const item = await api<ShelfItemDto>('/me/shelf', { body: { gameId, ...patch } });
      if (item && typeof item === 'object' && 'game' in item) {
        setData((prev) =>
          prev.hidden
            ? prev
            : { hidden: false, items: prev.items.map((i) => (i.game.id === gameId ? item : i)) },
        );
      } else {
        reload();
      }
    } catch (e) {
      setError(errorMessage(e, t('Không lưu được, thử lại sau')));
    }
  };

  const add = async (gameId: string) => {
    setError(null);
    try {
      const item = await api<ShelfItemDto>('/me/shelf', { body: { gameId } });
      if (item && typeof item === 'object' && 'game' in item) upsert(item);
      else reload();
    } catch (e) {
      setError(errorMessage(e, t('Không thêm được vào tủ, thử lại sau')));
    }
  };

  const remove = async (gameId: string) => {
    setError(null);
    try {
      await api(`/me/shelf/${encodeURIComponent(gameId)}`, { method: 'DELETE' });
      setData((prev) =>
        prev.hidden
          ? prev
          : { hidden: false, items: prev.items.filter((i) => i.game.id !== gameId) },
      );
    } catch (e) {
      setError(errorMessage(e, t('Không gỡ được, thử lại sau')));
    }
  };

  return (
    <View style={styles.stack}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('Tủ game của tôi')}</Text>
        <Link href="/wishlist" style={styles.link}>
          {t('Danh sách Muốn chơi')}
        </Link>
      </View>
      <AddGame onAdd={(g) => void add(g.id)} />
      {error ? <Text style={styles.error}>{translateKnown(error ?? '')}</Text> : null}
      {shelf.loading && !shelf.data ? <ActivityIndicator /> : null}
      {shelf.error ? (
        <View style={styles.stack}>
          <Text style={styles.error}>{translateKnown(shelf.error ?? '')}</Text>
          <Button label={t('Thử lại')} tone="ghost" onPress={reload} />
        </View>
      ) : null}
      {items && items.length === 0 ? (
        <Hint>{t('Tủ game trống, hãy thêm game đầu tiên.')}</Hint>
      ) : null}
      {items && items.length > 0 ? (
        <>
          <Segmented
            value={view}
            onChange={changeView}
            options={[
              { value: 'list', label: t('Danh sách') },
              { value: 'grid', label: t('Lưới') },
            ]}
          />
          <View style={styles.chips}>
            <Text style={styles.label}>{t('Sắp xếp:')}</Text>
            {SORT_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={/^\d/.test(o.label) ? o.label : t(o.label)}
                selected={sort === o.value}
                onPress={() => setSort(o.value)}
              />
            ))}
          </View>
          {view === 'list' ? (
            <Collapsible title={t('Thuộc tính')}>
              <View style={styles.chips}>
                {COLUMN_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={/^\d/.test(o.label) ? o.label : t(o.label)}
                    selected={columns.includes(o.value)}
                    onPress={() => toggleColumn(o.value)}
                  />
                ))}
              </View>
            </Collapsible>
          ) : null}
          {view === 'grid' ? (
            <ShelfGrid items={sorted} now={now} />
          ) : (
            sorted.map((item) => (
              <ShelfRow
                key={item.game.id}
                item={item}
                columns={columns}
                now={now}
                onPatch={(patch) => save(item.game.id, patch)}
                onRemove={() => void remove(item.game.id)}
              />
            ))
          )}
        </>
      ) : null}
    </View>
  );
}

export default function ShelfScreen() {
  useAppPreferences();
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t('Tủ game') }} />
      <View style={styles.column}>
        <RequireLogin reason={t('Đăng nhập để quản lý tủ game của bạn.')}>
          <ShelfManager />
        </RequireLogin>
      </View>
    </ScrollView>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    content: { padding: space.lg, alignItems: 'center' },
    column: { width: '100%', maxWidth: 960 },
    stack: { gap: space.md },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: space.sm,
    },
    title: { fontSize: 22, fontWeight: '700', color: colors.text },
    link: { color: colors.primary, fontWeight: '600' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
    label: { color: colors.muted, fontSize: 13 },
    error: { color: colors.danger },
  }),
);
