import { createElement } from 'react';
import { colors, radius, space } from '../../ui/theme';
import { Field } from './ui';

export function DateField({
  label,
  value,
  onChange,
  kind,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: 'date' | 'datetime-local';
}) {
  return (
    <Field label={label}>
      {createElement('input', {
        type: kind,
        'aria-label': label,
        value,
        onChange: (e: { target: { value: string } }) => onChange(e.target.value),
        style: {
          padding: `10px ${space.md}px`,
          fontSize: 15,
          border: `1px solid ${colors.border}`,
          borderRadius: radius,
          backgroundColor: colors.card,
          color: colors.text,
          width: '100%',
          boxSizing: 'border-box',
        },
      })}
    </Field>
  );
}
