import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';

const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).pathname !== '/onboard_test') {
  throw new Error('Game grouping e2e requires explicit E2E_DATABASE_URL ending in /onboard_test');
}
const stamp = Date.now();
const adminEmail = `e2e-group-admin-${stamp}@onboard.test`;
const staffEmail = `e2e-group-staff-${stamp}@onboard.test`;
const names = [
  'Source',
  'Target',
  'Variant',
  'Blocked source',
  'Blocked target',
  'Merge target',
].map((name) => `E2E grouping ${name} ${stamp}`);
let db: Client;
const games: { id: string; slug: string }[] = [];

test.beforeAll(async () => {
  db = new Client({ connectionString: databaseUrl });
  await db.connect();
  for (const [index, name] of names.entries()) {
    const row = await db.query(
      'insert into games (slug, name_en) values ($1, $2) returning id, slug',
      [`e2e-grouping-${stamp}-${index}`, name],
    );
    games.push(row.rows[0]);
  }
  await db.query('update games set aliases = $1::jsonb where id = $2', [
    JSON.stringify([
      { name: `Tên khác ${stamp}`, kind: 'name', language: 'vi' },
      { name: `Custom ${stamp}`, kind: 'custom' },
    ]),
    games[0]!.id,
  ]);
  await db.query('update games set variant_of_id = $1 where id = $2', [games[1]!.id, games[2]!.id]);
});

test.afterAll(async () => {
  if (!db) return;
  const created = await db.query(
    'select id, slug from games where created_by in (select id from users where email = any($1))',
    [[adminEmail, staffEmail]],
  );
  games.push(...created.rows);
  await db.query(
    'update games set canonical_id = null, variant_of_id = null where id = any($1::uuid[])',
    [games.map((game) => game.id)],
  );
  await db.query('delete from games where id = any($1::uuid[])', [games.map((game) => game.id)]);
  await db.query('delete from users where email = any($1)', [[adminEmail, staffEmail]]);
  await db.query('delete from verifications where identifier = any($1)', [
    [adminEmail, staffEmail].map((email) => `sign-in-otp-${email}`),
  ]);
  await db.end();
});

async function login(page: Page, email: string, role: 'admin' | 'maintainer') {
  await page.goto('/login');
  await page.getByRole('tab', { name: 'Mã qua email' }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Gửi mã đăng nhập' }).click();
  await expect(page.getByLabel(/Mã gửi tới/)).toBeVisible();
  const otp = await db.query(
    'select value from verifications where identifier = $1 order by created_at desc limit 1',
    [`sign-in-otp-${email}`],
  );
  await page.getByLabel(/Mã gửi tới/).fill(String(otp.rows[0].value).split(':')[0]!);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL('/');
  await db.query('update users set role = $1 where email = $2', [role, email]);
}

async function preview(page: Page, source: number, target: number) {
  await page.goto(`/admin/games/${games[source]!.slug}/edit`);
  const panel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Gộp game trùng' }) });
  await panel.getByLabel('Game đích sẽ được giữ trong danh mục').fill(names[target]!);
  await panel.getByRole('button', { name: 'Tìm', exact: true }).click();
  await panel.getByRole('button', { name: 'Chọn', exact: true }).click();
  await panel.getByRole('button', { name: 'Xem trước', exact: true }).click();
  return panel;
}

test('aliases resolve once and rules-changing versions link both ways', async ({
  page,
  request,
}) => {
  const response = await request.get(
    `http://localhost:8787/api/games?q=${encodeURIComponent(`Tên khác ${stamp}`)}`,
  );
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.items.map((game: { id: string }) => game.id)).toEqual([games[0]!.id]);
  expect(result.total).toBe(1);
  await page.goto(`/games/${games[2]!.slug}`);
  await expect(page.getByRole('link', { name: names[1], exact: true })).toBeVisible();
  await page.goto(`/games/${games[1]!.slug}`);
  await expect(page.getByRole('link', { name: names[2], exact: true })).toBeVisible();
});

