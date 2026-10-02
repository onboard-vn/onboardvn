import { createElement } from 'react';
import { colors, radius, space } from '../../ui/theme';
import type { SelectOption } from './select';
import { Field } from './ui';

export type { SelectOption };

export function Select({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Field label={label}>
      {createElement(
        'select',
        {
          'aria-label': label ?? placeholder,
          value,
          disabled,
          onChange: (e: { target: { value: string } }) => onChange(e.target.value),
          style: {
            padding: `10px ${space.md}px`,
            fontSize: 15,
            border: `1px solid ${colors.border}`,
            borderRadius: radius,
            backgroundColor: colors.card,
            color: colors.text,
            width: '100%',
          },
        },
        createElement('option', { value: '' }, placeholder),
        ...options.map((o) => createElement('option', { key: o.value, value: o.value }, o.label)),
      )}
    </Field>
  );
}
