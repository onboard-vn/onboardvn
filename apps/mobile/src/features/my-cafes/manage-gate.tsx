import { t, translateKnown } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import { themeStyles, space } from '../../ui/theme';
import type { CafeOwnerDto } from '@onboard/shared';
import { useCallback, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../api/client';
import { RequireLogin } from '../../auth/require-login';
import { Button, Hint } from '../../ui/primitives';

import { PageShell } from '../static/page-shell';
import { useFetch } from '../use-fetch';

type Render = (cafe: CafeOwnerDto, reload: () => void) => ReactNode;

export function ManageGate({
  id,
  maxWidth = 720,
  children,
}: {
  id: string;
  maxWidth?: number;
  children: Render;
}) {
  useAppPreferences();
  return (
    <RequireLogin reason={t('Đăng nhập để quản lý địa điểm chơi.')}>
      <Inner id={id} maxWidth={maxWidth}>
        {children}
      </Inner>
    </RequireLogin>
  );
}

function Inner({ id, maxWidth, children }: { id: string; maxWidth: number; children: Render }) {
  useAppPreferences();
  const load = useCallback(
    (signal: AbortSignal) =>
      api<CafeOwnerDto>(`/cafes/${encodeURIComponent(id)}/manage`, { signal }),
    [id],
  );
  const { data: cafe, error, status, loading, reload } = useFetch(load);

  if (!cafe) {
    return (
      <PageShell maxWidth={maxWidth}>
        {loading ? (
          <ActivityIndicator />
        ) : status === 404 || status === 422 ? (
          <Hint>{t('Không tìm thấy địa điểm.')}</Hint>
        ) : status === 403 ? (
          <Hint>{t('Bạn không có quyền quản lý quán này.')}</Hint>
        ) : (
          <View style={styles.stack}>
            <Hint>{translateKnown(error ?? '')}</Hint>
            <Button label={t('Thử lại')} tone="ghost" onPress={reload} />
          </View>
        )}
      </PageShell>
    );
  }
  return <PageShell maxWidth={maxWidth}>{children(cafe, reload)}</PageShell>;
}

const styles = themeStyles(() => StyleSheet.create({ stack: { gap: space.md } }));
