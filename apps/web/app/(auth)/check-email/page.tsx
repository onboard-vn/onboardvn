import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthPage } from '@/components/auth-page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { safeNextPath } from '@/lib/safe-next';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Kiểm tra email · ${SITE_NAME}` };

export default async function CheckEmailPage({ searchParams }: PageProps<'/check-email'>) {
  const { email, next: rawNext } = await searchParams;
  const next = safeNextPath(typeof rawNext === 'string' ? rawNext : undefined);
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';
  return (
    <AuthPage>
      <Card>
        <CardHeader>
          <CardTitle>Kiểm tra hộp thư</CardTitle>
          <CardDescription>
            Đã gửi liên kết xác minh tới {typeof email === 'string' ? email : 'email của bạn'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            Mở email và bấm &quot;Xác minh email&quot; để kích hoạt tài khoản. Liên kết có hiệu lực
            1 giờ.
          </p>
          <p>
            Không thấy email? Kiểm tra mục spam, hoặc{' '}
            <Link href={loginHref} className="underline">
              đăng nhập
            </Link>{' '}
            để được gửi lại.
          </p>
        </CardContent>
      </Card>
    </AuthPage>
  );
}
