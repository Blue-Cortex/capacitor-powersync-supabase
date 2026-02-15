-- Parentpal Row Level Security (RLS) and policies
-- Run after 20250213000001_parent_pal_schema.sql
-- Requires ppal schema and tables to exist

-- SET search_path TO default;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kids ENABLE ROW LEVEL SECURITY;
ALTER TABLE kid_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_kids ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_kids ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POLICIES
-- =============================================================================
-- Policies assume auth.uid() is stored or mapped to users.id (e.g. via auth.users.id = users.id).
-- Adjust if your auth user id format differs (e.g. UUID vs text).

CREATE POLICY "Users can read own row"
  ON users FOR SELECT USING (id = auth.uid()::text);
CREATE POLICY "Users can update own row"
  ON users FOR UPDATE USING (id = auth.uid()::text);
CREATE POLICY "Users can insert own row"
  ON users FOR INSERT WITH CHECK (id = auth.uid()::text);

CREATE POLICY "User status own row"
  ON user_status FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Linked accounts by user"
  ON linked_accounts FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Kids: owner or collaborator"
  ON kids FOR ALL USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM kid_collaborators kc
      WHERE kc.kid_id = kids.id AND kc.user_id = auth.uid()::text AND kc.accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Kid collaborators: for own kids or where invited"
  ON kid_collaborators FOR ALL USING (
    user_id = auth.uid()::text
    OR kid_id IN (SELECT id FROM kids WHERE user_id = auth.uid()::text)
  );

CREATE POLICY "Goals: created_by or collaborator on linked kid"
  ON goals FOR ALL USING (
    created_by = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM goal_kids gk
      JOIN kid_collaborators kc ON kc.kid_id = gk.kid_id AND kc.user_id = auth.uid()::text AND kc.accepted_at IS NOT NULL
      WHERE gk.goal_id = goals.id
    )
  );

CREATE POLICY "Goal kids: via goal access"
  ON goal_kids FOR ALL USING (
    goal_id IN (SELECT id FROM goals WHERE created_by = auth.uid()::text)
    OR goal_id IN (
      SELECT gk.goal_id FROM goal_kids gk
      JOIN kid_collaborators kc ON kc.kid_id = gk.kid_id AND kc.user_id = auth.uid()::text AND kc.accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Goal owners: via goal access"
  ON goal_owners FOR ALL USING (
    goal_id IN (SELECT id FROM goals WHERE created_by = auth.uid()::text)
    OR goal_id IN (
      SELECT gk.goal_id FROM goal_kids gk
      JOIN kid_collaborators kc ON kc.kid_id = gk.kid_id AND kc.user_id = auth.uid()::text AND kc.accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Tasks: created_by or via goal/kid access"
  ON tasks FOR ALL USING (
    created_by = auth.uid()::text
    OR goal_id IN (SELECT id FROM goals WHERE created_by = auth.uid()::text)
    OR goal_id IN (
      SELECT gk.goal_id FROM goal_kids gk
      JOIN kid_collaborators kc ON kc.kid_id = gk.kid_id AND kc.user_id = auth.uid()::text AND kc.accepted_at IS NOT NULL
    )
    OR id IN (SELECT task_id FROM task_kids tk JOIN kid_collaborators kc ON kc.kid_id = tk.kid_id AND kc.user_id = auth.uid()::text AND kc.accepted_at IS NOT NULL)
  );

CREATE POLICY "Task kids: via task access"
  ON task_kids FOR ALL USING (
    task_id IN (SELECT id FROM tasks WHERE created_by = auth.uid()::text)
    OR task_id IN (SELECT id FROM tasks WHERE goal_id IN (SELECT id FROM goals WHERE created_by = auth.uid()::text))
    OR task_id IN (
      SELECT t.id FROM tasks t
      JOIN task_kids tk ON tk.task_id = t.id
      JOIN kid_collaborators kc ON kc.kid_id = tk.kid_id AND kc.user_id = auth.uid()::text AND kc.accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Task owners: via task access"
  ON task_owners FOR ALL USING (
    task_id IN (SELECT id FROM tasks WHERE created_by = auth.uid()::text)
    OR task_id IN (SELECT id FROM tasks WHERE goal_id IN (SELECT id FROM goals WHERE created_by = auth.uid()::text))
  );

CREATE POLICY "Attachments: via goal or task"
  ON attachments FOR ALL USING (
    goal_id IN (SELECT id FROM goals WHERE created_by = auth.uid()::text)
    OR goal_id IN (SELECT gk.goal_id FROM goal_kids gk JOIN kid_collaborators kc ON kc.kid_id = gk.kid_id AND kc.user_id = auth.uid()::text AND kc.accepted_at IS NOT NULL)
    OR task_id IN (SELECT id FROM tasks WHERE created_by = auth.uid()::text)
  );

CREATE POLICY "Notification settings own"
  ON notification_settings FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY "Theme settings own"
  ON theme_settings FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY "Privacy settings own"
  ON privacy_settings FOR ALL USING (user_id = auth.uid()::text);
