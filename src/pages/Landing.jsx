import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

// Public landing page shown to first-time visitors. Highlights SweetShop
// features and offers quick links to log in or create an account.
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const featureList = [
    {
      title: 'Curated marketplace',
      copy: 'Browse seasonal sweets from boutique makers, complete with flavor notes and allergen tags.',
      icon: '🍓',
    },
    {
      title: 'Realtime stock',
      copy: 'See exactly how many boxes remain and reserve your share before they sell out.',
      icon: '🍮',
    },
    {
      title: 'Admin-friendly tools',
      copy: 'Maintain the catalog, restock best sellers, and monitor orders from one dashboard.',
      icon: '🍯',
    },
  ];
  const badges = ['🍮 Next-day local delivery', '🍰 Seasonal drops weekly', '🌱 Allergen-friendly tagging'];

  useEffect(() => {
    if (isAuthenticated) {
      // Authenticated users can go straight to the dashboard experience.
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <main className="landing">
      <div className="landing-grid">
        <section className="hero">
          <p className="eyebrow">Handcrafted desserts & curated treats</p>
          <h1>
            SweetShop brings artisan sweets
            <br />
            to your doorstep.
          </h1>
          <p className="subtitle">
            Discover limited-run confections, track inventory in realtime, and restock fan favorites with a single tap.
          </p>
          <div className="hero-cta">
            <NavLink to="/register" className="cta primary">
              Create account
            </NavLink>
            <NavLink to="/login" className="cta ghost">
              Log in
            </NavLink>
          </div>
          <div className="hero-badges">
            {badges.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
        </section>

        <section className="hero-visual" aria-label="Featured confections preview">
          <div className="preview-card">
            <p className="mini-label">This week’s drop</p>
            <h3>Rose Pistachio Éclair</h3>
            <p className="preview-copy">Flaky pâte à choux filled with vanilla bean custard, rose glaze, and roasted pistachios.</p>
            <ul className="flavor-tags">
              <li>floral</li>
              <li>nutty</li>
              <li>limited</li>
            </ul>
            <div className="stock-pill">12 boxes left</div>
          </div>
          <div className="stat-card">
            <h4>2.4k tastings hosted</h4>
            <p>SweetShop makers served premium flights last month.</p>
            <div className="stat-pill">98% five-star reviews</div>
          </div>
        </section>
      </div>

      <section className="features-grid" aria-label="Platform highlights">
        {featureList.map(({ title, copy, icon }) => (
          <article className="feature-card" key={title}>
            <span className="feature-icon" aria-hidden="true">{icon}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
