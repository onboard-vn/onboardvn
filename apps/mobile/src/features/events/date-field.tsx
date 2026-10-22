import { TextField } from './ui';
import { useAppPreferences } from '../../ui/preferences';


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
  useAppPreferences();
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
