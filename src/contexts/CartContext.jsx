/**
 * CartContext
 * -----------
 * Lightweight cart state container that hydrates from localStorage, exposes
 * helpers for adding/removing items, and shares subtotal metadata across the
 * customer experience.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sweetshop_cart_v1';

const CartContext = createContext(null);

const sanitizeQuantity = (value, maxQuantity = Infinity) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  const clamped = Math.max(1, Math.floor(parsed));
  return Math.min(clamped, maxQuantity);
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (err) {
      console.error('Failed to parse saved cart', err);
      return [];
    }
  });

  useEffect(() => {
    try {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error('Failed to persist cart', err);
    }
  }, [items]);

  const addItem = useCallback((sweet, quantity = 1) => {
    if (!sweet || !sweet.id) return;
    if (sweet.quantity_in_stock <= 0) return;
    const maxQuantity = sweet.quantity_in_stock ?? quantity;
    const unitPrice = Number(sweet.price) || 0;
    const cleanQuantity = sanitizeQuantity(quantity, maxQuantity);

    setItems((prev) => {
      const existing = prev.find((item) => item.id === sweet.id);
      if (existing) {
        const newQuantity = Math.min(existing.quantity + cleanQuantity, maxQuantity);
        return prev.map((item) => (item.id === sweet.id ? { ...item, quantity: newQuantity, maxQuantity } : item));
      }
      return [
        ...prev,
        {
          id: sweet.id,
          name: sweet.name,
          unitPrice,
          quantity: cleanQuantity,
          maxQuantity,
        },
      ];
    });
  }, []);

  const updateItemQuantity = useCallback((id, quantity, maxQuantityOverride) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const maxQuantity = maxQuantityOverride ?? item.maxQuantity ?? Infinity;
          const nextQuantity = sanitizeQuantity(quantity, maxQuantity);
          return { ...item, quantity: nextQuantity, maxQuantity };
        })
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const summary = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    return {
      subtotal,
      totalItems,
    };
  }, [items]);

  const value = {
    items,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    totalItems: summary.totalItems,
    subtotal: summary.subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}

export default CartContext;
