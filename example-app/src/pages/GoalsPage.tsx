import { useState, useCallback, useEffect } from 'react';
import { PowerSync } from '@blue-cortex/capacitor-powersync-supabase';
import type { GoalRow } from '../types/goals-tasks';

interface GoalsPageProps {
  userId: string;
  onBack: () => void;
  onAddGoal: () => void;
}

export function GoalsPage({ userId, onBack, onAddGoal }: GoalsPageProps) {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const { rows } = await PowerSync.query<GoalRow>({
        sql: `SELECT * FROM goals
              WHERE created_by = ? AND (deleted_at IS NULL OR deleted_at = '')
              ORDER BY pinned DESC, deadline ASC`,
        parameters: [userId],
      });
      setGoals((rows ?? []) as GoalRow[]);
    } catch (e) {
      console.error(e);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const isGoalCompleted = (g: GoalRow) => g.is_completed === 1 || g.is_completed === '1' || g.is_completed === true;

  return (
    <div
      style={{
        minHeight: '100vh',
        maxWidth: 600,
        margin: '0 auto',
        textAlign: 'left',
        paddingTop: 'max(var(--safe-area-inset-top, 0px), 44px)',
        paddingRight: 'var(--safe-area-inset-right)',
        paddingBottom: 'var(--safe-area-inset-bottom)',
        paddingLeft: 'calc(16px + var(--safe-area-inset-left))',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 'var(--safe-area-inset-top, 0px)',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          padding: '16px 16px 16px 0',
          background: 'inherit',
        }}
      >
        <button type="button" onClick={onBack} style={{ padding: '8px 16px' }}>
          ← Back
        </button>
        <h1 style={{ margin: 0 }}>Goals</h1>
        <button
          type="button"
          onClick={onAddGoal}
          style={{ padding: '8px 16px', background: '#1a1a1a', color: '#fff', borderRadius: 8 }}
        >
          Add
        </button>
      </header>

      <main style={{ padding: '0 16px 24px' }}>
        {loading ? (
          <p>Loading…</p>
        ) : goals.length === 0 ? (
          <p style={{ color: '#666' }}>No goals yet. Tap Add to create one.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {goals.map((goal) => (
              <li
                key={goal.id}
                style={{
                  padding: 16,
                  marginBottom: 8,
                  background: '#f5f5f5',
                  borderLeft: `4px solid ${goal.color || '#ccc'}`,
                  borderRadius: 8,
                }}
              >
                <strong>{goal.title}</strong>
                {goal.description && (
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: '#555' }}>{goal.description}</p>
                )}
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>
                  {goal.category} · {isGoalCompleted(goal) ? 'Done' : 'In progress'} · {Number(goal.progress ?? 0)}%
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
