import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { formatVnDateTime } from '../features/events/time';
import { Body, Btn, FormError, Muted } from '../features/events/ui';
import { themeStyles, colors, radius, space } from '../ui/theme';
import { safeClubLiveExternalUrl } from './club-live-utils';
import { t } from '../ui/i18n';
import { useAppPreferences } from '../ui/preferences';


export function ClubLiveScreenState({
  loading,
  error,
  status,
  hasData,
  onRefresh,
  children,
}: {
  loading: boolean;
  error: string | null;
  status: number | null;
  hasData: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  useAppPreferences();
  if (!hasData) {
    if (loading) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Muted>{t("Đang tải dữ liệu…")}</Muted>
        </View>
      );
    }

    if (status === 404) return <Muted>{t("Không tìm thấy")}</Muted>;

    return (
      <View style={{ gap: space.md }}>
        <FormError message={error ?? 'Không thể tải dữ liệu club.'} />
        <Btn label={t("Thử lại")} onPress={onRefresh} variant="outline" />
      </View>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <Btn
        label={loading ? t("Đang cập nhật…") : t("Làm mới")}
        onPress={onRefresh}
        disabled={loading}
        variant="outline"
      />
      {children}
    </View>
  );
}

export function ClubLiveStaleBanner({
  stale,
  lastSuccessAt,
}: {
  stale: boolean;
  lastSuccessAt: string | null;
}) {
  useAppPreferences();
  if (!stale) return null;

  return (
    <View style={styles.staleBanner}>
      <Text style={styles.staleText}>
        {t("Dữ liệu cũ — cập nhật lần cuối")}{' '}
        {lastSuccessAt ? formatVnDateTime(lastSuccessAt) : t("chưa xác định")}
      </Text>
    </View>
  );
}

export function ClubLiveExternalLink({ url }: { url: string | null }) {
  useAppPreferences();
  const [error, setError] = useState(false);
  const safeUrl = safeClubLiveExternalUrl(url);
  if (!safeUrl) return null;

  return (
    <View style={{ gap: space.xs }}>
      <Btn
        label={t("Mở bên app CLB")}
        onPress={() => {
          setError(false);
          void Linking.openURL(safeUrl).catch(() => setError(true));
        }}
        variant="outline"
      />
      {error ? <Body>{t("Không mở được app CLB.")}</Body> : null}
    </View>
  );
}

const styles = themeStyles(() => StyleSheet.create({
  loading: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  staleBanner: {
    backgroundColor: colors.warnSoft,
    borderRadius: radius,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  staleText: { color: colors.warn, fontSize: 13, lineHeight: 20 },
}));
