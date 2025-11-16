import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';

// simple test consumer
function TestConsumer() {
  const { user, login, isAuthenticated } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="user">{user ? user.username : 'none'}</div>
      <button
        onClick={() => login({ email: 'jdoe@example.com', password: 'pass' })}
      >
        login
      </button>
    </div>
  );
}

const sampleUser = { id: 1, username: 'jdoe', email: 'jdoe@example.com', role: 'customer' };
const sampleTokens = { access: 'access_v1', refresh: 'refresh_v1' };

const server = setupServer(
  rest.post('http://localhost:8000/api/auth/login/', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ user: sampleUser, tokens: sampleTokens }));
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

describe('AuthContext integration', () => {
  it('login updates context user and authenticated state', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );

    // initially not authenticated
    expect(screen.getByTestId('auth-status').textContent).toBe('no');

    // trigger login
    const btn = screen.getByText('login');
    btn.click();

    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('yes'));
    expect(screen.getByTestId('user').textContent).toBe('jdoe');
  });
});
