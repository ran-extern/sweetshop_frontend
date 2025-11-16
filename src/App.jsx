import { Outlet, Route, Routes, Navigate, NavLink } from 'react-router-dom';
import './App.css';
import DashboardPage from './pages/Dashboard.jsx';
import LandingPage from './pages/Landing.jsx';
import LoginPage from './pages/Login.jsx';
import RegisterPage from './pages/Register.jsx';
import SweetDetailPage from './pages/SweetDetail.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import { ProtectedRoute, AdminRoute, useAuth } from './contexts/AuthContext.jsx';

function AppLayout() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-bar">
        <NavLink to="/" className="brand">
          SweetShop
        </NavLink>
        <nav>
          <NavLink to="/" end>
            Home
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/app">Dashboard</NavLink>
              <NavLink to="/admin" className={({ isActive }) => (isAdmin && isActive ? 'active' : undefined)}>
                Admin
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register">Register</NavLink>
            </>
          )}
        </nav>
        {isAuthenticated && (
          <div className="user-menu">
            <span>{user?.email}</span>
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </header>
      <section className="app-body">
        <Outlet />
      </section>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Auth routes outside layout */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Main layout */}
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/sweets/:id" element={<SweetDetailPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
