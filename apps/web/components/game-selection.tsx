'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export interface SelectedGame {
  id: string;
  slug?: string;
  nameEn: string;
  nameVi: string | null;
}

/** No nested form: usable inside an editor as well as a standalone merge panel. */
export function GameSelection({
  value,
  onChange,
  excludeId,
  disabled = false,
  inputId,
}: {
  value: SelectedGame | null;
  onChange: (value: SelectedGame | null) => void;
  excludeId?: string;
  disabled?: boolean;
  inputId: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SelectedGame[]>([]);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  async function search() {
    const current = ++generation.current;
    const q = query.trim();
    setError(null);
    setResults([]);
    setSearched(false);
    if (!q) {
      setPending(false);
      return;
    }
    setPending(true);
    try {
      const res = await api.api.games.$get({ query: { q, pageSize: '10' } });
      if (!res.ok) throw new Error('Không tải được danh sách game.');
      const data = await res.json();
      if (current !== generation.current) return;
      setResults(data.items.filter((game) => game.id !== excludeId));
      setSearched(true);
    } catch (cause) {
      if (current === generation.current)
        setError(cause instanceof Error ? cause.message : 'Không tải được game.');
    } finally {
      if (current === generation.current) setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
          <span>{value.nameVi || value.nameEn}</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Bỏ chọn
          </Button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={query}
          placeholder="Tìm theo tên hoặc tên gọi khác…"
          disabled={disabled}
          onChange={(event) => {
            generation.current += 1;
            setQuery(event.target.value);
            setResults([]);
            setSearched(false);
            setError(null);
            setPending(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void search();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || pending || !query.trim()}
          onClick={() => void search()}
        >
          {pending ? 'Đang tìm…' : 'Tìm'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      {searched && !pending && results.length === 0 ? (
        <p className="text-muted-foreground text-sm">Không tìm thấy game.</p>
      ) : null}
      {results.length > 0 ? (
        <ul className="divide-y rounded border text-sm">
          {results.map((game) => (
            <li key={game.id} className="flex items-center justify-between gap-2 p-2">
              <span>
                {game.nameVi || game.nameEn}
                {game.nameVi ? (
                  <span className="text-muted-foreground block text-xs">{game.nameEn}</span>
                ) : null}
              </span>
              <Button
                type="button"
                size="xs"
                disabled={disabled}
                onClick={() => {
                  generation.current += 1;
                  setResults([]);
                  setPending(false);
                  setSearched(false);
                  onChange(game);
                }}
              >
                Chọn
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
