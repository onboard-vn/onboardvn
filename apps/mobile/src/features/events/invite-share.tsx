import { useState } from 'react';
import { Linking, Platform, Share, StyleSheet, Text } from 'react-native';
import { themeStyles, colors } from '../../ui/theme';
import { Box, Btn, Row } from './ui';
import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';

export function InviteShare({ inviteUrl, title }: { inviteUrl: string; title: string }) {
  useAppPreferences();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (Platform.OS === 'web' && navigator.clipboard) {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    await Share.share({ message: inviteUrl });
  }

  async function share() {
    if (Platform.OS === 'web' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: inviteUrl });
        return;
      } catch {
        // cancelled or unsupported: fall through to Zalo
      }
    } else if (Platform.OS !== 'web') {
      try {
        await Share.share({ message: inviteUrl, title });
        return;
      } catch {
        // fall through to Zalo
      }
    }
    void Linking.openURL(`https://zalo.me/share?u=${encodeURIComponent(inviteUrl)}`);
  }

  return (
    <Box>
      <Text style={styles.heading}>{t('Link mời (chỉ hiện một lần, hãy lưu lại)')}</Text>
      <Text selectable style={styles.code}>
        {inviteUrl}
      </Text>
      <Row>
        <Btn
          small
          variant="outline"
          label={copied ? t('Đã sao chép') : t('Sao chép link')}
          onPress={() => void copy()}
        />
        <Btn small label={t('Chia sẻ qua Zalo')} onPress={() => void share()} />
      </Row>
    </Box>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    heading: { fontSize: 14, fontWeight: '600', color: colors.text },
    code: {
      fontSize: 12,
      color: colors.text,
      backgroundColor: colors.bg,
      padding: 8,
      borderRadius: 6,
    },
  }),
);
