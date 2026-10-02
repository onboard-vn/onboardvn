import { marked, type Token, type Tokens } from 'marked';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space } from '../../ui/theme';
import { openUrl } from './text';

function Inline({ tokens }: { tokens: Token[] | undefined }) {
  return (
    <>
      {(tokens ?? []).map((t, i) => {
        switch (t.type) {
          case 'strong':
            return (
              <Text key={i} style={styles.bold}>
                <Inline tokens={(t as Tokens.Strong).tokens} />
              </Text>
            );
          case 'em':
            return (
              <Text key={i} style={styles.italic}>
                <Inline tokens={(t as Tokens.Em).tokens} />
              </Text>
            );
          case 'codespan':
            return (
              <Text key={i} style={styles.code}>
                {(t as Tokens.Codespan).text}
              </Text>
            );
          case 'link': {
            const link = t as Tokens.Link;
            return (
              <Text
                key={i}
                accessibilityRole="link"
                style={styles.link}
                onPress={() => openUrl(link.href)}
              >
                <Inline tokens={link.tokens} />
              </Text>
            );
          }
          case 'br':
            return <Text key={i}>{'\n'}</Text>;
          default: {
            const nested = (t as { tokens?: Token[] }).tokens;
            if (nested) return <Inline key={i} tokens={nested} />;
            return <Text key={i}>{(t as { text?: string }).text ?? t.raw}</Text>;
          }
        }
      })}
    </>
  );
}

function Block({ token }: { token: Token }) {
  switch (token.type) {
    case 'heading': {
      const h = token as Tokens.Heading;
      return (
        <Text
          accessibilityRole="header"
          style={h.depth === 1 ? styles.h1 : h.depth === 2 ? styles.h2 : styles.h3}
        >
          <Inline tokens={h.tokens} />
        </Text>
      );
    }
    case 'paragraph':
      return (
        <Text style={styles.p}>
          <Inline tokens={(token as Tokens.Paragraph).tokens} />
        </Text>
      );
    case 'list': {
      const list = token as Tokens.List;
      return (
        <View style={styles.list}>
          {list.items.map((item, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.p}>{list.ordered ? `${Number(list.start || 1) + i}.` : '•'}</Text>
              <Text style={[styles.p, styles.itemText]}>
                <Inline
                  tokens={item.tokens.flatMap((c) => (c as { tokens?: Token[] }).tokens ?? [c])}
                />
              </Text>
            </View>
          ))}
        </View>
      );
    }
    default:
      return null;
  }
}

export function Markdown({ source }: { source: string }) {
  const tokens = marked.lexer(source);
  return (
    <View style={styles.root}>
      {tokens.map((t, i) => (
        <Block key={i} token={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  h1: { fontSize: 24, fontWeight: '700', color: colors.text },
  h2: { fontSize: 19, fontWeight: '600', color: colors.text, marginTop: space.md },
  h3: { fontSize: 16, fontWeight: '600', color: colors.text },
  p: { fontSize: 15, lineHeight: 22, color: colors.text },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  code: { fontFamily: 'monospace', fontSize: 13, backgroundColor: colors.surfaceMuted },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  list: { gap: space.xs, paddingLeft: space.sm },
  item: { flexDirection: 'row', gap: space.sm },
  itemText: { flex: 1 },
});
