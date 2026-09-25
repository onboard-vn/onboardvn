import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-6 py-4 text-sm text-muted-foreground">
        <span>
          Code{' '}
          <a
            href="https://github.com/onboard-vn/onboardvn"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            AGPL-3.0
          </a>
        </span>
        <span aria-hidden>·</span>
        <span>
          Dữ liệu{' '}
          <a
            href="https://github.com/onboard-vn/onboardvn"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            CC BY-SA 4.0
          </a>
        </span>
        <span aria-hidden>·</span>
        <Link href="/credits" className="underline">
          Nguồn tham khảo
        </Link>
        <span aria-hidden>·</span>
        <Link href="/data-sources" className="underline">
          Nguồn dữ liệu &amp; yêu cầu sửa/gỡ
        </Link>
      </div>
    </footer>
  );
}
