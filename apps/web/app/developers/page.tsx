import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Lập trình viên · ${SITE_NAME}`,
  description: `API công khai, dataset mở và giấy phép của ${SITE_NAME}.`,
};

export default function DevelopersPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lập trình viên</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {SITE_NAME} mở API đọc dữ liệu và dataset thô để cộng đồng, nhà nghiên cứu và các công cụ
          AI có thể dùng lại.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">API công khai</h2>
        <p className="text-sm leading-relaxed">
          Các route <code>GET /api/games</code>, <code>/api/games/:slug</code>,{' '}
          <code>/api/categories</code>, <code>/api/locations/provinces</code>,{' '}
          <code>/api/cafes</code>, <code>/api/cafes/:slug</code> không cần xác thực. Đặc tả OpenAPI
          3.0 đầy đủ (tham số, kiểu dữ liệu, response) có tại{' '}
          <a href="/api/openapi.json" className="font-medium underline">
            /api/openapi.json
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Dataset thô</h2>
        <p className="text-sm leading-relaxed">
          Dữ kiện game/quán được xuất bản dạng file trong repo dataset trên GitHub, tách theo giấy
          phép:
        </p>
        <a
          href="https://github.com/onboard-vn/onboardvn"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium underline"
        >
          github.com/onboard-vn/onboardvn
        </a>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Giới hạn tần suất (rate limit)</h2>
        <p className="text-sm leading-relaxed">
          Mặc định 300 request/phút cho mỗi IP trên toàn bộ <code>/api/*</code>. Vượt giới hạn trả
          về mã lỗi <code>RATE_LIMITED</code> (HTTP 429). Response công khai (không đăng nhập) có
          header <code>Cache-Control: public, max-age=60, s-maxage=300</code> — nên cache lại phía
          client/CDN thay vì gọi lặp lại liên tục.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">AI crawler / LLM</h2>
        <p className="text-sm leading-relaxed">
          Cho phép tất cả bot AI thu thập dữ liệu công khai (xem <code>/robots.txt</code>). Tóm tắt
          dành cho LLM tại{' '}
          <a href="/llms.txt" className="font-medium underline">
            /llms.txt
          </a>{' '}
          và bản đầy đủ tại{' '}
          <a href="/llms-full.txt" className="font-medium underline">
            /llms-full.txt
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Giấy phép</h2>
        <ul className="text-sm leading-relaxed">
          <li>
            Mã nguồn:{' '}
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline"
            >
              GNU AGPL-3.0-only
            </a>
          </li>
          <li>
            Dữ kiện (<code>facts/</code>):{' '}
            <a
              href="https://creativecommons.org/publicdomain/zero/1.0/"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline"
            >
              CC0 1.0
            </a>
          </li>
          <li>
            Mô tả game &amp; thông tin quán:{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline"
            >
              CC BY-SA 4.0
            </a>
          </li>
          <li>
            Địa bàn hành chính (<code>admin-units/</code>): MIT (ThangLeQuoc/vietnamese-provinces-
            database)
          </li>
        </ul>
      </section>
    </main>
  );
}
