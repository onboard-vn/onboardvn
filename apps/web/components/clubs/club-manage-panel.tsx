'use client';

import type {
  ClubExternalMemberDto,
  ClubMemberDto,
  ClubRole,
  FriendSummary,
} from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { InviteShare } from '@/components/events/invite-share';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Thành viên' } as const;

interface Props {
  club: { id: string; slug: string; name: string; description: string | null };
  myRole: ClubRole;
  viewerId: string;
  members: ClubMemberDto[];
  externalMembers: ClubExternalMemberDto[];
}

export function ClubManagePanel({ club, myRole, viewerId, members, externalMembers }: Props) {
  const router = useRouter();
  const isOwner = myRole === 'owner';
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description ?? '');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api.api.friends.$get().then(async (res) => setFriends(res.ok ? (await res.json()).items : []));
  }, []);

  async function run(action: () => Promise<Response>, fallback: string, after?: () => void) {
    setError(null);
    setPending(true);
    try {
      const res = await action();
      if (!res.ok) {
        setError(await apiErrorMessage(res, fallback));
        return;
      }
      after?.();
      router.refresh();
    } catch {
      setError(fallback);
    } finally {
      setPending(false);
    }
  }

  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void run(
      () =>
        api.api.clubs[':id'].$patch({
          param: { id: club.id },
          json: { name, description: description.trim() || null },
        }),
      'Không lưu được, kiểm tra lại thông tin',
    );
  }

  async function rotate() {
    setError(null);
    setPending(true);
    try {
      const res = await api.api.clubs[':id']['invite-code'].rotate.$post({
        param: { id: club.id },
      });
      if (!res.ok) {
        setError(await apiErrorMessage(res, 'Không tạo được link mời'));
        return;
      }
      setInviteUrl((await res.json()).inviteUrl);
    } catch {
      setError('Không tạo được link mời');
    } finally {
      setPending(false);
    }
  }

  const memberIds = new Set(members.map((m) => m.user.id));
  const addable = (friends ?? []).filter((f) => !memberIds.has(f.id));

  return (
    <div className="flex flex-col gap-8">
      <FormError message={error} />

      <form onSubmit={onSave} className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Thông tin</h2>
        <div className="flex flex-col gap-1">
          <Label htmlFor="manage-club-name">Tên club</Label>
          <Input
            id="manage-club-name"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="manage-club-description">Mô tả</Label>
          <Textarea
            id="manage-club-description"
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" className="self-start" disabled={pending}>
          Lưu
        </Button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Link mời</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="self-start"
          disabled={pending}
          onClick={() => void rotate()}
        >
          Tạo link mời mới (link cũ hết hiệu lực)
        </Button>
        {inviteUrl ? <InviteShare inviteUrl={inviteUrl} title={club.name} /> : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Thành viên ({members.length})</h2>
        <ul className="flex flex-col divide-y rounded-lg border">
          {members.map((m) => {
            const canRemove =
              m.user.id !== viewerId && m.role !== 'owner' && (isOwner || m.role === 'member');
            return (
              <li key={m.user.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-sm">
                  {m.user.displayUsername ?? m.user.name}
                  <span className="text-muted-foreground ml-2 text-xs">{ROLE_LABEL[m.role]}</span>
                </span>
                <span className="flex gap-1">
                  {isOwner && m.user.id !== viewerId ? (
                    <>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          void run(
                            () =>
                              api.api.clubs[':id'].members[':userId'].$patch({
                                param: { id: club.id, userId: m.user.id },
                                json: { role: m.role === 'admin' ? 'member' : 'admin' },
                              }),
                            'Không đổi được vai trò',
                          )
                        }
                      >
                        {m.role === 'admin' ? 'Hạ xuống thành viên' : 'Lên admin'}
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm(`Chuyển quyền owner cho ${m.user.name}?`)) return;
                          void run(
                            () =>
                              api.api.clubs[':id'].members[':userId'].$patch({
                                param: { id: club.id, userId: m.user.id },
                                json: { role: 'owner' },
                              }),
                            'Không chuyển được quyền owner',
                          );
                        }}
                      >
                        Chuyển owner
                      </Button>
                    </>
                  ) : null}
                  {canRemove ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm(`Xóa ${m.user.name} khỏi club?`)) return;
                        void run(
                          () =>
                            api.api.clubs[':id'].members[':userId'].$delete({
                              param: { id: club.id, userId: m.user.id },
                            }),
                          'Không xóa được thành viên',
                        );
                      }}
                    >
                      Xóa
                    </Button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Thêm bạn bè</h2>
        {friends === null ? (
          <p className="text-muted-foreground text-sm">Đang tải...</p>
        ) : addable.length === 0 ? (
          <p className="text-muted-foreground text-sm">Không có bạn bè nào để thêm.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {addable.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2">
                <span>{f.displayUsername ?? f.username ?? f.name}</span>
                <Button
                  type="button"
                  size="xs"
                  disabled={pending}
                  onClick={() =>
                    void run(
                      () =>
                        api.api.clubs[':id'].members.$post({
                          param: { id: club.id },
                          json: { userId: f.id },
                        }),
                      'Không thêm được',
                    )
                  }
                >
                  Thêm
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {externalMembers.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">
            Thành viên từ app club cũ ({externalMembers.length})
          </h2>
          <ul className="flex flex-col divide-y rounded-lg border">
            {externalMembers.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  {m.nickname}
                  <span className="text-muted-foreground ml-2 text-xs">
                    {m.linkedUserId ? 'Đã liên kết' : 'Chưa liên kết'}
                  </span>
                </span>
                {m.linkedUserId ? (
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      void run(
                        () =>
                          api.api.clubs[':id']['external-members'][':memberId'].link.$delete({
                            param: { id: club.id, memberId: m.id },
                          }),
                        'Không hủy liên kết được',
                      )
                    }
                  >
                    Hủy liên kết
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isOwner ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Vùng nguy hiểm</h2>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="self-start"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Xóa club "${club.name}"? Kèo của club sẽ chuyển sang riêng tư.`))
                return;
              void run(
                () => api.api.clubs[':id'].$delete({ param: { id: club.id } }),
                'Không xóa được club',
                () => router.push('/clubs'),
              );
            }}
          >
            Xóa club
          </Button>
        </section>
      ) : null}
    </div>
  );
}
