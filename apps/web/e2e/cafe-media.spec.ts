import path from 'node:path';
import { expect, test } from '@playwright/test';
import { Client } from 'pg';

const FIXTURE_PHOTO = path.join(__dirname, 'fixtures/cafe-photo.png');
const stamp = Date.now();
const OWNER_EMAIL = `e2e-media-owner-${stamp}@onboard.test`;
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://onboard:onboard@localhost:54329/onboard';

let client: Client;
let cafeId: string;
let cafeSlug: string;
let publicInfoOnlyCafeId: string;
let publicInfoOnlySlug: string;
let userId: string | undefined;

test.beforeAll(async () => {
  client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const province = await client.query('select code from provinces limit 1');
  const provinceCode = province.rows[0].code as string;
  const ward = await client.query('select code from wards where province_code = $1 limit 1', [
    provinceCode,
  ]);
  const wardCode = ward.rows[0].code as string;

  cafeSlug = `e2e-media-cafe-${stamp}`;
  const cafeRes = await client.query(
    `insert into cafes (slug, name, province_code, ward_code, address_line, consent_status)
     values ($1, $2, $3, $4, '1 E2E Media St', 'granted') returning id`,
    [cafeSlug, 'E2E Media Cafe', provinceCode, wardCode],
  );
  cafeId = cafeRes.rows[0].id as string;

  publicInfoOnlySlug = `e2e-media-cafe-pio-${stamp}`;
  const pioRes = await client.query(
    `insert into cafes (slug, name, province_code, ward_code, address_line, consent_status, source_url, links)
     values ($1, $2, $3, $4, '2 E2E Media St', 'public_info_only', 'https://example.test/pio', $5) returning id`,
    [
      publicInfoOnlySlug,
      'E2E Media PIO Cafe',
      provinceCode,
      wardCode,
      JSON.stringify({ fanpage: 'https://facebook.com/e2emediapio' }),
    ],
  );
  publicInfoOnlyCafeId = pioRes.rows[0].id as string;
});

test.afterAll(async () => {
  await client.query('delete from cafe_photos where cafe_id = any($1)', [
    [cafeId, publicInfoOnlyCafeId],
  ]);
  await client.query('delete from cafe_members where cafe_id = $1', [cafeId]);
  await client.query('delete from cafes where id = any($1)', [[cafeId, publicInfoOnlyCafeId]]);
  if (userId) {
    await client.query('delete from sessions where user_id = $1', [userId]);
    await client.query('delete from accounts where user_id = $1', [userId]);
    await client.query('delete from users where id = $1', [userId]);
  }
  await client.query('delete from verifications where identifier = $1', [
    `sign-in-otp-${OWNER_EMAIL}`,
  ]);
  await client.end();
});

async function readLatestOtp(): Promise<string> {
  const res = await client.query(
    `select value from verifications where identifier = $1 order by created_at desc limit 1`,
    [`sign-in-otp-${OWNER_EMAIL}`],
  );
  const value = res.rows[0]?.value as string | undefined;
  if (!value) throw new Error('OTP verification row not found');
  return value.split(':')[0]!;
}

test('owner uploads a cover and a photo; the public page shows them', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('tab', { name: 'Mã qua email' }).click();
  await page.getByLabel('Email', { exact: true }).fill(OWNER_EMAIL);
  await page.getByRole('button', { name: 'Gửi mã đăng nhập' }).click();
  await expect(page.getByLabel(/Mã gửi tới/)).toBeVisible();
  const otp = await readLatestOtp();
  await page.getByLabel(/Mã gửi tới/).fill(otp);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL('/');

  const userRes = await client.query('select id from users where email = $1', [OWNER_EMAIL]);
  userId = userRes.rows[0]?.id as string | undefined;
  if (!userId) throw new Error('e2e owner user was not created by the OTP sign-in flow');
  await client.query('insert into cafe_members (cafe_id, user_id, role) values ($1, $2, $3)', [
    cafeId,
    userId,
    'owner',
  ]);

  await page.goto(`/my-cafes/${cafeId}`);
  await expect(page.getByRole('heading', { name: 'E2E Media Cafe' })).toBeVisible();

  const [, coverInput, photoInput] = await page.locator('input[type=file]').all();
  await coverInput!.setInputFiles(FIXTURE_PHOTO);
  await expect(page.getByRole('button', { name: 'Xóa ảnh bìa' })).toBeVisible();

  await photoInput!.setInputFiles(FIXTURE_PHOTO);
  await expect(page.getByText('Album (1/30)')).toBeVisible();

  await page.goto(`/cafes/${cafeSlug}`);
  await expect(page.getByRole('heading', { name: 'E2E Media Cafe' })).toBeVisible();
  await expect(page.locator('img').first()).toBeVisible();

  await page.goto(`/cafes/${cafeSlug}?tab=photos`);
  await expect(page.locator('img[alt=""]').first()).toBeVisible();
});

test('a public_info_only café shows the default header and click-to-load fanpage embed', async ({
  page,
}) => {
  await page.goto(`/cafes/${publicInfoOnlySlug}`);
  await expect(page.getByRole('heading', { name: 'E2E Media PIO Cafe' })).toBeVisible();

  await expect(page.locator('iframe[title="Fanpage Facebook"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Xem fanpage' }).click();
  await expect(page.locator('iframe[title="Fanpage Facebook"]')).toHaveCount(1);
});
