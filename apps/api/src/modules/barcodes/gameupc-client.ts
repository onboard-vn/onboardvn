import type { GameUpcCandidate } from '@onboard/shared';
import { env } from '../../lib/env.js';

export interface BarcodeProvider {
  readonly name: string;
  lookup(code: string): Promise<GameUpcCandidate[]>;
  vote(code: string, bggId: number, userId: string): Promise<void>;
}

interface GameUpcBggInfo {
  id: number;
  name: string;
  confidence: number;
}

interface GameUpcResponse {
  bgg_info?: GameUpcBggInfo[];
}

const TIMEOUT_MS = 5_000;

export class GameUpcClient implements BarcodeProvider {
  readonly name = 'gameupc';

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private async request(path: string, init: RequestInit): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          headers: { ...init.headers, 'x-api-key': this.apiKey },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.status >= 500 && attempt === 0) continue;
        return res;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('GameUPC request failed');
  }

  async lookup(code: string): Promise<GameUpcCandidate[]> {
    const res = await this.request(`/upc/${code}`, { method: 'GET' });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`GameUPC lookup failed: ${res.status}`);
    const body = (await res.json()) as GameUpcResponse;
    return (body.bgg_info ?? []).map((c) => ({
      bggId: c.id,
      name: c.name,
      confidence: c.confidence,
    }));
  }

  async vote(code: string, bggId: number, userId: string): Promise<void> {
    const res = await this.request(`/upc/${code}/bgg_id/${bggId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) throw new Error(`GameUPC vote failed: ${res.status}`);
  }
}

/** GameUPC is optional: only enabled when both env vars are set (unset in MVP). */
export function createBarcodeProviderFromEnv(): BarcodeProvider | undefined {
  if (!env.GAMEUPC_BASE_URL || !env.GAMEUPC_API_KEY) return undefined;
  return new GameUpcClient(env.GAMEUPC_BASE_URL, env.GAMEUPC_API_KEY);
}
