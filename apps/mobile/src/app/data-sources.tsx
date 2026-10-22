import { localizedContent } from '../ui/i18n';
import { useAppPreferences } from '../ui/preferences';
import { Stack } from 'expo-router';
import { PageShell } from '../features/static/page-shell';
import { CONTACT_EMAIL, SITE_NAME } from '../features/static/site';
import { ExtLink, H1, H2, P, Section } from '../features/static/text';

export default function DataSources() {
  useAppPreferences();
  return (
    <PageShell maxWidth={672}>
      <Stack.Screen
        options={{ title: `${localizedContent('Nguồn dữ liệu & yêu cầu sửa/gỡ')} · ${SITE_NAME}` }}
      />
      <H1>{localizedContent('Nguồn dữ liệu & yêu cầu sửa/gỡ')}</H1>

      <Section>
        <H2>{localizedContent('Nguồn dữ liệu')}</H2>
        <P muted>
          {localizedContent('Thông tin quán board game trên')} {SITE_NAME}{' '}
          {localizedContent(
            '(tên, địa chỉ, giờ mở cửa, kho game) tổng hợp từ thông tin kinh doanh công khai (fanpage, Google Maps) và từ chủ quán/người đóng góp. Với tài khoản đã đăng ký, chúng tôi chỉ lưu dữ liệu người dùng tự cung cấp khi tạo tài khoản và sử dụng dịch vụ (hồ sơ, tủ game, ván chơi).',
          )}
        </P>
      </Section>

      <Section>
        <H2>{localizedContent('Mục đích')}</H2>
        <P muted>
          {localizedContent('Giúp người chơi board game tìm quán và kho game phù hợp gần mình.')}
        </P>
      </Section>

      <Section>
        <H2>{localizedContent('Quyền của chủ quán')}</H2>
        <P muted>
          {localizedContent(
            'Chủ quán được quyền sửa thông tin quán mình hoặc từ chối hiển thị hoàn toàn, thông qua link mời chủ quán do quản trị viên cấp, hoặc bằng cách liên hệ trực tiếp bên dưới.',
          )}
        </P>
      </Section>

      <Section>
        <H2>{localizedContent('Liên hệ / báo lỗi')}</H2>
        <P muted>
          {localizedContent('Yêu cầu sửa hoặc gỡ thông tin quán, vui lòng')}{' '}
          {CONTACT_EMAIL ? (
            <>
              {localizedContent('liên hệ email')}{' '}
              <ExtLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</ExtLink>
            </>
          ) : (
            <>
              {localizedContent('tạo issue trên GitHub:')}{' '}
              <ExtLink href="https://github.com/onboard-vn/onboardvn/issues">
                github.com/onboard-vn/onboardvn/issues
              </ExtLink>
            </>
          )}
          .
        </P>
      </Section>
    </PageShell>
  );
}
