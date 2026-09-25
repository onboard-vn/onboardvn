import path from 'node:path';
import { expect, test } from '@playwright/test';
import { Client } from 'pg';

const FIXTURE_VIDEO = path.join(__dirname, 'fixtures/ean13-4006381333931.y4m');
const BARCODE_CODE = '4006381333931';
const STAFF_EMAIL = `e2e-scan-${Date.now()}@onboard.test`;
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://onboard:onboard@localhost:54329/onboard';

test.use({
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-video-capture=${FIXTURE_VIDEO}`,
    ],
  },
  permissions: ['camera'],
});

let client: Client;
let cafeId: string;
let gameId: string;
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

  const gameRes = await client.query(
    `insert into games (slug, name_en) values ($1, $2) returning id`,
    [`e2e-scan-game-${Date.now()}`, 'E2E Scan Game'],
  );
  gameId = gameRes.rows[0].id as string;

  await client.query(
    `insert into game_barcodes (code, game_id, source) values ($1, $2, 'manual')`,
    [BARCODE_CODE, gameId],
  );

  const cafeRes = await client.query(
    `insert into cafes (slug, name, province_code, ward_code, address_line, consent_status)
     values ($1, $2, $3, $4, '123 E2E St', 'granted') returning id`,
    [`e2e-scan-cafe-${Date.now()}`, 'E2E Scan Cafe', provinceCode, wardCode],
  );
  cafeId = cafeRes.rows[0].id as string;
});

test.afterAll(async () => {
  await client.query('delete from cafe_games where cafe_id = $1', [cafeId]);
  await client.query('delete from cafes where id = $1', [cafeId]);
  await client.query('delete from game_barcodes where game_id = $1', [gameId]);
  await client.query('delete from games where id = $1', [gameId]);
  if (userId) {
    await client.query('delete from sessions where user_id = $1', [userId]);
    await client.query('delete from accounts where user_id = $1', [userId]);
    await client.query('delete from users where id = $1', [userId]);
  }
  await client.query('delete from verifications where identifier = $1', [
    `sign-in-otp-${STAFF_EMAIL}`,
  ]);
  await client.end();
});

async function readLatestOtp(): Promise<string> {
  const res = await client.query(
    `select value from verifications where identifier = $1 order by created_at desc limit 1`,
    [`sign-in-otp-${STAFF_EMAIL}`],
  );
  const value = res.rows[0]?.value as string | undefined;
  if (!value) throw new Error('OTP verification row not found');
  return value.split(':')[0]!;
}

test('scans a barcode with a fake camera and adds the game to a cafe inventory', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    (window as unknown as { __getUserMediaCalls: number }).__getUserMediaCalls = 0;
    navigator.mediaDevices.getUserMedia = (constraints) => {
      (window as unknown as { __getUserMediaCalls: number }).__getUserMediaCalls += 1;
      return original(constraints);
    };
  });

  await page.goto('/login');
  await page.getByRole('tab', { name: 'Mã qua email' }).click();
  await page.getByLabel('Email', { exact: true }).fill(STAFF_EMAIL);
  await page.getByRole('button', { name: 'Gửi mã đăng nhập' }).click();

  await expect(page.getByLabel(/Mã gửi tới/)).toBeVisible();
  const otp = await readLatestOtp();
  await page.getByLabel(/Mã gửi tới/).fill(otp);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  await expect(page).toHaveURL('/');

  const userRes = await client.query('select id from users where email = $1', [STAFF_EMAIL]);
  userId = userRes.rows[0]?.id as string | undefined;
  if (!userId) throw new Error('e2e staff user was not created by the OTP sign-in flow');
  await client.query("update users set role = 'maintainer' where id = $1", [userId]);

  await page.goto('/admin/scan');
  await expect(page.getByRole('heading', { name: 'Quét mã vạch' })).toBeVisible();

  await expect(page.getByText(BARCODE_CODE)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('E2E Scan Game')).toBeVisible();

  // React Strict Mode double-invokes effects once on mount in dev; camera
  // should not restart again after this point despite further re-renders.
  const callsAfterFirstScan = await page.evaluate(
    () => (window as unknown as { __getUserMediaCalls: number }).__getUserMediaCalls,
  );

  await page.getByLabel('Quán').click();
  await page.getByRole('option', { name: 'E2E Scan Cafe' }).click();

  await page.getByRole('button', { name: /Thêm \d+ game vào kho/ }).click();
  await expect(page.getByText(/Đã thêm 1/)).toBeVisible();

  const inventory = await client.query('select * from cafe_games where cafe_id = $1', [cafeId]);
  expect(inventory.rows).toHaveLength(1);
  expect(inventory.rows[0].added_via).toBe('scan');

  const callsAfterBulkAdd = await page.evaluate(
    () => (window as unknown as { __getUserMediaCalls: number }).__getUserMediaCalls,
  );
  expect(callsAfterBulkAdd).toBe(callsAfterFirstScan);
});
