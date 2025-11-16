// Admin dashboard: consolidates CRUD tooling for sweets inventory including
// creation, restocking, and deletion flows backed by the API helpers.
import { useEffect, useState } from 'react';
import { listSweets, deleteSweet, restockSweet, createSweet, parseDRFErrors } from '../../lib/api';

const CATEGORY_OPTIONS = [
  { value: 'chocolate', label: 'Chocolate' },
  { value: 'candy', label: 'Candy' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'gum', label: 'Gum' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_RESTOCK = 5;

const buildInitialFormState = () => ({
  name: '',
  category: CATEGORY_OPTIONS[0].value,
  price: '',
  quantity: '',
  description: '',
});

const humanize = (value) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const formatErrorMessage = (error) => {
  if (!error) return 'Unable to create sweet';
  if (error.nonFieldErrors && error.nonFieldErrors.length) return error.nonFieldErrors.join(' ');
  const entries = Object.entries(error);
  if (!entries.length) return 'Unable to create sweet';
  return entries
    .map(([field, message]) => {
      const normalized = Array.isArray(message) ? message.join(' ') : message;
      return `${humanize(field)}: ${normalized}`;
    })
    .join(' ');
};

const getCategoryLabel = (value) => CATEGORY_OPTIONS.find((option) => option.value === value)?.label || value;

const formatPrice = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : value;
};

export default function AdminDashboard() {
  const [sweets, setSweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerError, setBannerError] = useState('');
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(() => buildInitialFormState());
  const [restockAmounts, setRestockAmounts] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);
  const [activeRestock, setActiveRestock] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setBannerError('');
    try {
      const data = await listSweets();
      setSweets(data);
      setRestockAmounts((prev) => {
        const next = {};
        data.forEach((sweet) => {
          next[sweet.id] = prev?.[sweet.id] ?? DEFAULT_RESTOCK;
        });
        return next;
      });
    } catch (err) {
      setBannerError('Unable to load sweets for admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formError && !isCreateOpen) {
      setIsCreateOpen(true);
    }
  }, [formError, isCreateOpen]);

  const toggleCreateVisibility = () => {
    setIsCreateOpen((prev) => !prev);
    setFormError('');
  };

  const requestDelete = (id) => {
    if (pendingDelete === id) return;
    setPendingDelete(id);
    setBannerError('');
  };

  const cancelDeleteRequest = () => setPendingDelete(null);

  const confirmDelete = async (id) => {
    try {
      await deleteSweet(id);
      setPendingDelete(null);
      fetchData();
    } catch (err) {
      setBannerError('Failed to delete sweet');
    }
  };

  const handleRestockChange = (id, value) => {
    setRestockAmounts((prev) => ({ ...prev, [id]: value }));
  };

  const openRestock = (id) => {
    setActiveRestock(id);
    setBannerError('');
  };

  const cancelRestock = () => setActiveRestock(null);

  const handleRestock = async (id) => {
    const qty = parseInt(restockAmounts[id], 10);
    if (!Number.isInteger(qty) || qty <= 0) {
      setBannerError('Restock quantity must be a positive integer.');
      return;
    }
    try {
      await restockSweet(id, qty);
      setBannerError('');
      setRestockAmounts((prev) => ({ ...prev, [id]: DEFAULT_RESTOCK }));
      setActiveRestock(null);
      fetchData();
    } catch (err) {
      setBannerError('Failed to restock');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setFormError('');
    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();
    const priceValue = Number(form.price);
    const quantityValue = parseInt(form.quantity, 10);

    if (!trimmedName) {
      setFormError('Name is required.');
      setCreating(false);
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setFormError('Price must be a positive value.');
      setCreating(false);
      return;
    }
    if (!Number.isInteger(quantityValue) || quantityValue < 0) {
      setFormError('Quantity must be zero or a positive integer.');
      setCreating(false);
      return;
    }

    try {
      const payload = {
        name: trimmedName,
        category: form.category,
        price: priceValue.toFixed(2),
        quantity_in_stock: quantityValue,
        description: trimmedDescription,
      };
      await createSweet(payload);
      setForm(buildInitialFormState());
      fetchData();
    } catch (err) {
      const parsed = parseDRFErrors(err);
      setFormError(formatErrorMessage(parsed));
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="page admin">
      <header>
        <p>Add, update, restock, or delete sweets.</p>
      </header>

      <section className={`panel admin-controls ${isCreateOpen ? 'expanded' : 'collapsed'}`}>
        <div className="panel-header">
          <h3 className="page-title">Add new sweet</h3>
          <button
            type="button"
            className="cta ghost toggle"
            onClick={toggleCreateVisibility}
            aria-expanded={isCreateOpen}
          >
            {isCreateOpen ? 'Hide form' : 'Add sweet'}
          </button>
        </div>
        <div className={`collapsible ${isCreateOpen ? 'open' : ''}`} aria-hidden={!isCreateOpen}>
          <form className="admin-form" onSubmit={handleCreate}>
            <div className="form-row">
              <label>
                Name
                <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Midnight Truffle" required />
              </label>
              <label>
                Category
                <select name="category" value={form.category} onChange={handleChange}>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Price (in Rupees, ₹)
                <input name="price" value={form.price} onChange={handleChange} type="number" min="0" step="0.01" placeholder="12.00" />
              </label>
              <label>
                Quantity
                <input name="quantity" value={form.quantity} onChange={handleChange} type="number" min="0" step="1" placeholder="24" />
              </label>
            </div>
            <label>
              Description
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Short tasting notes, allergen info, etc." />
            </label>
            {formError && (
              <p className="error" role="alert" aria-live="assertive">{formError}</p>
            )}
            <button className="cta primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create sweet'}</button>
          </form>
        </div>
      </section>

      {loading && <p>Loading...</p>}
      {bannerError && <p className="error" role="status">{bannerError}</p>}

      <section className="panel admin-list">
        <h3 className="page-title">Sweets</h3>
        <div className="admin-table">
          {sweets.map((sweet) => {
            const restockValue = restockAmounts[sweet.id] ?? DEFAULT_RESTOCK;
            const isDeleting = pendingDelete === sweet.id;
            const isRestocking = activeRestock === sweet.id;
            return (
              <article key={sweet.id} className="sweet-row">
                <div className="meta">
                  <strong>{sweet.name}</strong>
                  <div className="muted">{getCategoryLabel(sweet.category)} — ${formatPrice(sweet.price)}</div>
                </div>
                <div className="controls">
                  <div className="stock">Stock: <span className="stock-pill">{sweet.quantity_in_stock}</span></div>
                  <div className="actions">
                    <div className="restock-control">
                      {isRestocking ? (
                        <div className="restock-card">
                          <p className="restock-label">Restock quantity</p>
                          <div className="restock-input">
                            <input
                              id={`restock-${sweet.id}`}
                              type="number"
                              min="1"
                              step="1"
                              value={restockValue}
                              onChange={(e) => handleRestockChange(sweet.id, e.target.value)}
                            />
                          </div>
                          <div className="restock-buttons">
                            <button className="cta primary" type="button" onClick={() => handleRestock(sweet.id)}>Apply</button>
                            <button className="cta ghost" type="button" onClick={cancelRestock}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="cta primary" type="button" onClick={() => openRestock(sweet.id)}>Restock</button>
                      )}
                    </div>
                    <div className="delete-control">
                      {isDeleting ? (
                        <div className="delete-confirm">
                          <p>Delete this sweet?</p>
                          <div className="delete-buttons">
                            <button className="cta danger" type="button" onClick={() => confirmDelete(sweet.id)}>Yes, delete</button>
                            <button className="cta ghost" type="button" onClick={cancelDeleteRequest}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="cta danger" type="button" onClick={() => requestDelete(sweet.id)}>Delete</button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          {!loading && sweets.length === 0 && <p>No sweets yet.</p>}
        </div>
      </section>
    </main>
  );
}
