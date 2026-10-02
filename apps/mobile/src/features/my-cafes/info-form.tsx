import type {
  CafeAmenities,
  CafeFeeModel,
  CafeLinks,
  CafeOpeningHours,
  CafeOwnerDto,
  VenueType,
} from '@onboard/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Button, Card, Heading } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { FEE_MODEL_LABELS, VENUE_TYPE_LABELS } from '../cafes/labels';
import { errorMessage } from '../errors';
import { AmenitiesFields } from './amenities-fields';
import { ChoiceRow, Field, FormError, formStyles } from './form-bits';
import { HoursEditor } from './hours-editor';
import { normalizeHours, validateHours } from './hours';
import { PinEditor } from './pin-editor';

const VENUE_OPTIONS = (Object.keys(VENUE_TYPE_LABELS) as VenueType[]).map((value) => ({
  value,
  label: VENUE_TYPE_LABELS[value],
}));
const FEE_OPTIONS = (Object.keys(FEE_MODEL_LABELS) as CafeFeeModel[]).map((value) => ({
  value,
  label: FEE_MODEL_LABELS[value],
}));

const orUndefined = (s: string) => s.trim() || undefined;

export function OwnerCafeForm({ cafe, onSaved }: { cafe: CafeOwnerDto; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(cafe.name);
  const [addressLine, setAddressLine] = useState(cafe.addressLine);
  const [legacyDistrict, setLegacyDistrict] = useState(cafe.legacyDistrict ?? '');
  const [venueType, setVenueType] = useState<VenueType>(cafe.venueType);
  const [lat, setLat] = useState<number | null>(cafe.lat);
  const [lng, setLng] = useState<number | null>(cafe.lng);
  const [fanpage, setFanpage] = useState(cafe.links?.fanpage ?? '');
  const [instagram, setInstagram] = useState(cafe.links?.instagram ?? '');
  const [tiktok, setTiktok] = useState(cafe.links?.tiktok ?? '');
  const [phone, setPhone] = useState(cafe.links?.phone ?? '');
  const [zalo, setZalo] = useState(cafe.links?.zalo ?? '');
  const [website, setWebsite] = useState(cafe.links?.website ?? '');
  const [maps, setMaps] = useState(cafe.links?.maps ?? '');
  const [amenities, setAmenities] = useState<CafeAmenities>(cafe.amenities ?? {});
  const [feeModel, setFeeModel] = useState<CafeFeeModel>(cafe.feeModel ?? 'unknown');
  const [feeNote, setFeeNote] = useState(cafe.feeNote ?? '');
  const [hours, setHours] = useState<CafeOpeningHours>(cafe.openingHours);

  const onSubmit = async () => {
    setError(null);
    setSaved(false);
    const hoursError = validateHours(hours);
    if (hoursError) {
      setError(hoursError);
      return;
    }

    const links: CafeLinks = {
      fanpage: orUndefined(fanpage),
      instagram: orUndefined(instagram),
      tiktok: orUndefined(tiktok),
      phone: orUndefined(phone),
      zalo: orUndefined(zalo),
      website: orUndefined(website),
      maps: orUndefined(maps),
    };
    const hasAnyLink = Object.values(links).some((v) => v !== undefined);

    setPending(true);
    try {
      await api(`/cafes/${encodeURIComponent(cafe.id)}`, {
        method: 'PATCH',
        body: {
          name: name.trim() || cafe.name,
          addressLine: addressLine.trim() || cafe.addressLine,
          legacyDistrict: legacyDistrict.trim() || null,
          lat,
          lng,
          venueType,
          amenities,
          feeModel,
          feeNote: feeNote.trim() || null,
          openingHours: normalizeHours(hours) ?? null,
          links: hasAnyLink ? links : null,
        },
      });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(errorMessage(e, 'Có lỗi xảy ra, thử lại sau'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <Heading>Thông tin địa điểm</Heading>

      <Field
        label="Tên địa điểm *"
        value={name}
        onChangeText={setName}
        autoCapitalize="sentences"
      />
      <Field
        label="Địa chỉ *"
        value={addressLine}
        onChangeText={setAddressLine}
        autoCapitalize="sentences"
      />
      <Field
        label="Địa bàn cũ (vd: Quận 3 cũ)"
        value={legacyDistrict}
        onChangeText={setLegacyDistrict}
        autoCapitalize="sentences"
      />
      <ChoiceRow
        label="Loại địa điểm"
        options={VENUE_OPTIONS}
        value={venueType}
        onChange={setVenueType}
      />

      <View style={formStyles.split}>
        <PinEditor
          lat={lat}
          lng={lng}
          onChange={(la, ln) => {
            setLat(la);
            setLng(ln);
          }}
        />
      </View>

      <View style={formStyles.split}>
        <Text style={styles.sub}>Mạng xã hội &amp; liên hệ</Text>
        <Field label="Fanpage" value={fanpage} onChangeText={setFanpage} keyboardType="url" />
        <Field label="Instagram" value={instagram} onChangeText={setInstagram} keyboardType="url" />
        <Field label="TikTok" value={tiktok} onChangeText={setTiktok} keyboardType="url" />
        <Field
          label="Số điện thoại"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Field label="Zalo (SĐT hoặc link)" value={zalo} onChangeText={setZalo} />
        <Field label="Website" value={website} onChangeText={setWebsite} keyboardType="url" />
        <Field label="Link chỉ đường" value={maps} onChangeText={setMaps} keyboardType="url" />
      </View>

      <View style={formStyles.split}>
        <Text style={styles.sub}>Tiêu chí</Text>
        <AmenitiesFields value={amenities} onChange={setAmenities} />
      </View>

      <View style={formStyles.split}>
        <Text style={styles.sub}>Cách tính phí</Text>
        <ChoiceRow
          label="Hình thức"
          options={FEE_OPTIONS}
          value={feeModel}
          onChange={setFeeModel}
        />
        <Field
          label="Ghi chú giá"
          value={feeNote}
          onChangeText={setFeeNote}
          maxLength={120}
          autoCapitalize="sentences"
        />
      </View>

      <View style={formStyles.split}>
        <Text style={styles.sub}>Giờ mở cửa</Text>
        <HoursEditor value={hours} onChange={setHours} />
      </View>

      <FormError message={error} />
      {saved ? <Text style={styles.saved}>Đã lưu.</Text> : null}
      <Button label="Lưu thay đổi" disabled={pending} onPress={() => void onSubmit()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  sub: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: space.xs },
  saved: { color: colors.muted, fontSize: 14 },
});
