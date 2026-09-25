import Link from 'next/link';
import type { CafeTab } from '@/lib/cafe-tabs';

const TAB_LABELS: Record<CafeTab, string> = {
  about: 'Giới thiệu',
  games: 'Tủ game',
  events: 'Sự kiện',
  photos: 'Ảnh',
};

export function CafeTabsNav({ slug, active }: { slug: string; active: CafeTab }) {
  return (
    <nav aria-label="Thông tin quán" className="flex gap-1 border-b">
      {(Object.keys(TAB_LABELS) as CafeTab[]).map((tab) => (
        <Link
          key={tab}
          href={tab === 'about' ? `/cafes/${slug}` : `/cafes/${slug}?tab=${tab}`}
          aria-current={active === tab ? 'page' : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            active === tab
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {TAB_LABELS[tab]}
        </Link>
      ))}
    </nav>
  );
}
