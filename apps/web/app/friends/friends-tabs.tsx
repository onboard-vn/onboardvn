'use client';

import type { FriendRequestDto, FriendSummary } from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

type Tab = 'friends' | 'requests' | 'blocked';

const TABS: { value: Tab; label: string }[] = [
  { value: 'friends', label: 'Bạn bè' },
  { value: 'requests', label: 'Lời mời' },
  { value: 'blocked', label: 'Đã chặn' },
];

function displayName(u: Pick<FriendSummary, 'displayUsername' | 'username' | 'name'>) {
  return u.displayUsername ?? u.username ?? u.name;
}

function PersonRow({ person, action }: { person: FriendSummary; action: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
      <div className="flex items-center gap-2">
        {person.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- external avatar hosts vary
          <img src={person.image} alt="" className="size-8 rounded-full" />
        ) : null}
        <span className="text-sm">{displayName(person)}</span>
      </div>
      {action}
    </li>
  );
}

function QrScanSection() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onDetect(raw: string) {
    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin !== window.location.origin || !/^\/invite\/[^/]+$/.test(url.pathname)) {
        setError('Mã QR không hợp lệ');
        return;
      }
      setScanning(false);
      router.push(url.pathname);
    } catch {
      setError('Mã QR không hợp lệ');
    }
  }

  if (!scanning) {
    return (
      <Button variant="outline" size="sm" onClick={() => setScanning(true)}>
        Quét QR bạn bè
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <BarcodeScanner onDetect={onDetect} formats={['qr_code']} />
      <Button variant="ghost" size="sm" onClick={() => setScanning(false)}>
        Đóng
      </Button>
      <FormError message={error} />
    </div>
  );
}

function FriendsTab() {
  const [items, setItems] = useState<FriendSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.api.friends
      .$get()
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setItems((await res.json()).items);
      })
      .catch(() => setError('Không tải được danh sách bạn bè'));
  }, []);

  async function unfriend(id: string) {
    const res = await api.api.friends[':userId'].$delete({ param: { userId: id } });
    if (res.ok) setItems((prev) => prev?.filter((p) => p.id !== id) ?? null);
  }

  return (
    <div className="flex flex-col gap-3">
      <QrScanSection />
      <FormError message={error} />
      {!items ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có bạn bè.</p>
      ) : (
        <ul>
          {items.map((f) => (
            <PersonRow
              key={f.id}
              person={f}
              action={
                <Button variant="outline" size="sm" onClick={() => unfriend(f.id)}>
                  Hủy kết bạn
                </Button>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestsTab() {
  const [incoming, setIncoming] = useState<FriendRequestDto[] | null>(null);
  const [outgoing, setOutgoing] = useState<FriendRequestDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.api.friends.requests.$get({ query: { dir: 'in' } }),
      api.api.friends.requests.$get({ query: { dir: 'out' } }),
    ])
      .then(async ([inRes, outRes]) => {
        if (!inRes.ok || !outRes.ok) throw new Error();
        setIncoming((await inRes.json()).items);
        setOutgoing((await outRes.json()).items);
      })
      .catch(() => setError('Không tải được lời mời'));
  }, []);

  async function accept(fromUserId: string) {
    const res = await api.api.friends.requests[':fromUserId'].accept.$post({
      param: { fromUserId },
    });
    if (res.ok) setIncoming((prev) => prev?.filter((r) => r.fromUserId !== fromUserId) ?? null);
  }

  async function decline(fromUserId: string) {
    const res = await api.api.friends.requests[':fromUserId'].decline.$post({
      param: { fromUserId },
    });
    if (res.ok) setIncoming((prev) => prev?.filter((r) => r.fromUserId !== fromUserId) ?? null);
  }

  async function cancel(toUserId: string) {
    const res = await api.api.friends.requests[':toUserId'].$delete({ param: { toUserId } });
    if (res.ok) setOutgoing((prev) => prev?.filter((r) => r.toUserId !== toUserId) ?? null);
  }

  return (
    <div className="flex flex-col gap-6">
      <FormError message={error} />
      <div>
        <h2 className="mb-2 text-sm font-medium">Đến bạn</h2>
        {!incoming ? (
          <p className="text-muted-foreground text-sm">Đang tải…</p>
        ) : incoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">Không có lời mời nào.</p>
        ) : (
          <ul>
            {incoming.map((r) => (
              <PersonRow
                key={r.fromUserId}
                person={r.user}
                action={
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => accept(r.fromUserId)}>
                      Chấp nhận
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => decline(r.fromUserId)}>
                      Từ chối
                    </Button>
                  </div>
                }
              />
            ))}
          </ul>
        )}
      </div>
      <div>
        <h2 className="mb-2 text-sm font-medium">Bạn đã gửi</h2>
        {!outgoing ? (
          <p className="text-muted-foreground text-sm">Đang tải…</p>
        ) : outgoing.length === 0 ? (
          <p className="text-muted-foreground text-sm">Không có lời mời nào.</p>
        ) : (
          <ul>
            {outgoing.map((r) => (
              <PersonRow
                key={r.toUserId}
                person={r.user}
                action={
                  <Button variant="outline" size="sm" onClick={() => cancel(r.toUserId)}>
                    Hủy
                  </Button>
                }
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BlockedTab() {
  const [items, setItems] = useState<FriendSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.api.blocks
      .$get()
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setItems((await res.json()).items);
      })
      .catch(() => setError('Không tải được danh sách chặn'));
  }, []);

  async function unblock(id: string) {
    const res = await api.api.blocks[':userId'].$delete({ param: { userId: id } });
    if (res.ok) setItems((prev) => prev?.filter((p) => p.id !== id) ?? null);
  }

  return (
    <div className="flex flex-col gap-3">
      <FormError message={error} />
      {!items ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa chặn ai.</p>
      ) : (
        <ul>
          {items.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              action={
                <Button variant="outline" size="sm" onClick={() => unblock(p.id)}>
                  Bỏ chặn
                </Button>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export function FriendsTabs() {
  const [tab, setTab] = useState<Tab>('friends');

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1 text-sm">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`rounded px-2 py-1 ${tab === value ? 'bg-background font-medium shadow-sm' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'friends' ? <FriendsTab /> : null}
      {tab === 'requests' ? <RequestsTab /> : null}
      {tab === 'blocked' ? <BlockedTab /> : null}
    </div>
  );
}
