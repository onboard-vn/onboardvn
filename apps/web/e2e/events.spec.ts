import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://onboard:onboard@localhost:54329/onboard';
const stamp = Date.now();
const password = 'e2e events password';

interface Account {
  username: string;
  email: string;
}

function account(tag: string): Account {
  return { username: `e2e_${tag}_${stamp}`, email: `e2e-${tag}-${stamp}@onboard.test` };
}

const host = account('ev_host');
const guest = account('ev_guest');
const stranger = account('ev_stranger');

let client: Client;
let provinceCode: string;

function futureLocalDateTime(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(19, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
}

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

test.beforeAll(async () => {
  client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const province = await client.query('select code from provinces limit 1');
  provinceCode = province.rows[0].code as string;
});

test.afterAll(async () => {
  // `meetups.created_by`, `meetup_tables.host_user_id` and `meetup_participants.user_id` all
  // cascade on user delete (see phase-06 data model), so this alone clears every row created here.
  await client.query('delete from users where email = any($1)', [
    [host.email, guest.email, stranger.email],
  ]);
  await client.end();
});

test('host creates a Kèo with 2 tables, guest RSVPs and sits, calendar reflects it; private Kèo hidden from strangers', async ({
  browser,
}) => {
  const hostCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  await signUp(hostPage, host);

  const guestCtx = await browser.newContext();
  const guestPage = await guestCtx.newPage();
  await signUp(guestPage, guest);

  const strangerCtx = await browser.newContext();
  const strangerPage = await strangerCtx.newPage();
  await signUp(strangerPage, stranger);

  await client.query('update users set email_verified = true where email = any($1)', [
    [host.email, guest.email, stranger.email],
  ]);

  await signIn(hostPage, host);
  await signIn(guestPage, guest);
  await signIn(strangerPage, stranger);

  const startsAt = futureLocalDateTime(3);

  await hostPage.goto('/events/new');
  await hostPage.getByLabel('Tiêu đề').fill(`Kèo E2E ${stamp}`);
  await hostPage.getByLabel('Bắt đầu').fill(startsAt);
  await hostPage.getByRole('tab', { name: 'Địa chỉ tự do' }).click();
  await hostPage.getByLabel('Địa chỉ').fill('123 Đường E2E');
  await hostPage.getByLabel('Tỉnh/thành').selectOption(provinceCode);
  await hostPage.getByLabel('Tạo bàn đầu tiên (bạn sẽ là host)').check();
  await hostPage.getByRole('button', { name: 'Tạo kèo' }).click();

  await expect(hostPage.getByText('Link mời (chỉ hiện một lần')).toBeVisible();
  const inviteUrl = await hostPage.locator('code').innerText();
  await hostPage.getByRole('link', { name: 'Xem Kèo' }).click();
  await expect(hostPage.getByRole('heading', { name: `Kèo E2E ${stamp}` })).toBeVisible();

  // Second table.
  await hostPage.getByRole('button', { name: 'Tạo bàn mới' }).click();
  await hostPage.getByRole('button', { name: 'Tạo bàn', exact: true }).click();
  await expect(hostPage.getByText('Bàn (2)')).toBeVisible();

  // Guest opens the invite link, RSVPs going, then sits at the first table.
  const invitePath = new URL(inviteUrl).pathname + new URL(inviteUrl).search;
  await guestPage.goto(invitePath);
  await expect(guestPage).toHaveURL(new RegExp(`/events/.*`));
  await guestPage.getByRole('button', { name: 'Đi', exact: true }).click();
  await expect(guestPage.getByText('Bạn đang tham gia')).toBeVisible();
  await guestPage.getByRole('button', { name: 'Ngồi bàn này' }).first().click();
  await expect(guestPage.getByRole('button', { name: 'Rời bàn' })).toBeVisible();

  // Calendar shows that day with the right players/tables aggregate.
  const dateKey = startsAt.slice(0, 10);
  const month = dateKey.slice(0, 7);
  await hostPage.goto(`/events?view=calendar&month=${month}`);
  await expect(hostPage.getByText('2 người · 2 bàn')).toBeVisible();
  await hostPage.getByText('2 người · 2 bàn').click();
  await expect(hostPage.getByRole('heading', { name: `Kèo ngày ${dateKey}` })).toBeVisible();
  await expect(hostPage.getByText(`Kèo E2E ${stamp}`)).toBeVisible();

  // Private Kèo: not listed for a stranger.
  await hostPage.goto('/events/new');
  await hostPage.getByLabel('Tiêu đề').fill(`Kèo riêng tư E2E ${stamp}`);
  await hostPage.getByLabel('Bắt đầu').fill(futureLocalDateTime(4));
  await hostPage.getByRole('tab', { name: 'Địa chỉ tự do' }).click();
  await hostPage.getByLabel('Địa chỉ').fill('456 Đường E2E');
  await hostPage.getByLabel('Tỉnh/thành').selectOption(provinceCode);
  await hostPage.getByLabel('Riêng tư').check();
  await hostPage.getByRole('button', { name: 'Tạo kèo' }).click();
  await expect(hostPage.getByText('Link mời (chỉ hiện một lần')).toBeVisible();

  await strangerPage.goto('/events');
  await expect(strangerPage.getByText(`Kèo riêng tư E2E ${stamp}`)).not.toBeVisible();
});
