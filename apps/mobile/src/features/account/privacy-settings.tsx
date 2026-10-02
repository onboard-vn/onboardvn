import type { PrivacyLevel, ProvinceListResponse } from '@onboard/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Button, Card, Chip, Heading, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { Select } from '../events/select';
import { FormError, Note } from '../auth/auth-ui';
import { LEVELS, LEVEL_LABEL, type PrivacyValues } from './privacy-types';

function LevelRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PrivacyLevel;
  onChange: (v: PrivacyLevel) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {LEVELS.map((l) => (
          <Chip key={l} label={LEVEL_LABEL[l]} selected={l === value} onPress={() => onChange(l)} />
        ))}
      </View>
    </View>
  );
}

export function PrivacySettings({ initial }: { initial: PrivacyValues }) {
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [provinces, setProvinces] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    let live = true;
    api<ProvinceListResponse>('/locations/provinces')
      .then((r) => live && setProvinces(r.items.map((p) => ({ value: p.code, label: p.name }))))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const set = <K extends keyof PrivacyValues>(key: K, v: PrivacyValues[K]) => {
    setValues((s) => ({ ...s, [key]: v }));
    setSaved(false);
  };

  const onSubmit = async () => {
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await api('/me/privacy', { method: 'PATCH', body: values });
      setSaved(true);
    } catch {
      setError('Không lưu được cài đặt, thử lại sau');
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <Heading>Riêng tư</Heading>
      <Hint>Kiểm soát ai xem được hồ sơ, ván chơi và danh sách bạn bè.</Hint>
      <LevelRow
        label="Hồ sơ & tủ game"
        value={values.profileVisibility}
        onChange={(v) => set('profileVisibility', v)}
      />
      <LevelRow
        label="Ván chơi & thống kê"
        value={values.playsVisibility}
        onChange={(v) => set('playsVisibility', v)}
      />
      <LevelRow
        label="Danh sách bạn bè"
        value={values.friendsVisibility}
        onChange={(v) => set('friendsVisibility', v)}
      />
      <View style={[styles.switchRow]}>
        <Text style={[styles.label, styles.flex]}>Email khi có lời mời kết bạn mới</Text>
        <Switch
          accessibilityLabel="Email khi có lời mời kết bạn mới"
          value={values.emailOnFriendRequest}
          onValueChange={(v) => set('emailOnFriendRequest', v)}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={[styles.label, styles.flex]}>Cho thành viên club rút từ tủ game của tôi</Text>
        <Switch
          accessibilityLabel="Cho thành viên club rút từ tủ game của tôi"
          value={values.clubShelfSuggest}
          onValueChange={(v) => set('clubShelfSuggest', v)}
        />
      </View>
      <Select
        label="Tỉnh/thành của bạn"
        value={values.provinceCode ?? ''}
        options={provinces}
        placeholder="Chưa chọn"
        onChange={(v) => set('provinceCode', v || null)}
      />
      <Hint>
        Dùng cho nguồn &quot;Cùng thành phố&quot; khi rút thẻ; chỉ tính khi hồ sơ công khai.
      </Hint>
      <Button label="Lưu cài đặt" disabled={pending} onPress={() => void onSubmit()} />
      <FormError message={error} />
      {saved ? <Note>Đã lưu.</Note> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  flex: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.md,
  },
});
