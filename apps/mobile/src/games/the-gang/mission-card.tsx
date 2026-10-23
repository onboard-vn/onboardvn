import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, themeStyles } from '../../ui/theme';
import { gangCards, type CardKind, type Lang } from './cards';
import { useAppPreferences } from '../../ui/preferences';
import { t } from '../../ui/i18n';

export const kindStyle: Record<CardKind, { color: string; label: Record<Lang, string> }> = {
  challenge: { color: '#c8242b', label: { vi: 'Thử thách', en: 'Challenge' } },
  specialist: { color: '#13808a', label: { vi: 'Chuyên gia', en: 'Specialist' } },
  hbBad: { color: '#b8322a', label: { vi: 'Bất lợi · HB', en: 'Detrimental · HB' } },
  hbGood: { color: '#2f8f3a', label: { vi: 'Lợi thế · HB', en: 'Beneficial · HB' } },
};

function RichText({ html, style }: { html: string; style: object }) {
  useAppPreferences();
  const lines = html.split(/<br\s*\/?>/i);
  return (
    <>
      {lines.map((line, i) => (
        <Text key={i} style={style}>
          {line.split(/(<b>.*?<\/b>)/g).map((part, k) =>
            part.startsWith('<b>') ? (
              <Text key={k} style={styles.bold}>
                {part.slice(3, -4)}
              </Text>
            ) : (
              part
            ),
          )}
        </Text>
      ))}
    </>
  );
}

export function MissionCard({
  code,
  permanent,
  onDiscard,
}: {
  code: string;
  permanent?: boolean;
  onDiscard?: () => void;
}) {
  const { language } = useAppPreferences();
  const card = gangCards[code];
  if (!card) return null;
  const k = kindStyle[card.kind];
  return (
    <View style={[styles.card, { borderColor: k.color }]}>
      <View style={[styles.head, { backgroundColor: k.color }]}>
        <Text style={styles.code}>{card.code}</Text>
        <Text style={styles.kind}>{k.label[language]}</Text>
        {permanent ? (
          <Text style={styles.tag}>{language === 'vi' ? 'Cả ván' : 'Whole game'}</Text>
        ) : null}
        {card.difficulty != null ? (
          <Text style={styles.tag}>
            {card.difficulty > 0 ? '+' : ''}
            {card.difficulty}
          </Text>
        ) : null}
        {onDiscard ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Bỏ thẻ')}
            onPress={onDiscard}
            hitSlop={8}
          >
            <Text style={styles.close}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{card.title[language]}</Text>
        <RichText html={card.text[language]} style={styles.text} />
        {card.credit ? <Text style={styles.sub}>{card.credit}</Text> : null}
      </View>
    </View>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    card: {
      borderWidth: 2,
      borderRadius: radius,
      overflow: 'hidden',
      backgroundColor: colors.card,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingHorizontal: space.md,
      paddingVertical: 8,
    },
    code: {
      backgroundColor: colors.surfaceMuted,
      color: colors.text,
      fontWeight: '800',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 1,
      overflow: 'hidden',
    },
    kind: {
      color: '#fff',
      fontWeight: '700',
      letterSpacing: 0.5,
      flex: 1,
      textTransform: 'uppercase',
    },
    tag: {
      color: '#fff',
      fontWeight: '700',
      backgroundColor: 'rgba(0,0,0,.25)',
      borderRadius: 6,
      paddingHorizontal: 6,
      overflow: 'hidden',
    },
    close: { color: '#fff', fontSize: 18, fontWeight: '700', paddingLeft: 4 },
    body: { padding: space.lg, gap: 6 },
    sub: { fontSize: 12, color: colors.muted, fontStyle: 'italic' },
    title: { fontSize: 20, fontWeight: '800', color: colors.text, textTransform: 'uppercase' },
    text: { fontSize: 16, lineHeight: 23, color: colors.text, marginTop: 4 },
    bold: { fontWeight: '800' },
  }),
);
