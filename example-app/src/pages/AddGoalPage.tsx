import { useState, useEffect, useCallback } from 'react';
import { PowerSync } from '@blue-cortex/capacitor-powersync-supabase';
import { BookOpen, Trophy, Monitor, Utensils, Target, Heart, Check } from 'lucide-react';
import type { GoalCategory } from '../types/goals-tasks';

const CATEGORIES: { value: GoalCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'Academic', label: 'Academic', icon: BookOpen },
  { value: 'Sports', label: 'Sports', icon: Trophy },
  { value: 'Screen Time', label: 'Screen Time', icon: Monitor },
  { value: 'Food', label: 'Food', icon: Utensils },
  { value: 'Health', label: 'Health', icon: Heart },
  { value: 'Other', label: 'Other', icon: Target },
];

const GOAL_COLORS = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#E91E63', '#795548'];

interface KidRow {
  id: string;
  name: string;
}

interface AddGoalPageProps {
  userId: string;
  onBack: () => void;
  onSaved: () => void;
}

export function AddGoalPage({ userId, onBack, onSaved }: AddGoalPageProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('Academic');
  const [progress, setProgress] = useState(0);
  const [color, setColor] = useState(GOAL_COLORS[1]);
  const [deadline, setDeadline] = useState('');
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
      if (list.length > 0) {
        setSelectedKidIds(list.map((k) => k.id));
      }
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
      const goalId = crypto.randomUUID();
      await PowerSync.execute({
        sql: `INSERT INTO goals (id, title, description, category, progress, target, color, deadline, is_archived, is_completed, pinned, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
        parameters: [
          goalId,
          title.trim(),
          description.trim() || null,
          category,
          String(Math.min(100, Math.max(0, Math.round(Number(progress))))),
          null,
          color,
          deadline || null,
          userId,
          now,
        ],
      });
      for (const kidId of selectedKidIds) {
        await PowerSync.execute({
          sql: `INSERT INTO goal_kids (id, goal_id, kid_id, assigned_at) VALUES (?, ?, ?, ?)`,
          parameters: [`${goalId}_${kidId}`, goalId, kidId, now],
        });
      }
      await PowerSync.execute({
        sql: `INSERT INTO goal_owners (id, goal_id, name, email) VALUES (?, ?, ?, ?)`,
        parameters: [crypto.randomUUID(), goalId, 'Parent Pal', 'parentpal3@gmail.com'],
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
      style={{
        paddingTop: 'max(var(--safe-area-inset-top, 0px), 44px)',
        paddingLeft: 'var(--safe-area-inset-left)',
        paddingRight: 'var(--safe-area-inset-right)',
        paddingBottom: 'var(--safe-area-inset-bottom)',
      }}
    >
      <header
        className="sticky z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 pt-4"
        style={{ top: 'var(--safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <button type="button" onClick={onBack} className="text-slate-600 dark:text-slate-400">
            Cancel
          </button>
          <h1 className="text-lg font-semibold">New Goal</h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim() || selectedKidIds.length === 0}
            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </header>

      <main className="px-4 py-6 pb-24 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter goal title"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const isSelected = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-800'
                      : 'border-transparent bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{c.label}</span>
                  {isSelected && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Kids *</label>
          {kidsLoading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading your kids…</p>
          ) : kids.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No kids yet. Add kids from the Kids screen first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {kids.map((kid) => {
                const isSelected = selectedKidIds.includes(kid.id);
                return (
                  <button
                    key={kid.id}
                    type="button"
                    onClick={() => toggleKid(kid.id)}
                    className={`px-3 py-2 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-800'
                        : 'border-transparent bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {kid.name}
                    {isSelected && <Check className="inline w-4 h-4 ml-1" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">Progress</label>
            <span>{Math.round(Number(progress))}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.min(100, Math.max(0, Math.round(Number(progress))))}
            onChange={(e) => setProgress(Math.round(Number(e.target.value)))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {GOAL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check className="w-5 h-5 text-white mx-auto" />}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </main>
    </div>
  );
}
