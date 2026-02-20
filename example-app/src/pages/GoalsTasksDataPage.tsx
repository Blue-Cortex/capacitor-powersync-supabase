import { useState, useCallback, useEffect } from 'react';
import { PowerSync } from '@blue-cortex/capacitor-powersync-supabase';

interface GoalsTasksDataPageProps {
  userId?: string | null;
  onBack: () => void;
}

interface GoalRow {
  id?: string;
  title?: string;
  description?: string | null;
  category?: string;
  progress?: number | string;
  target?: string | null;
  color?: string;
  deadline?: string | null;
  is_archived?: number | string;
  is_completed?: number | string;
  pinned?: number | string;
  created_by?: string;
  created_at?: string;
  last_updated_by?: string | null;
  last_updated_at?: string | null;
  deleted_at?: string | null;
  [key: string]: unknown;
}

interface TaskRow {
  id?: string;
  goal_id?: string | null;
  title?: string;
  notes?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  type?: string;
  is_completed?: number | string;
  pinned?: number | string;
  location?: string | null;
  created_by?: string;
  created_at?: string;
  last_updated_by?: string | null;
  last_updated_at?: string | null;
  deleted_at?: string | null;
  [key: string]: unknown;
}

export function GoalsTasksDataPage({ userId, onBack }: GoalsTasksDataPageProps) {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [goalKids, setGoalKids] = useState<Record<string, unknown>[]>([]);
  const [taskKids, setTaskKids] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const goalsSql = userId
        ? `SELECT * FROM goals WHERE created_by = ? ORDER BY created_at DESC`
        : `SELECT * FROM goals ORDER BY created_at DESC`;
      const goalsParams = userId ? [userId] : [];
      const { rows: goalsRows } = await PowerSync.query<GoalRow>({
        sql: goalsSql,
        parameters: goalsParams,
      });
      setGoals((goalsRows ?? []) as GoalRow[]);

      const tasksSql = userId
        ? `SELECT * FROM tasks WHERE created_by = ? ORDER BY created_at DESC`
        : `SELECT * FROM tasks ORDER BY created_at DESC`;
      const tasksParams = userId ? [userId] : [];
      const { rows: tasksRows } = await PowerSync.query<TaskRow>({
        sql: tasksSql,
        parameters: tasksParams,
      });
      setTasks((tasksRows ?? []) as TaskRow[]);

      const { rows: goalKidsRows } = await PowerSync.query<Record<string, unknown>>({
        sql: 'SELECT * FROM goal_kids ORDER BY assigned_at DESC',
        parameters: [],
      });
      setGoalKids((goalKidsRows ?? []) as Record<string, unknown>[]);

      const { rows: taskKidsRows } = await PowerSync.query<Record<string, unknown>>({
        sql: 'SELECT * FROM task_kids ORDER BY assigned_at DESC',
        parameters: [],
      });
      setTaskKids((taskKidsRows ?? []) as Record<string, unknown>[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
      setGoals([]);
      setTasks([]);
      setGoalKids([]);
      setTaskKids([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 'max(var(--safe-area-inset-top, 0px), 16px) 16px var(--safe-area-inset-bottom, 16px)',
        paddingLeft: 'calc(16px + var(--safe-area-inset-left, 0px))',
        paddingRight: 'calc(16px + var(--safe-area-inset-right, 0px))',
        background: '#1a1a1a',
        color: '#e0e0e0',
        fontFamily: 'monospace',
        fontSize: 13,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ padding: '8px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: 8 }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: 18 }}>Goals & Tasks (PowerSync)</h1>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            padding: '8px 12px',
            background: '#444',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            marginLeft: 'auto',
          }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      {error && <div style={{ padding: 12, background: '#4a2020', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, color: '#aaa' }}>Goals ({goals.length})</h2>
        <pre
          style={{
            margin: 0,
            padding: 12,
            background: '#252525',
            borderRadius: 8,
            overflow: 'auto',
            maxHeight: 360,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {JSON.stringify(goals, null, 2)}
        </pre>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, color: '#aaa' }}>Tasks ({tasks.length})</h2>
        <pre
          style={{
            margin: 0,
            padding: 12,
            background: '#252525',
            borderRadius: 8,
            overflow: 'auto',
            maxHeight: 360,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {JSON.stringify(tasks, null, 2)}
        </pre>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, color: '#aaa' }}>goal_kids ({goalKids.length})</h2>
        <pre
          style={{
            margin: 0,
            padding: 12,
            background: '#252525',
            borderRadius: 8,
            overflow: 'auto',
            maxHeight: 240,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {JSON.stringify(goalKids, null, 2)}
        </pre>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, color: '#aaa' }}>task_kids ({taskKids.length})</h2>
        <pre
          style={{
            margin: 0,
            padding: 12,
            background: '#252525',
            borderRadius: 8,
            overflow: 'auto',
            maxHeight: 240,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {JSON.stringify(taskKids, null, 2)}
        </pre>
      </section>
    </div>
  );
}
