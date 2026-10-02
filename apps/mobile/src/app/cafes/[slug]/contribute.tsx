import type { CafePublicDetailDto } from '@onboard/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { api } from '../../../api/client';
import { RequireLogin } from '../../../auth/require-login';
import { ScanSession } from '../../../features/scan/scan-session';
import { PageShell } from '../../../features/static/page-shell';
import { H1, P } from '../../../features/static/text';
import { useFetch } from '../../../features/use-fetch';
import { Button, Hint } from '../../../ui/primitives';

function Contribute({ slug }: { slug: string }) {
  const load = useCallback(
    (signal: AbortSignal) =>
      api<CafePublicDetailDto>(`/cafes/${encodeURIComponent(slug)}`, { signal }),
    [slug],
  );
  const { data: cafe, loading, error, status, reload } = useFetch(load);

  if (!cafe) {
    return loading ? (
      <ActivityIndicator />
    ) : status === 404 ? (
      <Hint>Không tìm thấy địa điểm.</Hint>
    ) : (
      <View style={{ gap: 12 }}>
        <Hint>{error}</Hint>
        <Button label="Thử lại" tone="ghost" onPress={reload} />
      </View>
    );
  }
  return (
    <>
      <H1>Đóng góp game · {cafe.name}</H1>
      <P muted>
        Quét mã vạch hoặc tìm game trong danh mục để đóng góp vào kho của quán này. Chủ quán/staff
        có thể xác nhận hoặc gỡ đóng góp của bạn.
      </P>
      <ScanSession cafes={[{ id: cafe.id, name: cafe.name }]} lookup="local" mode="community" />
    </>
  );
}

export default function ContributeToCafe() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <PageShell maxWidth={768} footer={false}>
      <Stack.Screen options={{ title: 'Đóng góp game' }} />
      <RequireLogin reason="Đăng nhập để đóng góp game cho quán.">
        <Contribute slug={slug ?? ''} />
      </RequireLogin>
    </PageShell>
  );
}
