import { serverApi } from '@/lib/api-server';

/** SSR-fetched pending friend request count; renders nothing when there is none. */
export async function FriendRequestBadge() {
  const res = await (await serverApi()).api.friends.requests.count.$get();
  if (!res.ok) return null;
  const { count } = await res.json();
  if (count === 0) return null;
  return (
    <span className="rounded-full bg-destructive px-1.5 py-0.5 text-xs text-white">{count}</span>
  );
}
