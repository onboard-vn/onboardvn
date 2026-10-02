import type { CafeMapPinDto } from '@onboard/shared';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Card, Heading, Hint } from '../../ui/primitives';
import { space } from '../../ui/theme';
import { VENUE_TYPE_LABELS } from '../cafes/labels';

const pinUrl = (pin: CafeMapPinDto) =>
  `https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`;

export function CafeMap({ pins }: { pins: CafeMapPinDto[]; fitToPins?: boolean }) {
  return (
    <View style={styles.list}>
      {pins.map((pin) => (
        <Card key={pin.slug}>
          <Heading>{pin.name}</Heading>
          <Hint>{VENUE_TYPE_LABELS[pin.venueType]}</Hint>
          <Button
            label="Mở bản đồ"
            tone="ghost"
            onPress={() => void Linking.openURL(pinUrl(pin))}
          />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ list: { gap: space.sm, padding: space.lg } });
