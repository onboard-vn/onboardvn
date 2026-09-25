import { expect, test, type Browser, type Page } from '@playwright/test';
import { Client } from 'pg';

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://onboard:onboard@localhost:54329/onboard';
const stamp = Date.now();
const password = 'e2e cafe owner password';
const adminEmail = `e2e-owner-admin-${stamp}@onboard.test`;
const ownerA = { username: `e2e_owner_a_${stamp}`, email: `e2e-owner-a-${stamp}@onboard.test` };
const ownerB = { username: `e2e_owner_b_${stamp}`, email: `e2e-owner-b-${stamp}@onboard.test` };

let client: Client;
let provinceCode: string;
let wardCode: string;
let cafeAId: string;
let cafeASlug: string;
let cafeBId: string;
let cafeBSlug: string;
let adminUserId: string | undefined;
let importGameIds: string[] = [];
const importGameNames = Array.from({ length: 4 }, (_, i) => `E2E Import Game ${i + 1} ${stamp}`);

test.beforeAll(async () => {
  client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const province = await client.query('select code from provinces limit 1');
  provinceCode = province.rows[0].code as string;
  const ward = await client.query('select code from wards where province_code = $1 limit 1', [
    provinceCode,
  ]);
  wardCode = ward.rows[0].code as string;

  cafeASlug = `e2e-owner-cafe-a-${stamp}`;
  cafeBSlug = `e2e-owner-cafe-b-${stamp}`;

  const cafeARes = await client.query(
    `insert into cafes (slug, name, province_code, ward_code, address_line, consent_status, source_url)
     values ($1, 'E2E Owner Cafe A', $2, $3, '1 E2E St', 'public_info_only', 'https://example.test/a') returning id`,
    [cafeASlug, provinceCode, wardCode],
  );
  cafeAId = cafeARes.rows[0].id as string;

  const cafeBRes = await client.query(
    `insert into cafes (slug, name, province_code, ward_code, address_line, consent_status, source_url)
     values ($1, 'E2E Owner Cafe B', $2, $3, '2 E2E St', 'public_info_only', 'https://example.test/b') returning id`,
    [cafeBSlug, provinceCode, wardCode],
  );
  cafeBId = cafeBRes.rows[0].id as string;

  const gamesRes = await client.query(
    `insert into games (slug, name_en) select unnest($1::text[]), unnest($2::text[]) returning id`,
    [importGameNames.map((_, i) => `e2e-import-game-${i + 1}-${stamp}`), importGameNames],
  );
  importGameIds = gamesRes.rows.map((r: { id: string }) => r.id);
});

test.afterAll(async () => {
  await client.query('delete from cafe_inventory_imports where cafe_id = any($1)', [
    [cafeAId, cafeBId],
  ]);
  await client.query('delete from cafe_games where cafe_id = any($1)', [[cafeAId, cafeBId]]);
  await client.query('delete from cafe_owner_invites where cafe_id = any($1)', [
    [cafeAId, cafeBId],
  ]);
  await client.query('delete from cafe_members where cafe_id = any($1)', [[cafeAId, cafeBId]]);
  await client.query('delete from cafes where id = any($1)', [[cafeAId, cafeBId]]);
  await client.query('delete from games where id = any($1)', [importGameIds]);
  await client.query('delete from sessions where user_id = any($1)', [
    (
      await client.query('select id from users where email = any($1)', [
        [adminEmail, ownerA.email, ownerB.email],
      ])
    ).rows.map((r: { id: string }) => r.id),
  ]);
  await client.query('delete from users where email = any($1)', [
    [adminEmail, ownerA.email, ownerB.email],
  ]);
  await client.query('delete from verifications where identifier = $1', [
    `sign-in-otp-${adminEmail}`,
  ]);
  await client.end();
});

async function readLatestOtp(email: string): Promise<string> {
  const res = await client.query(
    `select value from verifications where identifier = $1 order by created_at desc limit 1`,
    [`sign-in-otp-${email}`],
  );
  const value = res.rows[0]?.value as string | undefined;
  if (!value) throw new Error('OTP verification row not found');
  return value.split(':')[0]!;
}

async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByRole('tab', { name: 'Mã qua email' }).click();
  await page.getByLabel('Email', { exact: true }).fill(adminEmail);
  await page.getByRole('button', { name: 'Gửi mã đăng nhập' }).click();
  await expect(page.getByLabel(/Mã gửi tới/)).toBeVisible();
  const otp = await readLatestOtp(adminEmail);
  await page.getByLabel(/Mã gửi tới/).fill(otp);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL('/');

  if (!adminUserId) {
    const userRes = await client.query('select id from users where email = $1', [adminEmail]);
    adminUserId = userRes.rows[0]?.id as string | undefined;
    if (!adminUserId) throw new Error('e2e admin user was not created by the OTP sign-in flow');
    await client.query("update users set role = 'maintainer' where id = $1", [adminUserId]);
  }
}

async function signUp(page: Page, acc: { username: string; email: string }) {
  await page.getByLabel('Tên đăng nhập').fill(acc.username);
  await page.getByLabel('Email').fill(acc.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByLabel('Nhập lại mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng ký' }).click();
  await expect(page).toHaveURL(/\/check-email/);
}

