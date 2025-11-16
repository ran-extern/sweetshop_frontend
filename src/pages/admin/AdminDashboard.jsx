import { useEffect, useState } from 'react';
import { listSweets, deleteSweet, restockSweet } from '../../lib/api';

export default function AdminDashboard() {
  const [sweets, setSweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listSweets();
      setSweets(data);
    } catch (err) {
      setError('Unable to load sweets for admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    await deleteSweet(id);
    fetchData();
  };

  const handleRestock = async (id) => {
    await restockSweet(id, 5);
    fetchData();
  };

  return (
    <main className="page admin">
      <header>
        <h1>Admin sweets manager</h1>
        <p>Add, update, restock, or delete sweets.</p>
      </header>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sweets.map((sweet) => (
            <tr key={sweet.id}>
              <td>{sweet.name}</td>
              <td>{sweet.category}</td>
              <td>${sweet.price}</td>
              <td>{sweet.quantity_in_stock}</td>
              <td>
                <button onClick={() => handleRestock(sweet.id)}>+5</button>
                <button onClick={() => handleDelete(sweet.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
