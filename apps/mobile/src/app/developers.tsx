import { Stack } from 'expo-router';
import { View } from 'react-native';
import { PageShell } from '../features/static/page-shell';
import { SITE_NAME } from '../features/static/site';
import { Code, ExtLink, H1, H2, P, Section } from '../features/static/text';
import { Hint } from '../ui/primitives';

export default function Developers() {
  return (
    <PageShell maxWidth={768}>
      <Stack.Screen options={{ title: `Lập trình viên · ${SITE_NAME}` }} />
      <View style={{ gap: 8 }}>
        <H1>Lập trình viên</H1>
        <Hint>
          {SITE_NAME} mở API đọc dữ liệu và dataset thô để cộng đồng, nhà nghiên cứu và các công cụ
          AI có thể dùng lại.
        </Hint>
      </View>

      <Section>
        <H2>API công khai</H2>
        <P>
          Các route <Code>GET /api/games</Code>, <Code>/api/games/:slug</Code>,{' '}
          <Code>/api/categories</Code>, <Code>/api/locations/provinces</Code>,{' '}
          <Code>/api/cafes</Code>, <Code>/api/cafes/:slug</Code> không cần xác thực. Đặc tả OpenAPI
          3.0 đầy đủ (tham số, kiểu dữ liệu, response) có tại{' '}
          <ExtLink href="/api/openapi.json">/api/openapi.json</ExtLink>.
        </P>
      </Section>

      <Section>
        <H2>Dataset thô</H2>
        <P>
          Dữ kiện game/quán được xuất bản dạng file trong repo dataset trên GitHub, tách theo giấy
          phép:
        </P>
        <P>
          <ExtLink href="https://github.com/onboard-vn/onboardvn">
            github.com/onboard-vn/onboardvn
          </ExtLink>
        </P>
      </Section>

      <Section>
        <H2>Giới hạn tần suất (rate limit)</H2>
        <P>
          Mặc định 300 request/phút cho mỗi IP trên toàn bộ <Code>/api/*</Code>. Vượt giới hạn trả
          về mã lỗi <Code>RATE_LIMITED</Code> (HTTP 429). Response công khai (không đăng nhập) có
          header <Code>Cache-Control: public, max-age=60, s-maxage=300</Code> — nên cache lại phía
          client/CDN thay vì gọi lặp lại liên tục.
        </P>
      </Section>

      <Section>
        <H2>AI crawler / LLM</H2>
        <P>
          Cho phép tất cả bot AI thu thập dữ liệu công khai (xem <Code>/robots.txt</Code>). Tóm tắt
          dành cho LLM tại <ExtLink href="/llms.txt">/llms.txt</ExtLink> và bản đầy đủ tại{' '}
          <ExtLink href="/llms-full.txt">/llms-full.txt</ExtLink>.
        </P>
      </Section>

      <Section>
        <H2>Giấy phép</H2>
        <P>
          • Mã nguồn:{' '}
          <ExtLink href="https://www.gnu.org/licenses/agpl-3.0.html">GNU AGPL-3.0-only</ExtLink>
        </P>
        <P>
          • Dữ kiện (<Code>facts/</Code>):{' '}
          <ExtLink href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</ExtLink>
        </P>
        <P>
          • Mô tả game &amp; thông tin quán:{' '}
          <ExtLink href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</ExtLink>
        </P>
        <P>
          • Địa bàn hành chính (<Code>admin-units/</Code>): MIT
          (ThangLeQuoc/vietnamese-provinces-database)
        </P>
      </Section>
    </PageShell>
  );
}
