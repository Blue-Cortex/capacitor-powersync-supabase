import { useState, useEffect, useCallback } from 'react';
import { PowerSync } from '@blue-cortex/capacitor-powersync-supabase';

export interface Kid {
  id: string;
  user_id: string;
  name: string;
  age: number | string;
  birthday: string | null;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

interface KidsPageProps {
  userId: string;
  onBack: () => void;
}

export function KidsPage({ userId, onBack }: KidsPageProps) {
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadKids = useCallback(async () => {
    setLoading(true);
    try {
      const { rows } = await PowerSync.getAll({
        sql: 'SELECT * FROM kids WHERE user_id = ? ORDER BY created_at DESC',
        parameters: [userId],
      });
      setKids((rows ?? []) as Kid[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load kids');
      setKids([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadKids();
  }, [loadKids]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const ageNum = parseInt(age, 10);
    if (!trimmedName || Number.isNaN(ageNum) || ageNum < 0) {
      setError('Name and a valid age are required.');
      return;
    }
    setError(null);
    try {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      await PowerSync.execute({
        sql: `INSERT INTO kids (id, user_id, name, age, birthday, avatar, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        parameters: [id, userId, trimmedName, ageNum, null, null, now, now],
      });
      setName('');
      setAge('');
      loadKids();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add kid');
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: '0 auto', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button type="button" onClick={onBack} style={{ padding: '8px 16px' }}>
          ← Back
        </button>
        <h1 style={{ margin: 0 }}>Kids</h1>
      </div>

      <section style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>Add a kid</h2>
        <form onSubmit={handleAdd}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Child's name"
              required
              style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Age *</label>
            <input
              type="number"
              min={0}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 8"
              required
              style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
            />
          </div>
          {error && <p style={{ color: '#c00', marginBottom: 12 }}>{error}</p>}
          <button type="submit" style={{ padding: '10px 20px' }}>
            Add kid
          </button>
        </form>
      </section>

      <section>
        <h2>Your kids ({kids.length})</h2>
        {loading ? (
          <p>Loading…</p>
        ) : kids.length === 0 ? (
          <p style={{ color: '#666' }}>No kids yet. Add one above.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {kids.map((kid) => (
              <li
                key={kid.id}
                style={{
                  padding: '12px 16px',
                  marginBottom: 8,
                  background: '#fff',
                  border: '1px solid #eee',
                  borderRadius: 8,
                }}
              >
                <strong>{kid.name}</strong>
                <br />
                <small style={{ color: '#666' }}>Age {String(kid.age)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
