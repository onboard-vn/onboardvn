import { createElement } from 'react';
import type { FilePickProps } from './file-pick';

export function FilePick({ accept, label, disabled, onFile }: FilePickProps) {
  return createElement('input', {
    type: 'file',
    accept,
    disabled,
    'aria-label': label,
    style: { maxWidth: '100%', fontSize: 14 },
    onChange: (e: { target: HTMLInputElement }) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) onFile(file);
    },
  });
}
