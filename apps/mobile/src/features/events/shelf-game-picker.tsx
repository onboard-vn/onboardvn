import type { ShelfListResult } from '@onboard/shared';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api/client';
import { space } from '../../ui/theme';
import { Body, Btn, Muted, Row, gameName } from './ui';

type ShelfGame = Extract<ShelfListResult, { hidden: false }>['items'][number]['game'];

export function ShelfGamePicker({
  username,
  onPick,
  onCancel,
}: {
  username?: string;
  onPick: (game: { id: string; name: string }) => void;
  onCancel?: () => void;
}) {
  const [state, setState] = useState<'loading' | 'hidden' | 'empty' | 'ready'>('loading');
  const [games, setGames] = useState<ShelfGame[]>([]);

  useEffect(() => {
    let live = true;
    const path = username ? `/users/${encodeURIComponent(username)}/shelf` : '/me/shelf';
    api<ShelfListResult>(path)
      .then((body) => {
        if (!live) return;
        if (body.hidden) {
          setState('hidden');
          return;
        }
        setGames(body.items.map((i) => i.game));
        setState(body.items.length === 0 ? 'empty' : 'ready');
      })
      .catch(() => live && setState('hidden'));
    return () => {
      live = false;
    };
  }, [username]);

  if (state === 'loading') return <Muted>Đang tải tủ game…</Muted>;
  if (state === 'hidden') return <Muted>Không xem được tủ game.</Muted>;
  if (state === 'empty') return <Muted>Tủ game trống.</Muted>;

  return (
    <View style={{ gap: space.sm }}>
      {games.map((g) => (
        <Row key={g.id} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <View style={{ flex: 1 }}>
            <Body>{gameName(g)}</Body>
          </View>
          <Btn small label="Chọn" onPress={() => onPick({ id: g.id, name: gameName(g) })} />
        </Row>
      ))}
      {onCancel ? <Btn small variant="ghost" label="Đóng" onPress={onCancel} /> : null}
    </View>
  );
}
