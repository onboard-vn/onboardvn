import type {
  CafeMaintainerDto,
  CafeMemberDto,
  CafeOwnerInviteDto,
  ProvinceDto,
  WardDto,
} from '@onboard/shared';
import { useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '../../../../api/client';
import { CafeForm } from '../../../../features/admin/cafe-form';
import { InventoryManager } from '../../../../features/admin/inventory-manager';
import { MembersSection } from '../../../../features/admin/members-section';
import { OwnerInviteSection } from '../../../../features/admin/owner-invite-section';
import { AdminPage, LoadState } from '../../../../features/admin/ui';
import { Hint } from '../../../../ui/primitives';
import { useLoad } from '../../../../ui/use-load';

interface Loaded {
  cafe: CafeMaintainerDto;
  provinces: ProvinceDto[];
  wards: WardDto[];
  invites: CafeOwnerInviteDto[];
  members: CafeMemberDto[];
}

const items = <T,>(promise: Promise<{ items: T[] }>): Promise<T[]> =>
  promise.then((r) => r.items).catch(() => []);

async function loadCafe(id: string): Promise<Loaded | null> {
  const [cafe, provinces, invites, members] = await Promise.all([
    api<CafeMaintainerDto>(`/cafes/${id}/manage`).catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
    items(api<{ items: ProvinceDto[] }>('/locations/provinces')),
    items(api<{ items: CafeOwnerInviteDto[] }>(`/cafes/${id}/owner-invites`)),
    items(api<{ items: CafeMemberDto[] }>(`/cafes/${id}/members`)),
  ]);
  if (!cafe) return null;
  const wards = await items(
    api<{ items: WardDto[] }>(
      `/locations/provinces/${encodeURIComponent(cafe.provinceCode)}/wards`,
    ),
  );
  return { cafe, provinces, wards, invites, members };
}

export default function EditCafePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useLoad(() => loadCafe(id), [id]);
  const data = state.data;

  return (
    <AdminPage title="Sửa địa điểm chơi" width={672}>
      <LoadState
        loading={state.loading && data === undefined}
        error={state.error}
        onRetry={state.reload}
      />
      {data === null ? <Hint>Không tìm thấy quán.</Hint> : null}
      {data ? (
        <>
          <CafeForm
            provinces={data.provinces}
            initialWards={data.wards}
            initial={data.cafe}
            onSaved={state.reload}
          />
          <InventoryManager
            cafeId={data.cafe.id}
            inventory={data.cafe.inventory}
            onChanged={state.reload}
          />
          <OwnerInviteSection cafeId={data.cafe.id} initialInvites={data.invites} />
          <MembersSection cafeId={data.cafe.id} initialMembers={data.members} />
        </>
      ) : null}
    </AdminPage>
  );
}
