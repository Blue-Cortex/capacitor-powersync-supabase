import { useState, useEffect, useCallback } from 'react';
import { PowerSync } from '@blue-cortex/capacitor-powersync-supabase';

interface KidRow {
  id: string;
  name: string;
}

interface GoalRow {
  id: string;
  title: string;
}

interface AddTaskPageProps {
  userId: string;
  onBack: () => void;
  onSaved: () => void;
}

export function AddTaskPage({ userId, onBack, onSaved }: AddTaskPageProps) {
  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [kids, setKids] = useState<KidRow[]>([]);
  const [kidsLoading, setKidsLoading] = useState(true);
  const [selectedKidIds, setSelectedKidIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadKids = useCallback(async () => {
    setKidsLoading(true);
    try {
      const { rows } = await PowerSync.query<KidRow>({
        sql: 'SELECT id, name FROM kids WHERE user_id = ? ORDER BY created_at DESC',
        parameters: [userId],
      });
      const list = (rows ?? []) as KidRow[];
      setKids(list);
      if (list.length > 0) setSelectedKidIds(list.map((k) => k.id));
    } catch (e) {
      console.error(e);
      setKids([]);
    } finally {
      setKidsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadKids();
  }, [loadKids]);

  useEffect(() => {
    PowerSync.query<GoalRow>({
      sql: `SELECT id, title FROM goals WHERE created_by = ? AND (deleted_at IS NULL OR deleted_at = '') ORDER BY title`,
      parameters: [userId],
    }).then(({ rows }) => setGoals((rows ?? []) as GoalRow[]));
  }, [userId]);

  const toggleKid = (id: string) => {
    setSelectedKidIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((k) => k !== id) : prev) : [...prev, id],
    );
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Enter a title');
      return;
    }
    if (selectedKidIds.length === 0) {
      setError('Select at least one kid');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const taskId = crypto.randomUUID();
      await PowerSync.execute({
        sql: `INSERT INTO tasks (id, goal_id, title, notes, date, start_time, end_time, type, is_completed, pinned, location, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
        parameters: [taskId, goalId || null, title.trim(), null, null, null, null, 'Task', null, userId, now],
      });
      for (const kidId of selectedKidIds) {
        await PowerSync.execute({
          sql: `INSERT INTO task_kids (id, task_id, kid_id, assigned_at) VALUES (?, ?, ?, ?)`,
          parameters: [`${taskId}_${kidId}`, taskId, kidId, now],
        });
      }
      await PowerSync.execute({
        sql: `INSERT INTO task_owners (id, task_id, name, email) VALUES (?, ?, ?, ?)`,
        parameters: [crypto.randomUUID(), taskId, 'Parent Pal', 'parentpal3@gmail.com'],
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: '0 auto', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button type="button" onClick={onBack} style={{ padding: '8px 16px' }}>
          Cancel
        </button>
        <h1 style={{ margin: 0 }}>New Task</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title.trim() || selectedKidIds.length === 0}
          style={{
            padding: '8px 16px',
            background: '#1a1a1a',
            color: '#fff',
            borderRadius: 8,
            opacity: saving ? 0.6 : 1,
          }}
        >
          Save
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Goal (optional)</label>
        <select
          value={goalId ?? ''}
          onChange={(e) => setGoalId(e.target.value || null)}
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        >
          <option value="">None</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Kids *</label>
        {kidsLoading ? (
          <p style={{ margin: 0 }}>Loading kids…</p>
        ) : kids.length === 0 ? (
          <p style={{ margin: 0, color: '#666' }}>Add kids from the Kids screen first.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {kids.map((kid) => (
              <button
                key={kid.id}
                type="button"
                onClick={() => toggleKid(kid.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: selectedKidIds.includes(kid.id) ? '2px solid #1a1a1a' : '1px solid #ccc',
                  background: selectedKidIds.includes(kid.id) ? '#eee' : '#fff',
                }}
              >
                {kid.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p style={{ color: '#c00', marginBottom: 12 }}>{error}</p>}
    </div>
  );
}
