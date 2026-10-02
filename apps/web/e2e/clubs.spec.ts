import { expect, test, type Browser, type Page } from '@playwright/test';
import { Client } from 'pg';

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://onboard:onboard@localhost:54329/onboard';
const stamp = Date.now();
const password = 'e2e clubs password';

interface Account {
  username: string;
  email: string;
}

function account(tag: string): Account {
  return { username: `e2e_${tag}_${stamp}`, email: `e2e-${tag}-${stamp}@onboard.test` };
}

const alice = account('club_a');
const bob = account('club_b');
const carol = account('club_c');

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

async function newSignedUpPage(browser: Browser, acc: Account): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signUp(page, acc);
  return page;
}

test.beforeAll(async () => {
  client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const province = await client.query('select code from provinces limit 1');
  provinceCode = province.rows[0].code as string;
});

test.afterAll(async () => {
  // Clean up: delete users, which cascades to clubs, events, memberships via foreign keys
  await client.query('delete from users where email = any($1)', [
    [alice.email, bob.email, carol.email],
  ]);
  await client.end();
});

test('A creates private club → B joins via invite → A creates club Kèo → B sees it; C forbidden; A removes B → B cannot see', async ({
  browser,
}) => {
  // Step 1: Sign up three users
  const aPage = await newSignedUpPage(browser, alice);
  const bPage = await newSignedUpPage(browser, bob);
  const cPage = await newSignedUpPage(browser, carol);

  // Verify emails
  await client.query('update users set email_verified = true where email = any($1)', [
    [alice.email, bob.email, carol.email],
  ]);

  // Sign in all users
  await signIn(aPage, alice);
  await signIn(bPage, bob);
  await signIn(cPage, carol);

  // Step 2: A creates a private club
  await aPage.goto('/clubs/new');
  const clubName = `Club ${stamp}`;
  await aPage.getByLabel('Tên club').fill(clubName);
  await aPage.getByLabel('Mô tả (tùy chọn)').fill('Test club for Kèo visibility');
  await aPage.getByRole('button', { name: 'Tạo club' }).click();

  // Wait for club creation and capture invite URL
  await expect(aPage.getByText(`Đã tạo club "${clubName}"`)).toBeVisible();
  let inviteUrl: string | null = null;
  const inviteText = await aPage.getByRole('code').innerText();
  if (inviteText) {
    inviteUrl = inviteText.trim();
  }
  expect(inviteUrl).toBeTruthy();

  // Click "Vào club" to navigate to club page (rendered as link, not button)
  await aPage.getByRole('link', { name: 'Vào club' }).click();
  await expect(aPage).toHaveURL(/\/clubs\/[^/]+$/);
  const clubUrl = aPage.url();
  const clubSlug = clubUrl.split('/').pop();

  // Step 3: B joins via invite link
  expect(inviteUrl).toBeTruthy();
  const joinUrl = new URL(inviteUrl!);
  await bPage.goto(joinUrl.pathname);
  await expect(bPage.getByRole('heading', { name: 'Tham gia club' })).toBeVisible();
  await bPage.getByRole('button', { name: 'Tham gia' }).click();
  await expect(bPage).toHaveURL(/\/clubs\/[^/]+$/);
  const bClubUrl = bPage.url();
  expect(bClubUrl).toBe(clubUrl);

  // Verify B is now a member (check member count increased)
  await expect(bPage.getByRole('heading', { name: /Thành viên \(2\)/ })).toBeVisible();

  // Step 4: A creates Kèo with "club" visibility
  await aPage.goto(`/clubs/${clubSlug}`);
  await aPage.getByRole('link', { name: 'Tạo Kèo cho club' }).click();
  await expect(aPage.getByRole('heading', { name: 'Tạo kèo' })).toBeVisible();

  const eventTitle = `Kèo ${stamp}`;
  const startsAt = futureLocalDateTime(3);

  await aPage.getByLabel('Tiêu đề').fill(eventTitle);
  await aPage.getByLabel('Bắt đầu').fill(startsAt);

  // Select address mode
  await aPage.getByRole('tab', { name: 'Địa chỉ tự do' }).click();
  await aPage.getByLabel('Địa chỉ').fill('123 Đường E2E');
  await aPage.getByLabel('Tỉnh/thành').selectOption(provinceCode);

  // Explicitly select "Chỉ club" visibility and ensure club is selected
  await aPage.locator('input[value="club"]').check();

  // Wait for club selector to appear and select the club
  const clubSelect = aPage.locator('select[aria-label="Club"]');
  await expect(clubSelect).toBeVisible();
  // Get the first option (should be the club we just created)
  const clubOptions = await clubSelect.locator('option').count();
  if (clubOptions > 0) {
    // Select the first club in the list
    await clubSelect.selectOption({ index: 0 });
  }

  // Submit
  await aPage.getByRole('button', { name: 'Tạo kèo' }).click();
  await expect(aPage.getByText('Link mời (chỉ hiện một lần')).toBeVisible();

  // Navigate to event detail
  await aPage.getByRole('link', { name: 'Xem Kèo' }).click();
  await expect(aPage.getByRole('heading', { name: eventTitle })).toBeVisible();
  const eventUrl = aPage.url();
  const eventSlug = eventUrl.split('/').pop();

  // Step 5: B can see the Kèo on club page and event detail
  await bPage.goto(`/clubs/${clubSlug}`);
  await expect(bPage.getByText(eventTitle)).toBeVisible();

  await bPage.goto(`/events/${eventSlug}`);
  await expect(bPage.getByRole('heading', { name: eventTitle })).toBeVisible();

  // Step 6: C (non-member) cannot access club-scoped event - gets 404
  // Navigate and check the response status
  const cResponse = await cPage.goto(`/events/${eventSlug}`);
  expect(cResponse?.status()).toBe(404);

  // Step 7: A goes to manage and removes B
  await aPage.goto(`/clubs/${clubSlug}/manage`);
  await expect(aPage.getByRole('heading', { name: `Quản lý ${clubName}` })).toBeVisible();

  // Find B in the member list and click remove
  const memberRow = aPage.locator('li').filter({ has: aPage.getByText(bob.username) });
  const removeButton = memberRow.getByRole('button', { name: 'Xóa' });

  // Set up dialog handler before clicking
  aPage.on('dialog', (dialog) => {
    void dialog.accept();
  });

  await removeButton.click();

  // Wait for member to disappear and page to refresh
  await expect(memberRow).not.toBeVisible({ timeout: 10000 });

  // Step 8: B can no longer see the event after being removed
  const bResponse = await bPage.goto(`/events/${eventSlug}`);
  expect(bResponse?.status()).toBe(404);
});
