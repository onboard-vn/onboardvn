'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export function FriendQr() {
  const [code, setCode] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.api.me['friend-code']
      .$get()
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const { code } = await res.json();
        setCode(code);
      })
      .catch(() => setError('Không tải được mã mời kết bạn'));
  }, []);

  useEffect(() => {
    if (!code) return;
    const url = `${window.location.origin}/invite/${code}`;
    QRCode.toString(url, { type: 'svg', margin: 1, width: 220 })
      .then(setSvg)
      .catch(() => setError('Không tạo được mã QR'));
  }, [code]);

  async function rotate() {
    setPending(true);
    setError(null);
    try {
      const res = await api.api.me['friend-code'].rotate.$post();
      if (!res.ok) throw new Error();
      const { code } = await res.json();
      setCode(code);
    } catch {
      setError('Không đổi được mã, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {svg ? (
        <div className="rounded-lg border bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="flex size-[220px] items-center justify-center rounded-lg border text-sm text-muted-foreground">
          Đang tải…
        </div>
      )}
      {code ? (
        <p className="text-center text-xs break-all text-muted-foreground">
          {typeof window !== 'undefined' ? `${window.location.origin}/invite/${code}` : null}
        </p>
      ) : null}
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={rotate}>
        Đổi mã mời
      </Button>
      <FormError message={error} />
    </div>
  );
}
