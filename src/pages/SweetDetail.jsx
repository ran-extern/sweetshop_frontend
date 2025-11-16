import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSweet, purchaseSweet } from '../lib/api';

export default function SweetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sweet, setSweet] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    let cancelled = false;
    async function loadSweet() {
      setStatus({ loading: true, error: '' });
      try {
        const data = await getSweet(id);
        if (!cancelled) setSweet(data);
      } catch (err) {
        if (!cancelled) setStatus({ loading: false, error: 'Sweet not found.' });
      } finally {
        if (!cancelled) setStatus((prev) => ({ ...prev, loading: false }));
      }
    }
    loadSweet();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePurchase = async () => {
    try {
      await purchaseSweet(id, Number(quantity));
      navigate('/');
    } catch (err) {
      setStatus((prev) => ({ ...prev, error: 'Unable to complete purchase.' }));
    }
  };

  if (status.loading) return <main className="page"><p>Loading...</p></main>;
  if (status.error && !sweet) return <main className="page"><p className="error">{status.error}</p></main>;

  return (
    <main className="page detail">
      <button className="link" onClick={() => navigate(-1)}>&larr; Back</button>
      <h1>{sweet.name}</h1>
      <p>{sweet.description}</p>
      <p className="price">${sweet.price}</p>
      <p>Stock: {sweet.quantity_in_stock}</p>
      <label>
        Quantity
        <input type="number" min={1} max={sweet.quantity_in_stock} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </label>
      <button disabled={sweet.quantity_in_stock === 0} onClick={handlePurchase}>
        Purchase
      </button>
      {status.error && <p className="error">{status.error}</p>}
    </main>
  );
}
