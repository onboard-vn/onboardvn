import type { ClubCreateResponse } from '@onboard/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api/client';
import { space } from '../../ui/theme';
import { InviteShare } from '../events/invite-share';
import { Body, Btn, FormError, LinkBtn, Muted, TextField, useAction } from '../events/ui';

export function ClubCreateForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [created, setCreated] = useState<ClubCreateResponse | null>(null);
  const { pending, error, setError, run } = useAction();

  async function onSubmit() {
    if (name.trim().length < 2) {
      setError('Tên club cần ít nhất 2 ký tự');
      return;
    }
    await run(async () => {
      setCreated(
        await api<ClubCreateResponse>('/clubs', {
          method: 'POST',
          body: { name, description: description.trim() || undefined },
        }),
      );
    }, 'Tạo club thất bại, kiểm tra lại thông tin');
  }

  if (created) {
    return (
      <View style={{ gap: space.lg }}>
        <Body bold>Đã tạo club &quot;{created.club.name}&quot;.</Body>
        <InviteShare inviteUrl={created.inviteUrl} title={created.club.name} />
        <LinkBtn label="Vào club" to={`/clubs/${created.club.slug}`} />
      </View>
    );
  }

  return (
    <View style={{ gap: space.lg }}>
      <TextField label="Tên club" maxLength={80} value={name} onChangeText={setName} />
      <TextField
        label="Mô tả (tùy chọn)"
        multiline
        maxLength={1000}
        value={description}
        onChangeText={setDescription}
      />
      <Muted small>
        Club ở chế độ riêng tư: người ngoài chỉ thấy tên và số thành viên, tham gia bằng link mời.
      </Muted>
      <FormError message={error} />
      <Btn disabled={pending} label="Tạo club" onPress={() => void onSubmit()} />
    </View>
  );
}
