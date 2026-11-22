import { useState } from 'react';
import { getBookings } from '../services/api';

// Owner dashboard stub. Enter the admin key to list bookings from the
// Bookings sheet. Extend with filters, per-booking detail and calendar
// management once the live sheet exists.
export default function AdminDashboard() {
  const [adminKey, setAdminKey] = useState('');
  const [bookings, setBookings] = useState<string[][] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await getBookings(adminKey);
      setBookings(res.bookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load bookings.');
      setBookings(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Owner Dashboard</h1>
      <p className="muted">
        Bookings for Waymaker Taxi Services. Admin key required.
      </p>
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="field">
          <label htmlFor="admin-key">Admin key</label>
          <input
            id="admin-key"
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter admin key"
          />
        </div>
        <button onClick={load} disabled={loading || !adminKey}>
          {loading ? 'Loading…' : 'Load bookings'}
        </button>
      </div>

      {error && <p className="error" style={{ marginTop: '1rem' }}>{error}</p>}

      {bookings !== null && (
        <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
          {bookings.length === 0 ? (
            <p className="muted">No bookings yet.</p>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {bookings.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #d9e2dd' }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: '0.5rem', fontSize: '0.9rem' }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
