import { expect, test, type Browser, type Page } from '@playwright/test';
import { Client } from 'pg';

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://onboard:onboard@localhost:54329/onboard';
const stamp = Date.now();
const password = 'e2e shelf visibility password';

interface Account {
  username: string;
  email: string;
}

function account(tag: string): Account {
  return { username: `e2e_${tag}_${stamp}`, email: `e2e-${tag}-${stamp}@onboard.test` };
}

// APIRequestContext does not auto-attach an Origin header like a real browser fetch does;
// the API's CSRF middleware requires one on same-site POSTs.
const ORIGIN_HEADERS = { origin: 'http://localhost:3100' };

const bob = account('shelf_b');
const alice = account('shelf_a');
const carol = account('shelf_c');
const dave = account('shelf_d');

let client: Client;
let gameId: string;
const gameName = `E2E Shelf Game ${stamp}`;

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

async function userId(email: string): Promise<string> {
  const res = await client.query('select id from users where email = $1', [email]);
  return res.rows[0].id as string;
}

test.beforeAll(async () => {
  client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const gameRes = await client.query(
    `insert into games (slug, name_en) values ($1, $2) returning id`,
    [`e2e-shelf-game-${stamp}`, gameName],
  );
  gameId = gameRes.rows[0].id as string;
});

test.afterAll(async () => {
  await client.query('delete from user_games where game_id = $1', [gameId]);
  await client.query('delete from games where id = $1', [gameId]);
  await client.query('delete from users where email = any($1)', [
    [bob.email, alice.email, carol.email, dave.email],
  ]);
  await client.end();
});

test('friends-level shelf: hidden to a stranger, visible to owner and friends, hidden when blocked', async ({
  browser,
}) => {
  const bPage = await newSignedUpPage(browser, bob);
  const aPage = await newSignedUpPage(browser, alice);
  const cPage = await newSignedUpPage(browser, carol);
  const dPage = await newSignedUpPage(browser, dave);

  await client.query('update users set email_verified = true where email = any($1)', [
    [bob.email, alice.email, carol.email, dave.email],
  ]);

  await signIn(bPage, bob);
  await signIn(aPage, alice);
  await signIn(cPage, carol);
  await signIn(dPage, dave);

  const addToShelf = await bPage.request.post('/api/me/shelf', {
    data: { gameId },
    headers: ORIGIN_HEADERS,
  });
  expect(addToShelf.ok()).toBe(true);

  await client.query("update users set profile_visibility = 'friends' where email = $1", [
    bob.email,
  ]);

  // Stranger, not yet a friend: hidden.
  await cPage.goto(`/u/${bob.username}`);
  await expect(cPage.getByText('Hồ sơ riêng tư.')).toBeVisible();
  await expect(cPage.getByText(gameName)).not.toBeVisible();

  // Owner viewing their own profile always sees it.
  await bPage.goto(`/u/${bob.username}`);
  await expect(bPage.getByText(gameName)).toBeVisible();

  // Cross friend requests to become friends (mirrors the auto-accept flow used elsewhere).
  await aPage.request.post('/api/friends/requests', {
    data: { username: bob.username },
    headers: ORIGIN_HEADERS,
  });
  await bPage.request.post('/api/friends/requests', {
    data: { username: alice.username },
    headers: ORIGIN_HEADERS,
  });

  await aPage.goto(`/u/${bob.username}`);
  await expect(aPage.getByText(gameName)).toBeVisible();

  // Block Dave, then reopen the profile to the public: a block still hides it from Dave.
  const daveId = await userId(dave.email);
  await bPage.request.post('/api/blocks', { data: { userId: daveId }, headers: ORIGIN_HEADERS });
  await client.query("update users set profile_visibility = 'public' where email = $1", [
    bob.email,
  ]);

  await dPage.goto(`/u/${bob.username}`);
  await expect(dPage.getByText('Hồ sơ riêng tư.')).toBeVisible();
  await expect(dPage.getByText(gameName)).not.toBeVisible();
});
