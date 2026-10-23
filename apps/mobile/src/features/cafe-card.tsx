import type { CafePublicSummaryDto } from '@onboard/shared';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Card, Heading, Hint } from '../ui/primitives';
import { themeStyles, colors } from '../ui/theme';
import { VENUE_TYPE_LABELS, openStatusLabel } from './cafes/labels';
import { useAppPreferences } from '../ui/preferences';
import { t } from '../ui/i18n';

export function CafeCard({ cafe }: { cafe: CafePublicSummaryDto }) {
  useAppPreferences();
  const status = openStatusLabel(cafe.openStatus);
  return (
    <Link href={{ pathname: '/cafes/[slug]', params: { slug: cafe.slug } }} asChild>
      <Pressable accessibilityRole="button">
        <Card>
          <Heading>{cafe.name}</Heading>
          <Hint>{t(VENUE_TYPE_LABELS[cafe.venueType])}</Hint>
          <Text style={styles.text}>
            {cafe.wardName}, {cafe.provinceName}
          </Text>
          <Hint>{cafe.addressLine}</Hint>
          <Text style={styles.text}>{cafe.gameCount} game</Text>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </Card>
      </Pressable>
    </Link>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    text: { color: colors.text },
    status: { color: colors.success, fontWeight: '600', fontSize: 13 },
  }),
);