async function signIn(page: Page, acc: { username: string; email: string }) {
  await page.getByLabel('Tên đăng nhập hoặc email').fill(acc.username);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}

/** Exercises the invite -> signup(?next=) -> check-email(?next=) -> login(?next=) chain end to
 * end instead of navigating straight to /signup, so the `next` propagation is actually tested. */
async function signUpFromInvitePage(
  browser: Browser,
  acc: { username: string; email: string },
  invitePath: string,
): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(invitePath);
  await page.getByRole('main').getByRole('link', { name: 'Đăng ký' }).click();
  await expect(page).toHaveURL(new RegExp(`/signup\\?next=${encodeURIComponent(invitePath)}`));
  await signUp(page, acc);
  await expect(page).toHaveURL(new RegExp(`next=${encodeURIComponent(invitePath)}`));

  await client.query('update users set email_verified = true where email = $1', [acc.email]);

  const loginHref = await page
    .getByRole('main')
    .getByRole('link', { name: 'đăng nhập' })
    .getAttribute('href');
  expect(loginHref).toBe(`/login?next=${encodeURIComponent(invitePath)}`);
  await page.goto(loginHref!);
  await signIn(page, acc);
  await expect(page).toHaveURL(invitePath);
  return page;
}

async function createInviteUrl(page: Page, cafeId: string): Promise<string> {
  await page.goto(`/admin/cafes/${cafeId}/edit`);
  await page.getByRole('button', { name: 'Tạo link mời mới' }).click();
  const codeText = await page.locator('code').innerText();
  return codeText.trim();
}

test('admin invites an owner who accepts, grants consent, edits hours, then a second owner declines', async ({
  browser,
}) => {
  const adminPage = await (await browser.newContext()).newPage();
  await loginAdmin(adminPage);

  const inviteUrlA = await createInviteUrl(adminPage, cafeAId);
  const invitePathA = new URL(inviteUrlA).pathname;
  const inviteUrlB = await createInviteUrl(adminPage, cafeBId);
  const invitePathB = new URL(inviteUrlB).pathname;

  // Owner A: sign up via the invite page's link (carries `next` through signup+login), accept,
  // grant consent, edit opening hours.
  const ownerAPage = await signUpFromInvitePage(browser, ownerA, invitePathA);

  await ownerAPage.getByRole('button', { name: 'Xác nhận là chủ quán' }).click();
  await expect(ownerAPage).toHaveURL(`/my-cafes/${cafeAId}/consent`);

  await ownerAPage.getByRole('button', { name: 'Đồng ý hiển thị' }).click();
  await expect(ownerAPage.getByText('granted')).toBeVisible();

  await ownerAPage.goto(`/my-cafes/${cafeAId}`);
  await ownerAPage.getByLabel('Giờ mở cửa').fill('9:00–23:00 hằng ngày');
  await ownerAPage.getByRole('button', { name: 'Lưu thay đổi' }).click();
  // Wait for the PATCH to actually resolve, not just for the click to fire — otherwise the
  // publicPage navigation below can race the write and load the café before it's persisted.
  await expect(ownerAPage.getByText('Đã lưu.')).toBeVisible();

  const publicPage = await (await browser.newContext()).newPage();
  await publicPage.goto(`/cafes/${cafeASlug}`);
  await expect(publicPage.getByText('9:00–23:00 hằng ngày')).toBeVisible();

  // Import kho CSV: 5 rows, one unmatched name is skipped automatically (no game selected).
  await ownerAPage.goto(`/my-cafes/${cafeAId}/import`);
  const csv = [
    'name,nameEn,bggId,copies',
    ...importGameNames.map((name) => `${name},,,1`),
    'Totally Unknown Game Not In Catalog,,,1',
  ].join('\n');
  await ownerAPage
    .locator('input[type=file]')
    .setInputFiles({ name: 'inventory.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(ownerAPage.getByRole('button', { name: 'Thêm 4 game vào kho' })).toBeVisible();
  await ownerAPage.getByRole('button', { name: 'Thêm 4 game vào kho' }).click();
  await expect(ownerAPage.getByText('Đã áp dụng 4 dòng.')).toBeVisible();

  await publicPage.goto(`/cafes/${cafeASlug}`);
  await expect(publicPage.getByText('Kho game (4)')).toBeVisible();

  // Owner B: accept, then decline -> café disappears from public site.
  const ownerBPage = await signUpFromInvitePage(browser, ownerB, invitePathB);

  await ownerBPage.getByRole('button', { name: 'Xác nhận là chủ quán' }).click();
  await expect(ownerBPage).toHaveURL(`/my-cafes/${cafeBId}/consent`);

  await ownerBPage.getByRole('button', { name: 'Từ chối hiển thị' }).click();
  await expect(ownerBPage.getByText('declined')).toBeVisible();

  const publicRes = await publicPage.goto(`/cafes/${cafeBSlug}`);
  expect(publicRes?.status()).toBe(404);
});
