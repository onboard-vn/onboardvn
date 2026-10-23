import type { GameListResponse } from '@onboard/shared';
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../api/client';
import { Button, Hint } from '../../ui/primitives';
import { themeStyles, colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import { inputStyle } from '../search-input';
import { getActiveLanguage, t, translateKnown } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';

export interface ResolvedGame {
  id: string;
  name: string;
  nameVi?: string | null;
  nameEn?: string;
}

type GameResult = GameListResponse['items'][number];

const displayName = (g: { nameVi: string | null; nameEn: string }) =>
  getActiveLanguage() === 'en' ? g.nameEn || g.nameVi || '' : g.nameVi || g.nameEn;

export function GamePicker({
  onPick,
  initialQuery,
  actionLabel,
  allowCreate = true,
  isPicked,
  pickedLabel,
  disabled,
}: {
  onPick: (game: ResolvedGame) => void;
  initialQuery?: string;
  actionLabel?: string;
  allowCreate?: boolean;
  isPicked?: (gameId: string) => boolean;
  pickedLabel?: string;
  disabled?: boolean;
}) {
  useAppPreferences();
  const [text, setText] = useState(initialQuery ?? '');
  const [results, setResults] = useState<GameResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    const q = text.trim();
    setSearched(true);
    setError(null);
    if (!q) {
      setResults([]);
      return;
    }
    try {
      const res = await api<GameListResponse>('/games', { query: { q, pageSize: 10 } });
      setResults(res.items);
    } catch (e) {
      setResults([]);
      setError(errorMessage(e));
    }
  };

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <TextInput
          style={[inputStyle, styles.input]}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => void search()}
          placeholder={t('Tìm game trong danh mục...')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('Tìm game trong danh mục')}
          returnKeyType="search"
        />
        <Button label={t('Tìm')} onPress={() => void search()} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {searched && !error && results.length === 0 ? (
        <View style={styles.row}>
          <View style={styles.input}>
            <Hint>{t('Không tìm thấy.')}</Hint>
          </View>
          {allowCreate ? (
            <Link
              href={`/admin/games/new?nameEn=${encodeURIComponent(initialQuery ?? '')}` as Href}
              style={styles.link}
            >
              {t('Tạo game nhanh')}
            </Link>
          ) : null}
        </View>
      ) : null}
      {results.map((g) => (
        <View key={g.id} style={styles.result}>
          <Text style={styles.name}>{displayName(g)}</Text>
          <Button
            label={
              isPicked?.(g.id)
                ? translateKnown(pickedLabel ?? 'Đã chọn')
                : translateKnown(actionLabel ?? 'Chọn')
            }
            disabled={disabled || isPicked?.(g.id)}
            onPress={() =>
              onPick({
                id: g.id,
                name: displayName(g),
                nameVi: g.nameVi,
                nameEn: g.nameEn,
              })
            }
          />
        </View>
      ))}
    </View>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    stack: { gap: space.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    input: { flex: 1 },
    result: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.sm,
    },
    name: { flex: 1, color: colors.text },
    link: { color: colors.primary, textDecorationLine: 'underline' },
    error: { color: colors.danger, fontSize: 13 },
  }),
);
