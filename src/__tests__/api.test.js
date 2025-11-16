import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import * as api from '../lib/api';

const sampleUser = { id: 1, username: 'jdoe', email: 'jdoe@example.com', role: 'customer' };
const sampleTokens = { access: 'access_v1', refresh: 'refresh_v1' };

const server = setupServer(
  // login
  rest.post('http://localhost:8000/api/auth/login/', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ user: sampleUser, tokens: sampleTokens }));
  }),

  // refresh endpoint: returns new access
  rest.post('http://localhost:8000/api/auth/token/refresh/', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ access: 'access_v2' }));
  }),

  // sweets list: if Authorization contains access_v1 -> 401, if access_v2 -> 200 with data
  rest.get('http://localhost:8000/api/sweets/', (req, res, ctx) => {
    const auth = req.headers.get('authorization') || '';
    if (auth.includes('access_v1')) {
      return res(ctx.status(401), ctx.json({ detail: 'token_expired' }));
    }
    if (auth.includes('access_v2')) {
      return res(ctx.status(200), ctx.json([{ id: 1, name: 'Nougat', price: '2.50', quantity_in_stock: 5 }]));
    }
    return res(ctx.status(401), ctx.json({ detail: 'no_token' }));
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

describe('api client - auth and refresh flows', () => {
  it('login stores tokens and caches user', async () => {
    const { user, tokens } = await api.login({ email: 'jdoe@example.com', password: 'pass' });
    expect(user).toEqual(sampleUser);
    expect(tokens).toEqual(sampleTokens);
    expect(localStorage.getItem('access_token')).toBe(sampleTokens.access);
    expect(localStorage.getItem('refresh_token')).toBe(sampleTokens.refresh);
    const cached = api.getCachedUserProfile();
    expect(cached).toEqual(sampleUser);
  });

  it('automatically refreshes access token on 401 and retries original request', async () => {
    // first simulate existing tokens where access is old
    localStorage.setItem('access_token', 'access_v1');
    localStorage.setItem('refresh_token', 'refresh_v1');

    const sweets = await api.listSweets();
    expect(Array.isArray(sweets)).toBe(true);
    expect(sweets[0].name).toBe('Nougat');

    // access token should have been replaced with new one from refresh
    expect(localStorage.getItem('access_token')).toBe('access_v2');
  });
});
