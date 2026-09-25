'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

/** Shows an invite URL once (copy button + Zalo/Web Share). Callers must not re-fetch it — the
 * API only returns the raw invite code on create/rotate. */
export function InviteShare({ inviteUrl, title }: { inviteUrl: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: inviteUrl });
        return;
      } catch {
        // user cancelled or unsupported — fall through to Zalo link
      }
    }
    window.open(`https://zalo.me/share?u=${encodeURIComponent(inviteUrl)}`, '_blank', 'noopener');
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Link mời (chỉ hiện một lần, hãy lưu lại)</p>
      <code className="break-all rounded bg-muted px-2 py-1 text-xs">{inviteUrl}</code>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
          {copied ? 'Đã sao chép' : 'Sao chép link'}
        </Button>
        <Button type="button" size="sm" onClick={() => void share()}>
          Chia sẻ qua Zalo
        </Button>
      </div>
    </div>
  );
}
