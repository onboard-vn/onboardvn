import { expect, test } from '@playwright/test';
import { Client } from 'pg';

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://onboard:onboard@localhost:54329/onboard';
const stamp = Date.now();
const USERNAME = `e2e_pw_${stamp}`;
const EMAIL = `e2e-pw-${stamp}@onboard.test`;
const PASSWORD = 'e2e password 123';

let client: Client;

test.beforeAll(async () => {
  client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
});

test.afterAll(async () => {
  await client.query('delete from users where email = $1', [EMAIL]);
  await client.end();
});

test('signs up with username + password, then signs in with the username', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Tên đăng nhập').fill(USERNAME);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Nhập lại mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng ký' }).click();

  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByText(EMAIL)).toBeVisible();

  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập hoặc email').fill(USERNAME);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByText(/chưa được xác minh/)).toBeVisible();

  // The verification link itself is covered by the API test; e2e only needs a verified account.
  await client.query('update users set email_verified = true where email = $1', [EMAIL]);

  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('banner')).toContainText(USERNAME);
});
