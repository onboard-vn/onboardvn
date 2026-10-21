'use client';

import type { GameAliasInput } from '@onboard/shared';
import { GameSelection, type SelectedGame } from '@/components/game-selection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function GameIdentityFields({
  aliases,
  onAliasesChange,
  variantOf,
  onVariantChange,
  gameId,
  disabled,
}: {
  aliases: GameAliasInput[];
  onAliasesChange: (aliases: GameAliasInput[]) => void;
  variantOf: SelectedGame | null;
  onVariantChange: (game: SelectedGame | null) => void;
  gameId?: string;
  disabled: boolean;
}) {
  function update(index: number, patch: Partial<GameAliasInput>) {
    onAliasesChange(aliases.map((alias, i) => (i === index ? { ...alias, ...patch } : alias)));
  }
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">Tên gọi và phiên bản</legend>
      <p className="text-muted-foreground text-sm">
        Tên Việt hóa, tên ngôn ngữ khác và bản custom giữ nguyên luật cùng thuộc game này.
      </p>
      {aliases.map((alias, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1">
            <Label htmlFor={`alias-name-${index}`}>Tên gọi</Label>
            <Input
              id={`alias-name-${index}`}
              value={alias.name}
              required
              maxLength={200}
              onChange={(event) => update(index, { name: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`alias-kind-${index}`}>Loại</Label>
            <select
              id={`alias-kind-${index}`}
              className="h-9 rounded-md border px-2 text-sm"
              value={alias.kind}
              onChange={(event) => update(index, { kind: event.target.value as 'name' | 'custom' })}
            >
              <option value="name">Tên khác / ngôn ngữ</option>
              <option value="custom">Custom cùng luật</option>
            </select>
          </div>
          <div className="w-28">
            <Label htmlFor={`alias-language-${index}`}>Ngôn ngữ</Label>
            <Input
              id={`alias-language-${index}`}
              placeholder="vi, en…"
              maxLength={20}
              value={alias.language ?? ''}
              onChange={(event) => update(index, { language: event.target.value || undefined })}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAliasesChange(aliases.filter((_, i) => i !== index))}
          >
            Bỏ tên
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onAliasesChange([...aliases, { name: '', kind: 'name' }])}
        disabled={aliases.length >= 100}
      >
        Thêm tên gọi
      </Button>
      <div className="mt-2 flex flex-col gap-2">
        <Label htmlFor="variant-parent">Game gốc nếu bản này đổi luật</Label>
        <p className="text-muted-foreground text-xs">
          Bản đổi luật có danh mục, lượt chơi và bảng điểm riêng; liên kết này chỉ giúp tra cứu các
          bản liên quan.
        </p>
        <GameSelection
          inputId="variant-parent"
          value={variantOf}
          onChange={onVariantChange}
          excludeId={gameId}
          disabled={disabled}
        />
      </div>
    </fieldset>
  );
}
