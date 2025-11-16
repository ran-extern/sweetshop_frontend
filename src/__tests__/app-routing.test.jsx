import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../contexts/AuthContext.jsx';

function renderApp(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('App routing', () => {
  it('shows the public landing experience on /', () => {
    renderApp(['/']);
    expect(screen.getByText(/brings artisan sweets/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated dashboard visits to login', async () => {
    renderApp(['/app']);

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });
  });

  it('shows register screen directly when navigating to /register', () => {
    renderApp(['/register']);
    expect(screen.getByText(/create an account/i)).toBeInTheDocument();
  });
});
