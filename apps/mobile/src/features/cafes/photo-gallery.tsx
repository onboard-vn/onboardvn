import type { CafePhotoDto } from '@onboard/shared';
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Hint } from '../../ui/primitives';
import { colors, radius, space } from '../../ui/theme';
import { mediaUrl } from '../media';

export function PhotoGallery({ photos }: { photos: CafePhotoDto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const active = openIndex != null ? photos[openIndex] : null;

  if (photos.length === 0) return <Hint>Chưa có ảnh nào.</Hint>;

  return (
    <View>
      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <Pressable
            key={photo.id}
            accessibilityRole="button"
            accessibilityLabel={photo.caption ?? 'Xem ảnh'}
            onPress={() => setOpenIndex(index)}
            style={styles.cell}
          >
            <Image
              source={{ uri: mediaUrl(photo.url) ?? photo.url }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        ))}
      </View>
      <Modal
        visible={!!active}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenIndex(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpenIndex(null)}>
          {active ? (
            <>
              <Image
                source={{ uri: mediaUrl(active.url) ?? active.url }}
                style={styles.full}
                resizeMode="contain"
                accessibilityLabel={active.caption ?? 'Ảnh quán'}
                accessibilityIgnoresInvertColors
              />
              {active.caption ? <Text style={styles.caption}>{active.caption}</Text> : null}
            </>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setOpenIndex(null)}
            style={styles.close}
          >
            <Text style={styles.closeText}>Đóng</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: {
    flexGrow: 1,
    flexBasis: 150,
    maxWidth: 240,
    aspectRatio: 1,
    borderRadius: radius,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    gap: space.md,
  },
  full: { width: '100%', maxWidth: 960, height: '75%' },
  caption: { color: '#fff', fontSize: 14 },
  close: {
    position: 'absolute',
    top: space.xl,
    right: space.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 8,
  },
  closeText: { color: '#fff', fontWeight: '600' },
});
