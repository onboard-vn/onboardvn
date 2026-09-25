import { SITE_NAME } from '@/lib/site';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">{SITE_NAME}</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Nền tảng board game cộng đồng: tìm game, tìm quán, rủ kèo.
      </p>
    </main>
  );
}
