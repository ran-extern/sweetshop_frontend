import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as api from '../lib/api';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';

const API_BASE = api.API_BASE_URL.replace(/\/+$/, '');

// simple test consumer
function TestConsumer({ creds = { email: 'jdoe@example.com', password: 'pass' } }) {
  const { user, login, logout, isAuthenticated, isAdmin } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="user">{user ? user.username : 'none'}</div>
      <div data-testid="admin">{isAdmin ? 'yes' : 'no'}</div>
      <button onClick={() => login(creds)}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

const sampleUser = { id: 1, username: 'jdoe', email: 'jdoe@example.com', role: 'customer' };
const sampleTokens = { access: 'access_v1', refresh: 'refresh_v1' };

const server = setupServer(
  http.post(`${API_BASE}/auth/login/`, () => {
    return HttpResponse.json({ user: sampleUser, tokens: sampleTokens }, { status: 200 });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

describe('AuthContext integration', () => {
  function renderWithProvider(ui) {
    return render(<MemoryRouter initialEntries={['/dashboard']}>{ui}</MemoryRouter>);
  }

  it('login updates context user, authenticated state, and logout clears everything', async () => {
    renderWithProvider(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('no');

    fireEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('yes'));
    expect(screen.getByTestId('user').textContent).toBe('jdoe');

    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('no'));
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('sets isAdmin when logged in user role is admin', async () => {
    server.use(
      http.post(`${API_BASE}/auth/login/`, () => {
        return HttpResponse.json({ user: { ...sampleUser, role: 'admin', username: 'boss' }, tokens: sampleTokens }, { status: 200 });
      })
    );

    renderWithProvider(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('yes'));
    expect(screen.getByTestId('user').textContent).toBe('boss');
    expect(screen.getByTestId('admin').textContent).toBe('yes');
  });
});
