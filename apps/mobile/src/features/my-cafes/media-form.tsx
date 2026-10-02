import { CAFE_PHOTO_MAX_COUNT, type CafePhotoDto } from '@onboard/shared';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Button, Card, Heading, Hint } from '../../ui/primitives';
import { colors, radius, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import { mediaUrl } from '../media';
import { FilePick } from './file-pick';
import { FormError } from './form-bits';
import { apiBody } from './request';

type MediaSlot = 'logo' | 'cover' | 'photos';

export function MediaForm({
  cafeId,
  logoUrl,
  coverUrl,
  photos,
  onChanged,
}: {
  cafeId: string;
  logoUrl: string | null | undefined;
  coverUrl: string | null | undefined;
  photos: CafePhotoDto[];
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const base = `/cafes/${encodeURIComponent(cafeId)}`;

  const run = async (fallback: string, action: () => Promise<unknown>) => {
    setPending(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (e) {
      setError(errorMessage(e, fallback));
    } finally {
      setPending(false);
    }
  };

  const upload = (slot: MediaSlot, file: File) =>
    run('Không tải được ảnh lên', () => {
      const form = new FormData();
      form.set('file', file);
      return apiBody(`${base}/${slot}`, { method: 'POST', body: form });
    });

  const removeMedia = (slot: 'logo' | 'cover') =>
    run('Không xóa được ảnh', () => api(`${base}/${slot}`, { method: 'DELETE' }));

  const deletePhoto = (photoId: string) =>
    run('Không xóa được ảnh', () => api(`${base}/photos/${photoId}`, { method: 'DELETE' }));

  const movePhoto = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const ids = photos.map((p) => p.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    void run('Không sắp xếp được ảnh', () =>
      api(`${base}/photos/reorder`, { method: 'PATCH', body: { photoIds: ids } }),
    );
  };

  const logo = mediaUrl(logoUrl);
  const cover = mediaUrl(coverUrl);

  return (
    <Card>
      <Heading>Ảnh quán</Heading>

      <View style={styles.slots}>
        <View style={styles.slot}>
          <Text style={styles.label}>Logo</Text>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logo} accessibilityLabel="Logo quán" />
          ) : (
            <Hint>Chưa có logo.</Hint>
          )}
          <FilePick
            accept="image/png,image/jpeg,image/webp"
            label="Tải logo"
            disabled={pending}
            onFile={(f) => void upload('logo', f)}
          />
          {logo ? (
            <Button
              label="Xóa logo"
              tone="ghost"
              disabled={pending}
              onPress={() => void removeMedia('logo')}
            />
          ) : null}
        </View>

        <View style={styles.slot}>
          <Text style={styles.label}>Ảnh bìa</Text>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.cover} accessibilityLabel="Ảnh bìa quán" />
          ) : (
            <Hint>Chưa có ảnh bìa.</Hint>
          )}
          <FilePick
            accept="image/png,image/jpeg,image/webp"
            label="Tải ảnh bìa"
            disabled={pending}
            onFile={(f) => void upload('cover', f)}
          />
          {cover ? (
            <Button
              label="Xóa ảnh bìa"
              tone="ghost"
              disabled={pending}
              onPress={() => void removeMedia('cover')}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.album}>
        <Text style={styles.label}>
          Album ({photos.length}/{CAFE_PHOTO_MAX_COUNT})
        </Text>
        {photos.length < CAFE_PHOTO_MAX_COUNT ? (
          <FilePick
            accept="image/png,image/jpeg,image/webp"
            label="Thêm ảnh vào album"
            disabled={pending}
            onFile={(f) => void upload('photos', f)}
          />
        ) : null}
        {photos.length === 0 ? (
          <Hint>Chưa có ảnh nào trong album.</Hint>
        ) : (
          <View style={styles.grid}>
            {photos.map((photo, index) => (
              <View key={photo.id} style={styles.photoCell}>
                <Image
                  source={{ uri: mediaUrl(photo.url) ?? photo.url }}
                  style={styles.photo}
                  accessibilityLabel={photo.caption ?? 'Ảnh quán'}
                />
                <View style={styles.photoActions}>
                  <Text
                    accessibilityRole="button"
                    style={[styles.action, (pending || index === 0) && styles.off]}
                    onPress={() => !pending && index > 0 && movePhoto(index, -1)}
                  >
                    ↑
                  </Text>
                  <Text
                    accessibilityRole="button"
                    style={[styles.action, (pending || index === photos.length - 1) && styles.off]}
                    onPress={() => !pending && index < photos.length - 1 && movePhoto(index, 1)}
                  >
                    ↓
                  </Text>
                  <Text
                    accessibilityRole="button"
                    style={[styles.action, styles.danger, pending && styles.off]}
                    onPress={() => !pending && void deletePhoto(photo.id)}
                  >
                    Xóa
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
      <FormError message={error} />
    </Card>
  );
}

const styles = StyleSheet.create({
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  slot: { flexGrow: 1, flexBasis: 240, gap: space.sm, alignItems: 'flex-start' },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  logo: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border },
  cover: { width: '100%', height: 112, borderRadius: radius, backgroundColor: colors.border },
  album: { gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  photoCell: { width: 120, gap: 4 },
  photo: { width: 120, height: 120, borderRadius: radius, backgroundColor: colors.border },
  photoActions: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { fontSize: 14, color: colors.text, paddingVertical: 2 },
  danger: { color: colors.danger },
  off: { opacity: 0.3 },
});
