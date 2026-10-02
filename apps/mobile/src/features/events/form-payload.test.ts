import { describe, expect, it } from 'vitest';
import { buildCreatePayload, buildUpdatePayload, type EventFormFields } from './form-payload';

const baseFields: EventFormFields = {
  placeMode: 'address',
  cafeId: null,
  addressLine: '123 Main St',
  provinceCode: 'p1',
  wardCode: '',
  title: 'Kèo test',
  description: '',
  startsAt: '2026-09-27T19:00',
  endsAt: '',
  capacity: '',
  visibility: 'public',
};

describe('buildCreatePayload', () => {
  it('omits empty optional fields instead of sending null', () => {
    const payload = buildCreatePayload(baseFields);
    expect(payload.description).toBeUndefined();
    expect(payload.endsAt).toBeUndefined();
    expect(payload.capacity).toBeUndefined();
    expect(payload).toMatchObject({ addressLine: '123 Main St', provinceCode: 'p1' });
    expect(payload).not.toHaveProperty('cafeId');
  });

  it('sends cafeId and omits address fields in café mode', () => {
    const payload = buildCreatePayload({ ...baseFields, placeMode: 'cafe', cafeId: 'cafe-1' });
    expect(payload).toMatchObject({ cafeId: 'cafe-1' });
    expect(payload).not.toHaveProperty('addressLine');
  });

  it('sends clubId only for club visibility', () => {
    const club = buildCreatePayload({ ...baseFields, visibility: 'club', clubId: 'club-1' });
    expect(club).toMatchObject({ visibility: 'club', clubId: 'club-1' });
    const open = buildCreatePayload({ ...baseFields, clubId: 'club-1' });
    expect(open).not.toHaveProperty('clubId');
  });
});

describe('buildUpdatePayload', () => {
  it('switches café → address by sending cafeId: null alongside the new address', () => {
    const payload = buildUpdatePayload({ ...baseFields, placeMode: 'address' });
    expect(payload.cafeId).toBeNull();
    expect(payload.addressLine).toBe('123 Main St');
    expect(payload.provinceCode).toBe('p1');
  });

  it('switches address → café by sending addressLine: null alongside the new cafeId', () => {
    const payload = buildUpdatePayload({ ...baseFields, placeMode: 'cafe', cafeId: 'cafe-1' });
    expect(payload.cafeId).toBe('cafe-1');
    expect(payload.addressLine).toBeNull();
  });

  it('clears description, endsAt and capacity with explicit null, not undefined', () => {
    const payload = buildUpdatePayload({
      ...baseFields,
      description: '  ',
      endsAt: '',
      capacity: '',
    });
    expect(payload.description).toBeNull();
    expect(payload.endsAt).toBeNull();
    expect(payload.capacity).toBeNull();
  });

  it('keeps non-empty description/endsAt/capacity', () => {
    const payload = buildUpdatePayload({
      ...baseFields,
      description: 'Chi tiết',
      endsAt: '2026-09-27T21:00',
      capacity: '10',
    });
    expect(payload.description).toBe('Chi tiết');
    expect(payload.endsAt).toBe('2026-09-27T14:00:00.000Z');
    expect(payload.capacity).toBe(10);
  });
});
