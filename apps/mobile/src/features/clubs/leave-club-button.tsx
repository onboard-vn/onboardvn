import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { api } from '../../api/client';
import { Btn, FormError, confirmAsync, href, useAction } from '../events/ui';

export function LeaveClubButton({ clubId }: { clubId: string }) {
  const router = useRouter();
  const { pending, error, run } = useAction();

  async function onLeave() {
    if (!(await confirmAsync('Rời club này?'))) return;
    const ok = await run(
      () => api(`/clubs/${clubId}/members/me`, { method: 'DELETE' }),
      'Không rời được, thử lại sau',
    );
    if (ok) router.replace(href('/clubs'));
  }

  return (
    <View style={{ gap: 4 }}>
      <Btn
        small
        variant="danger"
        disabled={pending}
        label="Rời club"
        onPress={() => void onLeave()}
      />
      <FormError message={error} />
    </View>
  );
}
