import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { fakeAuth, fakeUser } from '../test/fake-auth.js';

const app = createApp({ auth: fakeAuth(fakeUser('maintainer')), rateLimit: false });
const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

function formBody(): FormData {
  const form = new FormData();
  form.set('file', new File([new Uint8Array([1])], 'x.png', { type: 'image/png' }));
  return form;
}

describe('CSRF protection', () => {
  it('rejects a cross-origin form POST to a mutating API route', async () => {
    const res = await app.request(`/api/games/${UNKNOWN_ID}/image`, {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
      body: formBody(),
    });

    expect(res.status).toBe(403);
  });

  it('does not block a same-origin form POST', async () => {
    const res = await app.request(`/api/games/${UNKNOWN_ID}/image`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: formBody(),
    });

    // CSRF passes; the route then 404s because the game id doesn't exist.
    expect(res.status).not.toBe(403);
  });

  it('does not block /api/auth/* routes even cross-origin', async () => {
    const res = await app.request('/api/auth/sign-out', {
      method: 'POST',
      headers: { origin: 'https://evil.example', 'content-type': 'text/plain' },
    });

    expect(res.status).not.toBe(403);
  });
});
