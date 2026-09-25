'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface MemberRow {
  userId: string;
  role: string;
  username: string | null;
  name: string;
}

const ROLE_LABEL: Record<string, string> = { owner: 'Chủ quán', staff: 'Nhân viên' };

export function MembersSection({
  cafeId,
  initialMembers,
}: {
  cafeId: string;
  initialMembers: MemberRow[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [pending, setPending] = useState(false);

  async function onRemove(userId: string) {
    setPending(true);
    await api.api.cafes[':id'].members[':userId'].$delete({ param: { id: cafeId, userId } });
    setPending(false);
    const res = await api.api.cafes[':id'].members.$get({ param: { id: cafeId } });
    if (res.ok) setMembers((await res.json()).items);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Thành viên quán</h2>
      <ul className="flex flex-col gap-1 text-xs">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-2">
            <span>
              {m.name} (@{m.username ?? m.userId}) · {ROLE_LABEL[m.role] ?? m.role}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={pending}
              onClick={() => onRemove(m.userId)}
            >
              Gỡ
            </Button>
          </li>
        ))}
        {members.length === 0 ? (
          <li className="text-muted-foreground">Chưa có thành viên.</li>
        ) : null}
      </ul>
    </div>
  );
}
