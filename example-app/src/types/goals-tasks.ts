export type GoalCategory =
  | 'Academic'
  | 'Sports'
  | 'Screen Time'
  | 'Food'
  | 'Health'
  | 'Other';

export interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  progress: number;
  target: string | null;
  color: string;
  deadline: string | null;
  is_archived: number | string;
  is_completed: number | boolean | string;
  pinned: number | string;
  created_by: string;
  created_at: string;
  last_updated_by: string | null;
  last_updated_at: string | null;
  deleted_at: string | null;
}

export interface TaskRow {
  id: string;
  goal_id: string | null;
  title: string;
  notes: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  type: string;
  is_completed: number | boolean | string;
  pinned: number | string;
  location: string | null;
  created_by: string;
  created_at: string;
  last_updated_by: string | null;
  last_updated_at: string | null;
  deleted_at: string | null;
}
