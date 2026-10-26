import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScoreTemplate } from '@onboard/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { uuid } from '../api/uuid';
import { Button, Hint } from '../ui/primitives';
import { useAppPreferences } from '../ui/preferences';
import type { SheetState } from './model';
import { ScoreSheet } from './score-sheet';
import {
  createStandaloneSaver,
  loadStandaloneDraft,
  newStandaloneDraft,
  type DraftSaveStatus,
  type StandaloneDraft,
} from './standalone-draft';

export const hasStandaloneDraft = (slug: string) =>
  slug === 'applejack-2022' || slug === 'harmonies';

export function StandaloneScoreSession({ template }: { template: ScoreTemplate }) {
  const { language } = useAppPreferences();
  const text = (vi: string, en: string) => (language === 'en' ? en : vi);
  const [loaded, setLoaded] = useState<{ draft: StandaloneDraft; restored: boolean } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void loadStandaloneDraft(AsyncStorage, template).then(
      (draft) =>
        live &&
        setLoaded({
          draft: draft ?? newStandaloneDraft(template, uuid()),
          restored: !!draft,
        }),
      () => live && setLoadError(true),
    );
    return () => {
      live = false;
    };
  }, [template, attempt]);

  if (!loaded)
    return (
      <View style={{ padding: 20, gap: 12 }}>
        {loadError ? (
          <>
            <Hint>
              {text(
                'Không đọc được bản nháp trên thiết bị này. Bạn có thể thử lại hoặc bắt đầu bản nháp mới.',
                'Could not read the draft on this device. Retry or start a new draft.',
              )}
            </Hint>
            <Button
              label={text('Thử tải lại', 'Retry loading')}
              onPress={() => {
                setLoadError(false);
                setAttempt((n) => n + 1);
              }}
            />
            <Button
              tone="ghost"
              label={text('Bắt đầu bản nháp mới', 'Start a new draft')}
              onPress={() =>
                setLoaded({ draft: newStandaloneDraft(template, uuid()), restored: false })
              }
            />
          </>
        ) : (
          <ActivityIndicator accessibilityLabel={text('Đang khôi phục nháp', 'Restoring draft')} />
        )}
      </View>
    );
  return <PersistedSheet key={loaded.draft.sessionId} template={template} {...loaded} />;
}

function PersistedSheet({
  template,
  draft,
  restored,
}: {
  template: ScoreTemplate;
  draft: StandaloneDraft;
  restored: boolean;
}) {
  const { language } = useAppPreferences();
  const text = (vi: string, en: string) => (language === 'en' ? en : vi);
  const [status, setStatus] = useState<DraftSaveStatus>('saving');
  const current = useRef(draft.state);
  const saver = useMemo(() => createStandaloneSaver(AsyncStorage, draft, setStatus), [draft]);
  const onStateChange = useCallback(
    (state: SheetState) => {
      current.current = state;
      saver.save(state);
    },
    [saver],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 6 }}>
        <Hint>
          {text(
            'Bản tính trên thiết bị này; tự lưu nháp sau mỗi thay đổi.',
            'Calculator on this device; drafts save automatically after each change.',
          )}
        </Hint>
        <Hint>
          {status === 'saved'
            ? text('Đã lưu nháp trên thiết bị.', 'Draft saved on this device.')
            : status === 'error'
              ? text(
                  'Không lưu được nháp. Điểm vẫn còn trên màn hình; hãy thử lưu lại trước khi đóng trang.',
                  'Could not save the draft. Your scores remain on screen; retry before closing this page.',
                )
              : text('Đang lưu nháp…', 'Saving draft…')}
        </Hint>
        {status === 'error' ? (
          <Button
            label={text('Thử lưu lại', 'Retry saving')}
            onPress={() => saver.save(current.current)}
          />
        ) : null}
      </View>
      <ScoreSheet
        template={template}
        players={[]}
        localPlayers
        detailedOnly
        actorId="local"
        saved={draft.state}
        restoredFromDraft={restored}
        onStateChange={onStateChange}
      />
    </View>
  );
}
