import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthPage } from '@/components/auth-page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Kiểm tra email · Onboard VN' };

export default async function CheckEmailPage({ searchParams }: PageProps<'/kiem-tra-email'>) {
  const { email } = await searchParams;
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
            <Link href="/login" className="underline">
              đăng nhập
            </Link>{' '}
            để được gửi lại.
          </p>
        </CardContent>
      </Card>
    </AuthPage>
  );
}
