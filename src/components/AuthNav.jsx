import { NavLink } from 'react-router-dom';

export default function AuthNav() {
  return (
    <header className="app-bar auth-nav" aria-label="Authentication navigation">
      <NavLink to="/" end className="brand">
        SweetShop
      </NavLink>
      <nav>
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/login">
          Login
        </NavLink>
        <NavLink to="/register">
          Register
        </NavLink>
      </nav>
    </header>
  );
}