test('admin previews, confirms a safe merge, and old links resolve to the target', async ({
  page,
}) => {
  await login(page, adminEmail, 'admin');
  const panel = await preview(page, 0, 5);
  const merge = panel.getByRole('button', { name: `Gộp vào ${names[5]}` });
  await expect(merge).toBeDisabled();
  await panel.getByRole('checkbox').check();
  await merge.click();
  await expect(page).toHaveURL(`/admin/games/${games[5]!.slug}/edit`);
  await page.goto(`/games/${games[0]!.slug}`);
  await expect(page).toHaveURL(`/games/${games[5]!.slug}`);
});

test('admin creates and edits aliases, custom names and a rules-changing parent through the form', async ({
  page,
}) => {
  await login(page, adminEmail, 'admin');
  await page.goto('/admin/games/new');
  await page.getByLabel('Tên tiếng Anh *', { exact: true }).fill(`E2E identity form ${stamp}`);
  await page.getByRole('button', { name: 'Thêm tên gọi' }).click();
  await page.locator('#alias-name-0').fill(`Form alias ${stamp}`);
  await page.locator('#alias-language-0').fill('vi');
  await page.getByRole('button', { name: 'Thêm tên gọi' }).click();
  await page.locator('#alias-name-1').fill(`Form custom ${stamp}`);
  await page.locator('#alias-kind-1').selectOption('custom');
  const identity = page.getByRole('group', { name: 'Tên gọi và phiên bản' });
  await identity.getByLabel('Game gốc nếu bản này đổi luật').fill(names[1]!);
  await identity.getByRole('button', { name: 'Tìm', exact: true }).click();
  await identity.getByRole('button', { name: 'Chọn', exact: true }).click();
  await page.locator('input[name="acceptLicense"]').check();
  await page.getByRole('button', { name: 'Tạo game', exact: true }).click();
  await expect(page).toHaveURL(/^http:\/\/localhost:3100\/games\/[^/]+$/);
  const row = await db.query(
    'select id, slug, aliases, variant_of_id from games where name_en = $1',
    [`E2E identity form ${stamp}`],
  );
  const created = row.rows[0];
  expect(created).toBeTruthy();
  games.push({ id: created.id, slug: created.slug });
  expect(created.aliases).toEqual([
    { name: `Form alias ${stamp}`, kind: 'name', language: 'vi' },
    { name: `Form custom ${stamp}`, kind: 'custom' },
  ]);
  expect(created.variant_of_id).toBe(games[1]!.id);
  await page.goto(`/admin/games/${created.slug}/edit`);
  await expect(page.locator('#alias-name-0')).toHaveValue(`Form alias ${stamp}`);
  await page.locator('#alias-name-0').fill(`Edited alias ${stamp}`);
  await page.locator('input[name="acceptLicense"]').check();
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page).toHaveURL(`/games/${created.slug}`);
  await expect(page.getByText(`Edited alias ${stamp}`)).toBeVisible();
  const updated = await db.query('select aliases from games where id = $1', [created.id]);
  expect(updated.rows[0].aliases[0].name).toBe(`Edited alias ${stamp}`);
});

test('inventory collision blocks merge and maintainer never sees merge controls', async ({
  page,
  browser,
}) => {
  await login(page, adminEmail, 'admin');
  const user = await db.query('select id from users where email = $1', [adminEmail]);
  await db.query(
    'insert into user_games (user_id, game_id, note) values ($1, $2, $4), ($1, $3, $5)',
    [user.rows[0].id, games[3]!.id, games[4]!.id, 'source inventory note', 'target inventory note'],
  );
  const panel = await preview(page, 3, 4);
  await expect(panel.getByRole('alert')).toContainText('Chưa thể gộp');
  await expect(panel.getByRole('button', { name: /^Gộp vào/ })).toHaveCount(0);
  const inventory = await db.query(
    'select note from user_games where game_id = any($1::uuid[]) order by note',
    [[games[3]!.id, games[4]!.id]],
  );
  expect(inventory.rows.map((row) => row.note)).toEqual([
    'source inventory note',
    'target inventory note',
  ]);
  const context = await browser.newContext();
  try {
    const staff = await context.newPage();
    await login(staff, staffEmail, 'maintainer');
    await staff.goto(`/admin/games/${games[4]!.slug}/edit`);
    await expect(staff.getByRole('heading', { name: 'Sửa game', exact: true })).toBeVisible();
    await expect(staff.getByRole('heading', { name: 'Gộp game trùng' })).toHaveCount(0);
  } finally {
    await context.close();
  }
});
