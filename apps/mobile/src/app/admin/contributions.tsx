import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import type { AdminContributionListResponse } from '@onboard/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../../api/client';
import { normalizeFilterParam } from '../../features/admin/filter-param';
import { formatVnDateTime } from '../../features/admin/format';
import {
  ActionButton,
  AdminPage,
  ErrorText,
  Field,
  ListCard,
  LoadState,
  Row,
  Section,
} from '../../features/admin/ui';
import { Button, Hint } from '../../ui/primitives';
import { themeStyles, colors, space } from '../../ui/theme';
import { useLoad } from '../../ui/use-load';

type Result = (AdminContributionListResponse & { invalid?: false }) | { invalid: true };

async function loadContributions(userId?: string, cafeId?: string): Promise<Result> {
  try {
    return await api<AdminContributionListResponse>('/admin/contributions', {
      query: { userId, cafeId, pageSize: 100 },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) return { invalid: true };
    throw e;
  }
}

export default function AdminContributionsPage() {
  useAppPreferences();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string | string[]; cafeId?: string | string[] }>();
  const userId = normalizeFilterParam(params.userId);
  const cafeId = normalizeFilterParam(params.cafeId);
  const [userInput, setUserInput] = useState(userId ?? '');
  const [cafeInput, setCafeInput] = useState(cafeId ?? '');
  const list = useLoad(() => loadContributions(userId, cafeId), [userId, cafeId]);
  const data = list.data;
  const invalid = data !== undefined && 'invalid' in data && data.invalid === true;
  const items = data && !invalid ? (data as AdminContributionListResponse).items : [];
  const total = data && !invalid ? (data as AdminContributionListResponse).total : 0;

  const seenUsers = new Map<string, string>();
  for (const item of items) {
    if (item.userId) seenUsers.set(item.userId, item.userName ?? item.userId);
  }

  const act = (path: string, method: 'POST' | 'DELETE') => async () => {
    await api(path, { method });
    list.reload();
  };

  return (
    <AdminPage
      title={data ? t('Đóng góp cộng đồng ({count})', { count: total }) : t('Đóng góp cộng đồng')}
      access="admin"
    >
      <Section title={t('Lọc')}>
        <Field label={t('User ID')} value={userInput} onChangeText={setUserInput} />
        <Field label={t('Café ID')} value={cafeInput} onChangeText={setCafeInput} />
        <Button
          label={t('Lọc')}
          onPress={() =>
            router.replace({
              pathname: '/admin/contributions',
              params: {
                ...(userInput.trim() ? { userId: userInput.trim() } : {}),
                ...(cafeInput.trim() ? { cafeId: cafeInput.trim() } : {}),
              },
            })
          }
        />
      </Section>

      <LoadState loading={list.loading && !data} error={list.error} onRetry={list.reload} />
      {invalid ? <ErrorText message={t('Bộ lọc không hợp lệ')} /> : null}

      {seenUsers.size > 0 ? (
        <Section title={t('Thao tác theo người đóng góp')}>
          {[...seenUsers.entries()].map(([id, name]) => (
            <View key={id} style={styles.user}>
              <Text style={styles.name}>
                {name} <Text style={styles.muted}>({id})</Text>
              </Text>
              <View style={styles.actions}>
                <ActionButton
                  label={t('Chặn đóng góp')}
                  failure={t('Không chặn được đóng góp')}
                  confirmText={t('Chặn đóng góp cộng đồng của "{name}"?', { name })}
                  run={act(`/admin/users/${encodeURIComponent(id)}/contribution-block`, 'POST')}
                />
                <ActionButton
                  label={t('Bỏ chặn')}
                  failure={t('Không bỏ chặn được đóng góp')}
                  run={act(`/admin/users/${encodeURIComponent(id)}/contribution-block`, 'DELETE')}
                />
                <ActionButton
                  danger
                  label={t('Gỡ toàn bộ đóng góp')}
                  failure={t('Không gỡ được đóng góp')}
                  confirmText={t('Gỡ toàn bộ đóng góp của "{name}"? Không thể hoàn tác.', { name })}
                  run={act(`/admin/users/${encodeURIComponent(id)}/community-games`, 'DELETE')}
                />
              </View>
            </View>
          ))}
        </Section>
      ) : null}

      {data && !invalid ? (
        items.length > 0 ? (
          <ListCard>
            {items.map((item) => (
              <Row
                key={item.id}
                title={item.gameNameEn}
                subtitle={`${item.cafeName} · ${item.userName ?? t('Không rõ người dùng')} · ${formatVnDateTime(item.createdAt)}`}
              />
            ))}
          </ListCard>
        ) : (
          <Hint>{t('Chưa có đóng góp nào khớp bộ lọc.')}</Hint>
        )
      ) : null}
    </AdminPage>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    user: { gap: space.sm },
    name: { fontSize: 15, color: colors.text },
    muted: { fontSize: 12, color: colors.muted },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  }),
);
