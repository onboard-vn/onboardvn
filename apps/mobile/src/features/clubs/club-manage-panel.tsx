import type {
  ClubExternalMemberDto,
  ClubInviteCodeResponse,
  ClubMemberDto,
  ClubRole,
  FriendSummary,
} from '@onboard/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api/client';
import { colors, space } from '../../ui/theme';
import { InviteShare } from '../events/invite-share';
import {
  Body,
  Btn,
  FormError,
  ListBox,
  Muted,
  Row,
  SectionTitle,
  TextField,
  confirmAsync,
  href,
  useAction,
} from '../events/ui';
import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';

export const ROLE_LABEL = {
  owner: 'Chủ club',
  admin: 'Quản trị viên',
  member: 'Thành viên',
} as const;

interface Props {
  club: { id: string; slug: string; name: string; description: string | null };
  myRole: ClubRole;
  viewerId: string;
  members: ClubMemberDto[];
  externalMembers: ClubExternalMemberDto[];
  onChanged: () => void;
}

function Item({ children }: { children: React.ReactNode }) {
  useAppPreferences();
  return (
    <View
      style={{
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        gap: space.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceMuted,
      }}
    >
      {children}
    </View>
  );
}

export function ClubManagePanel({
  club,
  myRole,
  viewerId,
  members,
  externalMembers,
  onChanged,
}: Props) {
  useAppPreferences();
  const router = useRouter();
  const isOwner = myRole === 'owner';
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description ?? '');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendSummary[] | null>(null);
  const { pending, error, setError, run } = useAction();

  useEffect(() => {
    let live = true;
    api<{ items: FriendSummary[] }>('/friends').then(
      (r) => live && setFriends(r.items),
      () => live && setFriends([]),
    );
    return () => {
      live = false;
    };
  }, []);

  async function act(fn: () => Promise<unknown>, fallback: string, after?: () => void) {
    const ok = await run(fn, fallback);
    if (!ok) return;
    after?.();
    onChanged();
  }

  function onSave() {
    if (name.trim().length < 2) {
      setError('Tên club cần ít nhất 2 ký tự');
      return;
    }
    void act(
      () =>
        api(`/clubs/${club.id}`, {
          method: 'PATCH',
          body: { name, description: description.trim() || null },
        }),
      'Không lưu được, kiểm tra lại thông tin',
    );
  }

  async function rotate() {
    await run(async () => {
      const res = await api<ClubInviteCodeResponse>(`/clubs/${club.id}/invite-code/rotate`, {
        method: 'POST',
        body: {},
      });
      setInviteUrl(res.inviteUrl);
    }, 'Không tạo được link mời');
  }

  const memberPath = (userId: string) => `/clubs/${club.id}/members/${encodeURIComponent(userId)}`;
  const memberIds = new Set(members.map((m) => m.user.id));
  const addable = (friends ?? []).filter((f) => !memberIds.has(f.id));

  return (
    <View style={{ gap: space.xl }}>
      <FormError message={error} />

      <View style={{ gap: space.md }}>
        <SectionTitle>{t('Thông tin')}</SectionTitle>
        <TextField label={t('Tên club')} maxLength={80} value={name} onChangeText={setName} />
        <TextField
          label={t('Mô tả')}
          multiline
          maxLength={1000}
          value={description}
          onChangeText={setDescription}
        />
        <Btn
          small
          disabled={pending}
          label={t('Lưu')}
          onPress={onSave}
          style={{ alignSelf: 'flex-start' }}
        />
      </View>

      <View style={{ gap: space.md }}>
        <SectionTitle>{t('Link mời')}</SectionTitle>
        <Btn
          small
          variant="outline"
          disabled={pending}
          label={t('Tạo link mời mới (link cũ hết hiệu lực)')}
          onPress={() => void rotate()}
          style={{ alignSelf: 'flex-start' }}
        />
        {inviteUrl ? <InviteShare inviteUrl={inviteUrl} title={club.name} /> : null}
      </View>

      <View style={{ gap: space.md }}>
        <SectionTitle>
          {t('Thành viên (')}
          {members.length})
        </SectionTitle>
        <ListBox>
          {members.map((m) => {
            const canRemove =
              m.user.id !== viewerId && m.role !== 'owner' && (isOwner || m.role === 'member');
            return (
              <Item key={m.user.id}>
                <Body>
                  {m.user.displayUsername ?? m.user.name} · {t(ROLE_LABEL[m.role])}
                </Body>
                <Row>
                  {isOwner && m.user.id !== viewerId ? (
                    <>
                      <Btn
                        small
                        variant="outline"
                        disabled={pending}
                        label={m.role === 'admin' ? t('Hạ xuống thành viên') : t('Lên admin')}
                        onPress={() =>
                          void act(
                            () =>
                              api(memberPath(m.user.id), {
                                method: 'PATCH',
                                body: { role: m.role === 'admin' ? 'member' : 'admin' },
                              }),
                            'Không đổi được vai trò',
                          )
                        }
                      />
                      <Btn
                        small
                        variant="outline"
                        disabled={pending}
                        label={t('Chuyển owner')}
                        onPress={async () => {
                          if (
                            !(await confirmAsync(
                              t('Chuyển quyền owner cho {name}?', { name: m.user.name }),
                            ))
                          )
                            return;
                          void act(
                            () =>
                              api(memberPath(m.user.id), {
                                method: 'PATCH',
                                body: { role: 'owner' },
                              }),
                            'Không chuyển được quyền owner',
                          );
                        }}
                      />
                    </>
                  ) : null}
                  {canRemove ? (
                    <Btn
                      small
                      variant="danger"
                      disabled={pending}
                      label={t('Xóa')}
                      onPress={async () => {
                        if (
                          !(await confirmAsync(t('Xóa {name} khỏi club?', { name: m.user.name })))
                        )
                          return;
                        void act(
                          () => api(memberPath(m.user.id), { method: 'DELETE' }),
                          'Không xóa được thành viên',
                        );
                      }}
                    />
                  ) : null}
                </Row>
              </Item>
            );
          })}
        </ListBox>
      </View>

      <View style={{ gap: space.md }}>
        <SectionTitle>{t('Thêm bạn bè')}</SectionTitle>
        {friends === null ? (
          <Muted>{t('Đang tải...')}</Muted>
        ) : addable.length === 0 ? (
          <Muted>{t('Không có bạn bè nào để thêm.')}</Muted>
        ) : (
          addable.map((f) => (
            <Row key={f.id} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <View style={{ flex: 1 }}>
                <Body>{f.displayUsername ?? f.username ?? f.name}</Body>
              </View>
              <Btn
                small
                disabled={pending}
                label={t('Thêm')}
                onPress={() =>
                  void act(
                    () =>
                      api(`/clubs/${club.id}/members`, { method: 'POST', body: { userId: f.id } }),
                    'Không thêm được',
                  )
                }
              />
            </Row>
          ))
        )}
      </View>

      {externalMembers.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionTitle>
            {t('Thành viên từ app club cũ ({count})', { count: externalMembers.length })}
          </SectionTitle>
          <ListBox>
            {externalMembers.map((m) => (
              <Item key={m.id}>
                <Body>
                  {m.nickname} · {m.linkedUserId ? t('Đã liên kết') : t('Chưa liên kết')}
                </Body>
                {m.linkedUserId ? (
                  <Row>
                    <Btn
                      small
                      variant="outline"
                      disabled={pending}
                      label={t('Hủy liên kết')}
                      onPress={() =>
                        void act(
                          () =>
                            api(`/clubs/${club.id}/external-members/${m.id}/link`, {
                              method: 'DELETE',
                            }),
                          'Không hủy liên kết được',
                        )
                      }
                    />
                  </Row>
                ) : null}
              </Item>
            ))}
          </ListBox>
        </View>
      ) : null}

      {isOwner ? (
        <View style={{ gap: space.sm }}>
          <SectionTitle>{t('Vùng nguy hiểm')}</SectionTitle>
          <Btn
            small
            variant="danger"
            disabled={pending}
            label={t('Xóa club')}
            style={{ alignSelf: 'flex-start' }}
            onPress={async () => {
              if (
                !(await confirmAsync(
                  `Xóa club "${club.name}"? Kèo của club sẽ chuyển sang riêng tư.`,
                ))
              )
                return;
              const ok = await run(
                () => api(`/clubs/${club.id}`, { method: 'DELETE' }),
                'Không xóa được club',
              );
              if (ok) router.replace(href('/clubs'));
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
