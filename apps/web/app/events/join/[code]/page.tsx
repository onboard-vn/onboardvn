import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Tham gia Kèo',
  robots: { index: false },
  referrer: 'no-referrer',
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Invite URLs are `/events/join/:code?slug=...` (see `inviteUrlFor` in the API); this just
 * redirects to the canonical detail URL, preserving the code through login. */
export default async function JoinEventPage(props: PageProps<'/events/join/[code]'>) {
  const { code } = await props.params;
  const sp = await props.searchParams;
  const slug = firstValue(sp.slug);
  if (!slug) notFound();
  redirect(`/events/${slug}?code=${encodeURIComponent(code)}`);
}
