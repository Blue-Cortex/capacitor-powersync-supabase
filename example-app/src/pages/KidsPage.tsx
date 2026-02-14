import { useState, useEffect } from 'react';
import { PowerSync } from '@blue-cortex/capacitor-powersync-supabase';

export interface Kid {
  id: string;
  user_id: string;
  name: string;
  age: number;
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
  const [loading, setLoading] = useState(false);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState('');
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingKid(null);
    setName('');
    setAge('');
    setBirthday('');
    setAvatar('');
    setError(null);
  };

  const startEdit = (kid: Kid) => {
    setEditingKid(kid);
    setName(kid.name);
    setAge(String(kid.age));
    setBirthday(kid.birthday ?? '');
    setAvatar(kid.avatar ?? '');
    setError(null);
  };

  const loadKids = async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows } = await PowerSync.getAll({
        sql: 'SELECT * FROM kids WHERE user_id = ? ORDER BY created_at DESC',
        parameters: [userId]
      });
      setKids((rows ?? []) as Kid[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load kids');
      setKids([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKids();
  }, [userId]);

  const handleSaveKid = async (e: React.FormEvent) => {
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
      if (editingKid) {
        await PowerSync.execute({
          sql: `UPDATE kids SET name = ?, age = ?, birthday = ?, avatar = ?, updated_at = ?
                WHERE id = ? AND user_id = ?`,
          parameters: [
            trimmedName,
            ageNum,
            birthday.trim() || null,
            avatar.trim() || null,
            now,
            editingKid.id,
            userId
          ]
        });
      } else {
        const id = crypto.randomUUID();
        await PowerSync.execute({
          sql: `INSERT INTO kids (id, user_id, name, age, birthday, avatar, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          parameters: [
            id,
            userId,
            trimmedName,
            ageNum,
            birthday.trim() || null,
            avatar.trim() || null,
            now,
            now
          ]
        });
      }
      resetForm();
      loadKids();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : editingKid ? 'Failed to update kid' : 'Failed to add kid');
    }
  };

  return (
    <div className="kids-page" style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button type="button" onClick={onBack} style={{ padding: '8px 16px' }}>
          ← Back
        </button>
        <h1 style={{ margin: 0 }}>Kids</h1>
      </div>

      <section style={{ marginBottom: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0 }}>{editingKid ? 'Edit kid' : 'Add a kid'}</h2>
        <form onSubmit={handleSaveKid}>
          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="kid-name" style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Name *
            </label>
            <input
              id="kid-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Child's name"
              required
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="kid-age" style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Age *
            </label>
            <input
              id="kid-age"
              type="number"
              min={0}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 8"
              required
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="kid-birthday" style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Birthday
            </label>
            <input
              id="kid-birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="kid-avatar" style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Avatar URL
            </label>
            <input
              id="kid-avatar"
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://..."
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>
          {error && (
            <p style={{ color: '#c00', marginBottom: '12px' }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ padding: '10px 20px' }}>
              {editingKid ? 'Save changes' : 'Add kid'}
            </button>
            {editingKid && (
              <button type="button" onClick={resetForm} style={{ padding: '10px 20px' }}>
                Cancel
              </button>
            )}
          </div>
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
                  marginBottom: '8px',
                  background: '#fff',
                  border: '1px solid #eee',
                  borderRadius: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {kid.avatar ? (
                    <img
                      src={kid.avatar}
                      alt=""
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: '#ddd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem'
                      }}
                    >
                      {kid.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <strong>{kid.name}</strong>
                    <br />
                    <small style={{ color: '#666' }}>
                      Age {kid.age}
                      {kid.birthday && ` · Birthday ${new Date(kid.birthday).toLocaleDateString()}`}
                    </small>
                    <br />
                    <small style={{ color: '#999' }}>
                      Added {new Date(kid.created_at).toLocaleDateString()}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(kid)}
                    style={{ padding: '6px 12px', flexShrink: 0 }}
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
