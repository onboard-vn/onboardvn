import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, space } from '../../ui/theme';
import { gangCards, type CardKind, type Lang } from './cards';

export const kindStyle: Record<CardKind, { color: string; label: Record<Lang, string> }> = {
  challenge: { color: '#c8242b', label: { vi: 'Thử thách', en: 'Challenge' } },
  specialist: { color: '#13808a', label: { vi: 'Chuyên gia', en: 'Specialist' } },
  hbBad: { color: '#b8322a', label: { vi: 'Bất lợi · HB', en: 'Detrimental · HB' } },
  hbGood: { color: '#2f8f3a', label: { vi: 'Lợi thế · HB', en: 'Beneficial · HB' } },
};

function RichText({ html, style }: { html: string; style: object }) {
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
  lang,
  permanent,
  onDiscard,
}: {
  code: string;
  lang: Lang;
  permanent?: boolean;
  onDiscard?: () => void;
}) {
  const card = gangCards[code];
  if (!card) return null;
  const k = kindStyle[card.kind];
  const other: Lang = lang === 'vi' ? 'en' : 'vi';
  return (
    <View style={[styles.card, { borderColor: k.color }]}>
      <View style={[styles.head, { backgroundColor: k.color }]}>
        <Text style={styles.code}>{card.code}</Text>
        <Text style={styles.kind}>{k.label[lang]}</Text>
        {permanent ? (
          <Text style={styles.tag}>{lang === 'vi' ? 'Cả ván' : 'Whole game'}</Text>
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
            accessibilityLabel="Bỏ thẻ"
            onPress={onDiscard}
            hitSlop={8}
          >
            <Text style={styles.close}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: k.color }]}>{card.title[lang]}</Text>
        <Text style={styles.sub}>{card.title[other]}</Text>
        <RichText html={card.text[lang]} style={styles.text} />
        {card.credit ? <Text style={styles.sub}>{card.credit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderRadius: radius, overflow: 'hidden', backgroundColor: '#fbf8f2' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: 8,
  },
  code: {
    backgroundColor: '#fff',
    color: '#222',
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
  title: { fontSize: 20, fontWeight: '800', textTransform: 'uppercase' },
  sub: { fontSize: 12, color: '#8a7f72', fontStyle: 'italic' },
  text: { fontSize: 16, lineHeight: 23, color: '#222', marginTop: 4 },
  bold: { fontWeight: '800' },
});
