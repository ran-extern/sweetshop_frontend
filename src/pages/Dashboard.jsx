import { useCallback, useEffect, useMemo, useState } from 'react';
import { listSweets, purchaseSweet } from '../lib/api';
import { useCart } from '../contexts/CartContext';

const formatCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toFixed(2)}`;
};

const clamp = (value, min = 1, max = Number.MAX_SAFE_INTEGER) => {
  return Math.min(Math.max(value, min), max);
};

export default function DashboardPage() {
  const { items: cartItems, addItem, updateItemQuantity, removeItem, clearCart, subtotal, totalItems } = useCart();
  const [sweets, setSweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState({});
  const [checkoutStatus, setCheckoutStatus] = useState({ type: 'idle', message: '' });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(() => cartItems.length > 0);

  useEffect(() => {
    if (!cartItems.length) {
      setCartOpen(false);
    }
  }, [cartItems.length]);

  const fetchSweets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listSweets();
      setSweets(data);
    } catch (err) {
      setError('Unable to load sweets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSweets();
  }, [fetchSweets]);

  const stockById = useMemo(() => {
    return sweets.reduce((acc, sweet) => {
      acc[sweet.id] = sweet.quantity_in_stock;
      return acc;
    }, {});
  }, [sweets]);

  const getDesiredQuantity = (sweet) => {
    return quantities[sweet.id] ?? 1;
  };

  const setSweetQuantity = (sweet, rawValue) => {
    const numeric = Number(rawValue);
    const fallback = Number.isNaN(numeric) ? 1 : Math.floor(numeric);
    const max = sweet.quantity_in_stock || 1;
    const nextValue = clamp(fallback, 1, max);
    setQuantities((prev) => ({ ...prev, [sweet.id]: nextValue }));
  };

  const adjustSweetQuantity = (sweet, delta) => {
    const current = getDesiredQuantity(sweet);
    setSweetQuantity(sweet, current + delta);
  };

  const handleQuantityChange = (sweet, value) => {
    setSweetQuantity(sweet, value);
  };

  const handleAddToCart = (sweet) => {
    const desiredQty = getDesiredQuantity(sweet);
    addItem(sweet, desiredQty);
    setQuantities((prev) => ({ ...prev, [sweet.id]: 1 }));
    setCheckoutStatus({ type: 'success', message: `${sweet.name} added to cart.` });
    setCartOpen(true);
  };

  const getCartMaxQuantity = (item) => {
    const stock = stockById[item.id];
    if (typeof stock === 'number') return stock;
    return item.maxQuantity ?? 99;
  };

  const setCartItemQuantity = (item, rawValue) => {
    const numeric = Number(rawValue);
    const fallback = Number.isNaN(numeric) ? 1 : Math.floor(numeric);
    const maxQuantity = getCartMaxQuantity(item);
    const nextValue = clamp(fallback, 1, maxQuantity);
    updateItemQuantity(item.id, nextValue, maxQuantity);
  };

  const adjustCartItemQuantity = (item, delta) => {
    setCartItemQuantity(item, item.quantity + delta);
  };

  const handleCartQuantityChange = (item, value) => {
    setCartItemQuantity(item, value);
  };

  const handleCheckout = async () => {
    if (!cartItems.length) return;
    setCheckoutLoading(true);
    setCheckoutStatus({ type: 'idle', message: '' });
    try {
      for (const item of cartItems) {
        await purchaseSweet(item.id, item.quantity);
      }
      clearCart();
      await fetchSweets();
      setCheckoutStatus({ type: 'success', message: 'Order confirmed! We\'ll send tracking details shortly.' });
    } catch (err) {
      const apiDetail = err?.response?.data;
      let message = 'Unable to complete purchase. Please review your cart and try again.';
      if (apiDetail) {
        if (typeof apiDetail === 'string') message = apiDetail;
        else if (apiDetail.detail) message = Array.isArray(apiDetail.detail) ? apiDetail.detail.join(' ') : apiDetail.detail;
      } else if (err?.message) {
        message = err.message;
      }
      setCheckoutStatus({ type: 'error', message });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const toggleCart = () => setCartOpen((prev) => !prev);

  return (
    <main className="page dashboard">
      <header className="panel dashboard-hero">
        <div>
          <p className="eyebrow">SweetShop marketplace</p>
          <h1>Pick your favorites and build the perfect tasting flight.</h1>
          <p className="muted">Curated boxes, same-day pickup, and seasonal drops every Friday.</p>
        </div>
        <div className="stat-pill">{sweets.length} treats live now</div>
      </header>

      {error && <p className="error" role="alert">{error}</p>}
      {loading && <p>Loading sweets...</p>}

      <div className="shop-layout">
        <section className="panel product-library">
          <div className="panel-header">
            <div>
              <h2>Featured sweets</h2>
              <p className="muted">Select a quantity and tap “Add to cart”.</p>
            </div>
          </div>

          <div className="product-grid">
            {sweets.map((sweet) => {
              const desiredQty = getDesiredQuantity(sweet);
              const maxQty = sweet.quantity_in_stock || desiredQty;
              const disableAdd = sweet.quantity_in_stock === 0;
              return (
                <article key={sweet.id} className="sweet-card">
                  <div className="sweet-card__header">
                    <div>
                      <h3>{sweet.name}</h3>
                      <p className="muted">{sweet.description || 'Limited-release confection crafted in small batches.'}</p>
                    </div>
                    <span className="price-tag">{formatCurrency(sweet.price)}</span>
                  </div>
                  <div className="sweet-card__meta">
                    <span className="stock-pill">{sweet.quantity_in_stock} in stock</span>
                  </div>
                  <div className="sweet-card__actions">
                    <div className="qty-group">
                      <span className="qty-label">Qty</span>
                      <div className="qty-stepper">
                        <button
                          type="button"
                          onClick={() => adjustSweetQuantity(sweet, -1)}
                          disabled={disableAdd || desiredQty <= 1}
                        >
                          −
                        </button>
                        <input
                          id={`qty-${sweet.id}`}
                          type="number"
                          min="1"
                          max={sweet.quantity_in_stock}
                          value={desiredQty}
                          onChange={(e) => handleQuantityChange(sweet, e.target.value)}
                          disabled={disableAdd}
                        />
                        <button
                          type="button"
                          onClick={() => adjustSweetQuantity(sweet, 1)}
                          disabled={disableAdd || desiredQty >= maxQty}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      className="cta primary"
                      type="button"
                      disabled={disableAdd}
                      onClick={() => handleAddToCart(sweet)}
                    >
                      {disableAdd ? 'Sold out' : 'Add to cart'}
                    </button>
                  </div>
                </article>
              );
            })}
            {!loading && sweets.length === 0 && <p className="muted">No sweets available yet. Check back soon!</p>}
          </div>
        </section>
      </div>

      <button
        className={`cart-fab ${cartOpen ? 'open' : ''}`}
        type="button"
        onClick={toggleCart}
        aria-expanded={cartOpen}
        aria-controls="cart-panel"
      >
        {cartOpen ? 'Close cart' : `Cart (${totalItems})`}
      </button>

      <aside id="cart-panel" className={`panel cart-panel floating ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen}>
        <div className="panel-header cart-panel-header">
          <div>
            <h2>Your cart</h2>
            <p className="muted">{totalItems} item{totalItems === 1 ? '' : 's'} ready to checkout.</p>
          </div>
          <div className="cart-panel-actions">
            {cartItems.length > 0 && (
              <button className="cta ghost" type="button" onClick={clearCart} disabled={checkoutLoading}>
                Clear
              </button>
            )}
            <button className="cart-close" type="button" aria-label="Close cart" onClick={() => setCartOpen(false)}>
              ×
            </button>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <p className="muted">Your cart is empty. Add a few treats to get started.</p>
        ) : (
          <>
            <ul className="cart-list">
              {cartItems.map((item) => {
                const maxQuantity = getCartMaxQuantity(item);
                return (
                  <li key={item.id} className="cart-item">
                    <div className="cart-item__info">
                      <strong>{item.name}</strong>
                      <span>{formatCurrency(item.unitPrice)} each</span>
                    </div>
                    <div className="cart-item__controls">
                      <div className="qty-stepper compact">
                        <button type="button" onClick={() => adjustCartItemQuantity(item, -1)} disabled={item.quantity <= 1}>
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={maxQuantity}
                          value={item.quantity}
                          onChange={(e) => handleCartQuantityChange(item, e.target.value)}
                        />
                        <button type="button" onClick={() => adjustCartItemQuantity(item, 1)} disabled={item.quantity >= maxQuantity}>
                          +
                        </button>
                      </div>
                      <button className="cta ghost" type="button" onClick={() => removeItem(item.id)}>
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="cart-summary">
              <div>
                <span>Items</span>
                <strong>{totalItems}</strong>
              </div>
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
            </div>

            {checkoutStatus.message && (
              <p className={`cart-banner ${checkoutStatus.type === 'error' ? 'error' : 'success'}`}>
                {checkoutStatus.message}
              </p>
            )}

            <button
              className="cta primary full-width"
              type="button"
              onClick={handleCheckout}
              disabled={!cartItems.length || checkoutLoading}
            >
              {checkoutLoading ? 'Processing…' : 'Checkout'}
            </button>
          </>
        )}
      </aside>
    </main>
  );
}
