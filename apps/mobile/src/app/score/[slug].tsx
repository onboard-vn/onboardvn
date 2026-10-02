import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { ScoreSheet } from '../../score/score-sheet';
import { scoreTemplates } from '../../score/templates';

export default function ScoreScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const template = slug ? scoreTemplates[slug] : undefined;

  if (!template) {
    return (
      <View style={{ padding: 24 }}>
        <Text>Chưa có mẫu chấm điểm cho game này.</Text>
      </View>
    );
  }
  return (
    <>
      <Stack.Screen options={{ title: template.name }} />
      <ScoreSheet key={template.slug} template={template} />
    </>
  );
}
