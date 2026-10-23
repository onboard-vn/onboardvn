import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import type { ClubListResponse, GameDetailDto, ProvinceListResponse } from '@onboard/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { api } from '../../api/client';
import { RequireLogin } from '../../auth/require-login';
import type { CafeOption } from '../../features/events/cafe-picker';
import { EventForm } from '../../features/events/event-form';
import { gameName, LoadGate, Page, Title } from '../../features/events/ui';
import { useFetch } from '../../features/use-fetch';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function NewEvent() {
  useAppPreferences();
  const sp = useLocalSearchParams();
  const cafeSlug = first(sp.cafe);
  const clubSlug = first(sp.club);
  const gameSlug = first(sp.game);

  const load = useCallback(
    async (signal: AbortSignal) => {
      const [provinces, clubs, prefillCafe, prefillGame] = await Promise.all([
        api<ProvinceListResponse>('/locations/provinces', { signal }).then(
          (r) => r.items,
          () => [],
        ),
        api<ClubListResponse>('/clubs', { signal }).then(
          (r) => r.items,
          () => [],
        ),
        cafeSlug
          ? api<CafeOption>(`/cafes/${encodeURIComponent(cafeSlug)}`, { signal }).then(
              (c): CafeOption | undefined => ({
                id: c.id,
                slug: c.slug,
                name: c.name,
                wardName: c.wardName,
                provinceName: c.provinceName,
              }),
              () => undefined,
            )
          : Promise.resolve(undefined),
        gameSlug
          ? api<GameDetailDto>(`/games/${encodeURIComponent(gameSlug)}`, { signal }).then(
              (g) => ({ id: g.id, name: gameName(g) }),
              () => undefined,
            )
          : Promise.resolve(undefined),
      ]);
      return { provinces, clubs, prefillCafe, prefillGame };
    },
    [cafeSlug, gameSlug],
  );
  const { data, error, loading } = useFetch(load);

  return (
    <LoadGate loading={loading} error={error} hasData={!!data}>
      {data ? (
        <EventForm
          provinces={data.provinces}
          mode="create"
          prefillCafe={data.prefillCafe}
          clubs={data.clubs}
          prefillGame={data.prefillGame}
          initialClubId={data.clubs.find((c) => c.slug === clubSlug)?.id}
        />
      ) : null}
    </LoadGate>
  );
}

export default function NewEventPage() {
  useAppPreferences();
  return (
    <Page maxWidth={576}>
      <Stack.Screen options={{ title: t('Tạo kèo') }} />
      <RequireLogin reason={t('Đăng nhập để tạo kèo.')}>
        <Title>{t('Tạo kèo')}</Title>
        <NewEvent />
      </RequireLogin>
    </Page>
  );
}
