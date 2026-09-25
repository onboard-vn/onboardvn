import { expect, test, type Browser, type Page } from '@playwright/test';
import { Client } from 'pg';

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://onboard:onboard@localhost:54329/onboard';
const stamp = Date.now();
const password = 'e2e friends password';

interface Account {
  username: string;
  email: string;
}

function account(tag: string): Account {
  return { username: `e2e_${tag}_${stamp}`, email: `e2e-${tag}-${stamp}@onboard.test` };
}

const alice = account('friend_a');
const bob = account('friend_b');
const carol = account('friend_c');
const dave = account('friend_d');

let client: Client;

async function signUp(page: Page, acc: Account) {
  await page.goto('/signup');
  await page.getByLabel('Tên đăng nhập').fill(acc.username);
  await page.getByLabel('Email').fill(acc.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByLabel('Nhập lại mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng ký' }).click();
  await expect(page).toHaveURL(/\/check-email/);
}

async function signIn(page: Page, acc: Account) {
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập hoặc email').fill(acc.username);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function newSignedUpPage(browser: Browser, acc: Account): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signUp(page, acc);
  return page;
}

test.beforeAll(async () => {
  client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
});

test.afterAll(async () => {
  await client.query('delete from users where email = any($1)', [
    [alice.email, bob.email, carol.email, dave.email],
  ]);
  await client.end();
});

test('A opens B invite link and they become friends; C requests D and D accepts', async ({
  browser,
}) => {
  const aPage = await newSignedUpPage(browser, alice);
  const bPage = await newSignedUpPage(browser, bob);
  const cPage = await newSignedUpPage(browser, carol);
  const dPage = await newSignedUpPage(browser, dave);

  await client.query('update users set email_verified = true where email = any($1)', [
    [alice.email, bob.email, carol.email, dave.email],
  ]);

  await signIn(aPage, alice);
  await signIn(bPage, bob);
  await signIn(cPage, carol);
  await signIn(dPage, dave);

  await bPage.goto('/account');
  const inviteText = await bPage.getByText(/\/invite\//).innerText();
  const inviteUrl = new URL(inviteText.trim());

  await aPage.goto(inviteUrl.pathname);
  await aPage.getByRole('button', { name: 'Xác nhận kết bạn' }).click();
  await expect(aPage.getByText('Đã kết bạn.')).toBeVisible();

  await aPage.goto('/friends');
  await expect(aPage.getByText(bob.username, { exact: false })).toBeVisible();
  await bPage.goto('/friends');
  await expect(bPage.getByText(alice.username, { exact: false })).toBeVisible();

  await cPage.goto(`/u/${dave.username}`);
  await cPage.getByRole('button', { name: 'Kết bạn' }).click();
  await expect(cPage.getByRole('button', { name: 'Đã gửi lời mời' })).toBeVisible();

  await dPage.goto('/');
  await expect(dPage.getByRole('banner').getByText('1', { exact: true })).toBeVisible();

  await dPage.goto('/friends');
  await dPage.getByRole('tab', { name: 'Lời mời' }).click();
  await expect(dPage.getByText(carol.username, { exact: false })).toBeVisible();
  await dPage.getByRole('button', { name: 'Chấp nhận' }).click();
  await expect(dPage.getByText('Không có lời mời nào.')).toBeVisible();

  await dPage.goto('/friends');
  await expect(dPage.getByText(carol.username, { exact: false })).toBeVisible();
});
