import type { CategoryDto, CategoryKind } from '@onboard/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../../api/client';
import { Button, Segmented } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import { ErrorText, Field } from './ui';

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: 'category', label: 'Thể loại' },
  { value: 'mechanic', label: 'Cơ chế' },
];

export function CategoryForm({ initial }: { initial?: CategoryDto }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [nameVi, setNameVi] = useState(initial?.nameVi ?? '');
  const [kind, setKind] = useState<CategoryKind>(initial?.kind ?? 'category');
  const [bggId, setBggId] = useState(initial?.bggId?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    if (!name.trim()) {
      setError('Nhập tên tiếng Anh');
      return;
    }
    setPending(true);
    setError(null);
    const body = {
      name: name.trim(),
      nameVi: nameVi.trim() || undefined,
      kind,
      bggId: bggId.trim() ? Number(bggId.trim()) : undefined,
    };
    try {
      if (initial) await api(`/categories/${initial.id}`, { method: 'PATCH', body });
      else await api('/categories', { method: 'POST', body });
      router.replace('/admin/categories');
    } catch (e) {
      setError(errorMessage(e, 'Có lỗi xảy ra, thử lại sau'));
      setPending(false);
    }
  }

  return (
    <View style={{ gap: space.lg }}>
      <Field label="Tên tiếng Anh *" value={name} onChangeText={setName} />
      <Field label="Tên tiếng Việt" value={nameVi} onChangeText={setNameVi} />
      <View style={{ gap: space.xs }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted }}>Loại</Text>
        <Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} />
      </View>
      <Field label="BGG ID" keyboardType="number-pad" value={bggId} onChangeText={setBggId} />
      <ErrorText message={error} />
      <Button
        label={initial ? 'Lưu thay đổi' : 'Tạo thể loại'}
        disabled={pending}
        onPress={() => void onSubmit()}
      />
    </View>
  );
}
