import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { ScoreSheet } from '../../score/score-sheet';
import { scoreTemplates } from '../../score/templates';

export default function ScoreScreen() {
  useAppPreferences();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const template = slug ? scoreTemplates[slug] : undefined;

  if (!template) {
    return (
      <View style={{ padding: 24 }}>
        <Text>{t('Chưa có mẫu chấm điểm cho game này.')}</Text>
      </View>
    );
  }
  return (
    <>
      <Stack.Screen options={{ title: template.name }} />
      <ScoreSheet
        key={template.slug}
        template={template}
        players={[]}
        localPlayers
        actorId="local"
      />
    </>
  );
}
