import { TextField } from './ui';

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
    <TextField
      label={label}
      value={value}
      onChangeText={onChange}
      placeholder={kind === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm'}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
}
