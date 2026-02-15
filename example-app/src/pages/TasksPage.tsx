import { useState, useCallback, useEffect } from 'react';
import { PowerSync } from '@blue-cortex/capacitor-powersync-supabase';
import type { TaskRow } from '../types/goals-tasks';

interface TasksPageProps {
  userId: string;
  onBack: () => void;
  onAddTask: () => void;
}

export function TasksPage({ userId, onBack, onAddTask }: TasksPageProps) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { rows } = await PowerSync.getAll({
        sql: `SELECT * FROM tasks
              WHERE created_by = ? AND (deleted_at IS NULL OR deleted_at = '')
              ORDER BY date ASC, created_at DESC`,
        parameters: [userId],
      });
      setTasks((rows ?? []) as TaskRow[]);
    } catch (e) {
      console.error(e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const isTaskCompleted = (t: TaskRow) =>
    t.is_completed === 1 || t.is_completed === '1' || t.is_completed === true;

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: '0 auto', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button type="button" onClick={onBack} style={{ padding: '8px 16px' }}>
          ← Back
        </button>
        <h1 style={{ margin: 0 }}>Tasks</h1>
        <button type="button" onClick={onAddTask} style={{ padding: '8px 16px', background: '#1a1a1a', color: '#fff', borderRadius: 8 }}>
          Add
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : tasks.length === 0 ? (
        <p style={{ color: '#666' }}>No tasks yet. Tap Add to create one.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map((task) => (
            <li
              key={task.id}
              style={{
                padding: 16,
                marginBottom: 8,
                background: '#f5f5f5',
                borderRadius: 8,
                opacity: isTaskCompleted(task) ? 0.8 : 1,
              }}
            >
              <strong>{task.title}</strong>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>
                {task.type} {task.date ? `· ${task.date}` : ''} · {isTaskCompleted(task) ? 'Done' : 'To do'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
