import { t, localizedContent } from '../ui/i18n';
import { useAppPreferences } from '../ui/preferences';
import { Stack } from 'expo-router';
import { Markdown } from '../features/static/markdown';
import { PageShell } from '../features/static/page-shell';
import { REFERENCES_MARKDOWN } from '../features/static/references';
import { SITE_NAME } from '../features/static/site';

export default function Credits() {
  useAppPreferences();
  return (
    <PageShell maxWidth={768}>
      <Stack.Screen options={{ title: `${t('Nguồn tham khảo')} · ${SITE_NAME}` }} />
      <Markdown source={localizedContent(REFERENCES_MARKDOWN)} />
    </PageShell>
  );
}
