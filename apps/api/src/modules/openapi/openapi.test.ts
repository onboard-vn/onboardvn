import { validate } from '@readme/openapi-parser';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { fakeAuth } from '../../test/fake-auth.js';

const publicApp = createApp({ auth: fakeAuth(null), rateLimit: false });

describe('GET /api/openapi.json', () => {
  it('serves a document that validates as OpenAPI', async () => {
    const res = await publicApp.request('/api/openapi.json');
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown> };

    expect(doc.openapi).toBe('3.0.3');
    expect(doc.paths['/cafes/{slug}']).toBeDefined();

    // The zod-generated component schemas are structurally OpenAPI-compatible JSON but don't
    // match openapi-types' strict SchemaObject typing; validate() only cares about the JSON shape.
    const result = await validate(doc as unknown as Parameters<typeof validate>[0]);
    expect(result.valid).toBe(true);
  });

  it('sets public Cache-Control with Vary: Cookie for anonymous GETs', async () => {
    const res = await publicApp.request('/api/openapi.json');
    expect(res.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300');
    expect(res.headers.get('vary')).toContain('Cookie');
  });
});
