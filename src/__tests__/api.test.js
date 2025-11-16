import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import * as api from '../lib/api';

const API_BASE = api.API_BASE_URL.replace(/\/+$/, '');

const sampleUser = { id: 1, username: 'jdoe', email: 'jdoe@example.com', role: 'customer' };
const sampleAdmin = { id: 2, username: 'admin', email: 'admin@example.com', role: 'admin' };
const sampleTokens = { access: 'access_v1', refresh: 'refresh_v1' };

let lastLoginBody = null;
let lastRegisterBody = null;

const server = setupServer(
  // login
  http.post(`${API_BASE}/auth/login/`, async ({ request }) => {
    lastLoginBody = await request.json();
    return HttpResponse.json({ user: sampleUser, tokens: sampleTokens }, { status: 200 });
  }),

  // register
  http.post(`${API_BASE}/auth/register/`, async ({ request }) => {
    lastRegisterBody = await request.json();
    return HttpResponse.json({ user: sampleUser, tokens: sampleTokens }, { status: 201 });
  }),

  // refresh endpoint: returns new access
  http.post(`${API_BASE}/auth/token/refresh/`, () => {
    return HttpResponse.json({ access: 'access_v2' }, { status: 200 });
  }),

  // sweets list: if Authorization contains access_v1 -> 401, if access_v2 -> 200 with data
  http.get(`${API_BASE}/sweets/`, ({ request }) => {
    const auth = request.headers.get('authorization') || '';
    if (auth.includes('access_v1')) {
      return HttpResponse.json({ detail: 'token_expired' }, { status: 401 });
    }
    if (auth.includes('access_v2')) {
      return HttpResponse.json(
        [
          { id: 1, name: 'Nougat', price: '2.50', quantity_in_stock: 5 },
          { id: 2, name: 'Truffle', price: '5.00', quantity_in_stock: 0 },
        ],
        { status: 200 }
      );
    }
    return HttpResponse.json({ detail: 'no_token' }, { status: 401 });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

describe('api client - auth and refresh flows', () => {
  it('login sends only email + password and caches tokens/user', async () => {
    lastLoginBody = null;
    const { user, tokens } = await api.login({ email: 'jdoe@example.com', password: 'pass123' });
    expect(lastLoginBody).toEqual({ email: 'jdoe@example.com', password: 'pass123' });
    expect(user).toEqual(sampleUser);
    expect(tokens).toEqual(sampleTokens);
    expect(localStorage.getItem('access_token')).toBe(sampleTokens.access);
    expect(localStorage.getItem('refresh_token')).toBe(sampleTokens.refresh);
  });

  it('register sends username/email/password and stores tokens', async () => {
    lastRegisterBody = null;
    const payload = { username: 'newbie', email: 'newbie@example.com', password: 'StrongPass!1' };
    const { user } = await api.register(payload);
    expect(lastRegisterBody).toEqual(payload);
    expect(user).toEqual(sampleUser);
    expect(localStorage.getItem('access_token')).toBe(sampleTokens.access);
  });

  it('automatically refreshes access token on 401 and retries original request', async () => {
    // seed storage with stale tokens
    localStorage.setItem('access_token', 'access_v1');
    localStorage.setItem('refresh_token', 'refresh_v1');

    const sweets = await api.listSweets();
    expect(sweets).toHaveLength(2);
    expect(sweets[0].name).toBe('Nougat');

    // access token should have been replaced with new one from refresh
    expect(localStorage.getItem('access_token')).toBe('access_v2');
  });

  it('clears tokens and rejects when refresh fails', async () => {
    localStorage.setItem('access_token', 'access_v1');
    localStorage.setItem('refresh_token', 'refresh_v1');

    server.use(
  http.post(`${API_BASE}/auth/token/refresh/`, () => {
        return HttpResponse.json({ detail: 'invalid_refresh' }, { status: 401 });
      })
    );

    await expect(api.listSweets()).rejects.toBeTruthy();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('parseDRFErrors maps detail or field errors', () => {
    const errWithDetail = { response: { data: { detail: 'invalid' } } };
    expect(api.parseDRFErrors(errWithDetail)).toEqual({ nonFieldErrors: ['invalid'] });

    const errWithFields = { response: { data: { email: ['taken'], password: ['short'] } } };
    expect(api.parseDRFErrors(errWithFields)).toEqual({ email: ['taken'], password: ['short'] });
  });
});

