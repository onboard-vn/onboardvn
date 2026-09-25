import type { Metadata } from 'next';
import { CONTACT_EMAIL } from '@/lib/env';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Nguồn dữ liệu & yêu cầu sửa/gỡ · ${SITE_NAME}`,
  description: 'Nguồn dữ liệu quán board game, mục đích sử dụng và quyền của chủ quán.',
};

export default function DataSourcesPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Nguồn dữ liệu &amp; yêu cầu sửa/gỡ</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Nguồn dữ liệu</h2>
        <p className="text-muted-foreground text-sm">
          Thông tin quán board game trên {SITE_NAME} (tên, địa chỉ, giờ mở cửa, kho game) tổng hợp
          từ thông tin kinh doanh công khai (fanpage, Google Maps) và từ chủ quán/người đóng góp.
          Với tài khoản đã đăng ký, chúng tôi chỉ lưu dữ liệu người dùng tự cung cấp khi tạo tài
          khoản và sử dụng dịch vụ (hồ sơ, tủ game, ván chơi).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Mục đích</h2>
        <p className="text-muted-foreground text-sm">
          Giúp người chơi board game tìm quán và kho game phù hợp gần mình.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Quyền của chủ quán</h2>
        <p className="text-muted-foreground text-sm">
          Chủ quán được quyền sửa thông tin quán mình hoặc từ chối hiển thị hoàn toàn, thông qua
          link mời chủ quán do quản trị viên cấp, hoặc bằng cách liên hệ trực tiếp bên dưới.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Liên hệ / báo lỗi</h2>
        <p className="text-muted-foreground text-sm">
          Yêu cầu sửa hoặc gỡ thông tin quán, vui lòng{' '}
          {CONTACT_EMAIL ? (
            <>
              liên hệ email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                {CONTACT_EMAIL}
              </a>
            </>
          ) : (
            <>
              tạo issue trên GitHub:{' '}
              <a
                href="https://github.com/onboard-vn/onboardvn/issues"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                github.com/onboard-vn/onboardvn/issues
              </a>
            </>
          )}
          .
        </p>
      </section>
    </main>
  );
}
