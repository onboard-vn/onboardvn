import { expect, test } from '@playwright/test';
import { Client } from 'pg';

const STAFF_EMAIL = `e2e-map-${Date.now()}@onboard.test`;
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://onboard:onboard@localhost:54329/onboard';

// Headless Chromium has no real GPU; MapLibre needs a WebGL context, so this spec (only) forces
// the software SwiftShader renderer instead of skipping the map render entirely.
test.use({
  launchOptions: { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] },
});

let client: Client;
let cafeId: string;
let cafeSlug: string;
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

  cafeSlug = `e2e-map-cafe-${Date.now()}`;
  const cafeRes = await client.query(
    `insert into cafes (slug, name, province_code, ward_code, address_line, consent_status)
     values ($1, $2, $3, $4, '1 E2E Map St', 'granted') returning id`,
    [cafeSlug, 'E2E Map Cafe', provinceCode, wardCode],
  );
  cafeId = cafeRes.rows[0].id as string;
});

test.afterAll(async () => {
  await client.query('delete from cafes where id = $1', [cafeId]);
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

test('admin pins a café on the map, then /map shows the pin with a working "Chỉ đường" link', async ({
  page,
}) => {
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
  if (!userId) throw new Error('e2e maintainer user was not created by the OTP sign-in flow');
  await client.query("update users set role = 'maintainer' where id = $1", [userId]);

  await page.goto(`/admin/cafes/${cafeId}/edit`);
  await expect(page.getByRole('heading', { name: 'Sửa địa điểm chơi' })).toBeVisible();

  const pinMap = page.getByTestId('pin-editor-map');
  await expect(pinMap).toBeVisible();
  await expect(pinMap).toHaveAttribute('data-map-ready', 'true');

  const latInput = page.locator('#pin-lat');
  const lngInput = page.locator('#pin-lng');

  // Software WebGL (swiftshader) occasionally reports the map's transform as still centered
  // near (0, 0) for the very first click right after 'load' fires; retry the click if so — Hà
  // Nội is nowhere near the equator/prime meridian, so near-(0, 0) always means "not ready yet".
  let latValue = 0;
  let lngValue = 0;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await pinMap.click();
    // A stray/late-settling MapLibre click event can overwrite the input a moment after the
    // first read looks fine; wait briefly and re-read before trusting the value.
    await page.waitForTimeout(300);
    latValue = Number(await latInput.inputValue());
    lngValue = Number(await lngInput.inputValue());
    if (Math.abs(latValue) > 1 && Math.abs(lngValue) > 1) break;
  }
  expect(Math.abs(latValue)).toBeGreaterThan(1);
  expect(Math.abs(lngValue)).toBeGreaterThan(1);

  const [patchRes] = await Promise.all([
    page.waitForResponse(
      (res) => res.request().method() === 'PATCH' && res.url().includes(`/api/cafes/${cafeId}`),
    ),
    page.getByRole('button', { name: 'Lưu thay đổi' }).click(),
  ]);
  if (!patchRes.ok()) {
    throw new Error(
      `PATCH /api/cafes/${cafeId} failed: ${patchRes.status()} ${await patchRes.text()}`,
    );
  }
  await expect(page.getByRole('button', { name: 'Xoá vị trí' })).toBeVisible();

  const cafeRow = await client.query('select lat, lng from cafes where id = $1', [cafeId]);
  // Match the popup's rendering: the DTO does `Number(row.lat)`, which drops the DB's trailing
  // zeros (numeric(9,6)) — compare against that same normalized form, not the raw column string.
  expect(cafeRow.rows[0].lat).not.toBeNull();
  expect(cafeRow.rows[0].lng).not.toBeNull();
  const lat = Number(cafeRow.rows[0].lat);
  const lng = Number(cafeRow.rows[0].lng);
  expect(Math.abs(lat)).toBeGreaterThan(1);
  expect(Math.abs(lng)).toBeGreaterThan(1);

  await page.goto('/map');
  const cafeMap = page.getByTestId('cafe-map');
  await expect(cafeMap).toBeVisible();
  await expect(cafeMap).toHaveAttribute('data-map-ready', 'true');

  const mapBox = await cafeMap.boundingBox();
  if (!mapBox) throw new Error('cafe map has no bounding box');
  await cafeMap.click({ position: { x: mapBox.width / 2, y: mapBox.height / 2 } });

  const directionsLink = page.locator(
    `a[href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}"]`,
  );
  await expect(directionsLink).toBeVisible();
  await expect(page.locator('.cafe-map-popup').getByText('E2E Map Cafe')).toBeVisible();
});

test('changing the game filter after the map has loaded updates the pins (no stale "load" once())', async ({
  page,
}) => {
  // Own fixtures, scoped to just this test, so they never clutter the previous test's pin.
  const province = await client.query('select code from provinces limit 1');
  const provinceCode = province.rows[0].code as string;
  const ward = await client.query('select code from wards where province_code = $1 limit 1', [
    provinceCode,
  ]);
  const wardCode = ward.rows[0].code as string;

  const gameRes = await client.query(
    `insert into games (slug, name_en) values ($1, $2) returning id`,
    [`e2e-map-filter-game-${Date.now()}`, 'E2E Map Filter Game'],
  );
  const gameId = gameRes.rows[0].id as string;

  const gameCafeRes = await client.query(
    `insert into cafes (slug, name, province_code, ward_code, address_line, consent_status, lat, lng)
     values ($1, $2, $3, $4, '2 E2E Map St', 'granted', 21.03, 105.85) returning id`,
    [`e2e-map-game-cafe-${Date.now()}`, 'E2E Map Game Cafe', provinceCode, wardCode],
  );
  const gameCafeId = gameCafeRes.rows[0].id as string;
  await client.query('insert into cafe_games (cafe_id, game_id) values ($1, $2)', [
    gameCafeId,
    gameId,
  ]);

  const plainCafeRes = await client.query(
    `insert into cafes (slug, name, province_code, ward_code, address_line, consent_status, lat, lng)
     values ($1, $2, $3, $4, '3 E2E Map St', 'granted', 21.04, 105.86) returning id`,
    [`e2e-map-plain-cafe-${Date.now()}`, 'E2E Map Plain Cafe', provinceCode, wardCode],
  );
  const plainCafeId = plainCafeRes.rows[0].id as string;

  try {
    await page.goto('/map');
    const cafeMap = page.getByTestId('cafe-map');
    await expect(cafeMap).toBeVisible();
    await expect(cafeMap).toHaveAttribute('data-map-ready', 'true');

    const list = page.getByText('Danh sách quán').locator('..');
    await expect(list.getByText('E2E Map Game Cafe')).toBeVisible();
    await expect(list.getByText('E2E Map Plain Cafe')).toBeVisible();

    await page.getByPlaceholder('Tên game...').fill('E2E Map Filter Game');
    await page.getByRole('button', { name: 'Tìm' }).click();
    await page.getByRole('button', { name: 'E2E Map Filter Game' }).click();

    await expect(list.getByText('E2E Map Game Cafe')).toBeVisible();
    await expect(list.getByText('E2E Map Plain Cafe')).not.toBeVisible();
  } finally {
    await client.query('delete from cafe_games where cafe_id = $1', [gameCafeId]);
    await client.query('delete from cafes where id = any($1)', [[gameCafeId, plainCafeId]]);
    await client.query('delete from games where id = $1', [gameId]);
  }
});
