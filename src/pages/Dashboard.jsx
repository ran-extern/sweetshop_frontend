import { useEffect, useState } from 'react';
import { listSweets } from '../lib/api';

export default function DashboardPage() {
  const [sweets, setSweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const data = await listSweets();
        if (!cancelled) setSweets(data);
      } catch (err) {
        if (!cancelled) setError('Unable to load sweets');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page dashboard">
      <header>
        <div>
          <p className="eyebrow">Sweet Shop</p>
          <h1>Available sweets</h1>
          <p>Browse delicious treats and start shopping.</p>
        </div>
      </header>
      {loading && <p>Loading sweets...</p>}
      {error && <p className="error">{error}</p>}
      <section className="grid">
        {sweets.map((sweet) => (
          <article key={sweet.id} className="sweet-card">
            <h2>{sweet.name}</h2>
            <p>{sweet.description}</p>
            <p className="price">${sweet.price}</p>
            <button disabled={sweet.quantity_in_stock === 0}>
              {sweet.quantity_in_stock === 0 ? 'Out of stock' : 'Purchase'}
            </button>
          </article>
        ))}
        {!loading && sweets.length === 0 && <p>No sweets available yet.</p>}
      </section>
    </main>
  );
}
