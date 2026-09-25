import Image from 'next/image';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { SITE_NAME, SITE_SLOGAN } from '@/lib/site';

const ACTIONS = [
  { href: '/map', label: 'Tìm quán', variant: 'default' },
  { href: '/games', label: 'Tìm game', variant: 'outline' },
  { href: '/events', label: 'Tìm người cùng chơi', variant: 'outline' },
  { href: '/signup', label: 'Tham gia cộng đồng', variant: 'outline' },
] as const;

export default function Home() {
  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-6 py-16 md:grid-cols-2">
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-bold tracking-tight">{SITE_NAME}</h1>
        <p className="text-xl font-medium">{SITE_SLOGAN}</p>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Danh bạ quán board game, kho game theo từng quán và cộng đồng người chơi trên khắp Việt
          Nam.
        </p>
        <div className="flex flex-wrap gap-3">
          {ACTIONS.map(({ href, label, variant }) => (
            <Link key={href} href={href} className={buttonVariants({ variant, size: 'lg' })}>
              {label}
            </Link>
          ))}
        </div>
      </div>
      <Image
        src="/brand/hero-illustration.webp"
        alt="Bốn meeple quây quanh bàn chơi board game với ghim bản đồ"
        width={800}
        height={800}
        priority
        sizes="(min-width: 768px) 480px, 90vw"
        className="mx-auto w-full max-w-md"
      />
    </main>
  );
}
