'use client';

import type { CafeAmenities } from '@onboard/shared';
import { AMENITY_KEYS, AMENITY_LABELS } from '@/lib/cafe-labels';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TRI_STATE_OPTIONS = [
  { value: 'unknown', label: 'Chưa rõ' },
  { value: 'true', label: 'Có' },
  { value: 'false', label: 'Không' },
] as const;

function triStateToValue(
  v: boolean | null | undefined,
): (typeof TRI_STATE_OPTIONS)[number]['value'] {
  if (v === true) return 'true';
  if (v === false) return 'false';
  return 'unknown';
}

function valueToTriState(v: string): boolean | null {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

/** Tri-state (Có/Không/Chưa rõ) amenity selects + capacity numbers, for owner/admin café forms. */
export function AmenitiesFields({
  value,
  onChange,
}: {
  value: CafeAmenities;
  onChange: (next: CafeAmenities) => void;
}) {
  function setField(key: keyof CafeAmenities, next: boolean | null | number | undefined) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {AMENITY_KEYS.map((key) => (
          <div key={key} className="flex flex-col gap-1">
            <Label htmlFor={`amenity-${key}`}>{AMENITY_LABELS[key]}</Label>
            <select
              id={`amenity-${key}`}
              value={triStateToValue(value[key])}
              onChange={(e) => setField(key, valueToTriState(e.target.value))}
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
            >
              {TRI_STATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="privateRoomCapacity">Sức chứa phòng riêng</Label>
          <Input
            id="privateRoomCapacity"
            type="number"
            min={1}
            max={200}
            value={value.privateRoomCapacity ?? ''}
            onChange={(e) =>
              setField('privateRoomCapacity', e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="maxGroupSize">Sức chứa nhóm tối đa</Label>
          <Input
            id="maxGroupSize"
            type="number"
            min={1}
            max={200}
            value={value.maxGroupSize ?? ''}
            onChange={(e) =>
              setField('maxGroupSize', e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>
      </div>
    </div>
  );
}
