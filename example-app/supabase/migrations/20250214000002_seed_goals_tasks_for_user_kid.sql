-- Seed goals and tasks for user b5f8c413-4730-4b0a-ae27-e642cddf906e and kid 0f5176bf-084d-450f-8a7a-46f32c670974
-- Covers last 3 months (Nov 2025 – Jan 2026) and future 3 months (Feb 2026 – May 2026)
-- Requires: users and kids rows for these ids already exist (from 20250213000001 or 20250214000001).

-- =============================================================================
-- GOALS (12 goals: 2 per month across 6 months)
-- =============================================================================

INSERT INTO goals (
  id, title, description, category, progress, target, color, deadline,
  is_archived, is_completed, pinned, created_by, created_at
) VALUES
  (gen_random_uuid()::text, 'Reading practice', '20 min daily reading', 'Academic', 75, '30 days', '#4CAF50', '2025-11-30', false, true, false, 'b5f8c413-4730-4b0a-ae27-e642cddf906e', '2025-11-01 10:00:00+00'),
  (gen_random_uuid()::text, 'Soccer skills', 'Weekly drills and matches', 'Sports', 40, 'By season end', '#2196F3', '2025-12-15', false, false, true, 'b5f8c413-4730-4b0a-ae27-e642cddf906e', '2025-11-05 14:00:00+00'),
  (gen_random_uuid()::text, 'Screen time limit', 'Max 1h on weekdays', 'Screen Time', 90, 'Consistent 2 weeks', '#FF9800', '2025-12-31', false, true, false, 'b5f8c413-4730-4b0a-ae27-e642cddf906e', '2025-11-10 09:00:00+00'),
  (gen_random_uuid()::text, 'Try new vegetables', 'One new veggie per week', 'Food', 50, '6 new veggies', '#9C27B0', '2026-01-15', false, false, false, 'b5f8c413-4730-4b0a-ae27-e642cddf906e', '2025-12-01 08:00:00+00'),
  (gen_random_uuid()::text, 'Math practice', 'Khan Academy 3x/week', 'Academic', 30, 'Complete grade level', '#00BCD4', '2026-01-31', false, false, true, 'b5f8c413-4730-4b0a-ae27-e642cddf906e', '2025-12-05 16:00:00+00'),
  (gen_random_uuid()::text, 'Bedtime routine', 'In bed by 8:30pm', 'Health', 60, '5 nights/week', '#E91E63', '2026-02-28', false, false, false, 'b5f8c413-4730-4b0a-ae27-e642cddf906e', '2026-01-01 10:00:00+00'),
  (gen_random_uuid()::text, 'Piano practice', '15 min daily', 'Other', 0, 'Learn 2 songs', '#795548', '2026-03-15', false, false, true, 'b5f8c413-4730-4b0a-ae27-e642cddf906e', '2026-02-01 11:00:00+00'),
  (gen_random_uuid()::text, 'Outdoor play', '1h outside on weekends', 'Sports', 0, 'Every weekend', '#8BC34A', '2026-03-31', false, false, false, 'b5f8c413-4730-4b0a-ae27-e642cddf906e', '2026-02-10 09:00:00+00'),
  (gen_random_uuid()::text, 'Homework before screen', 'Finish homework first', 'Academic', 0, 'Full semester', '#3F51B5', '2026-04-30', false, false, false, 'b5f8c413-4730-4b0a-ae27-e642cddf906e', '2026-03-01 14:00:00+00'),
  (gen_random_uuid()::text, 'Water intake', '4 glasses per day', 'Health', 0, '30 days', '#009688', '2026-04-15', false, false, false, 'b5f8c413-4730-4b0a-ae27-e642cddf906e', '2026-03-05 08:00:00+00'),
  (gen_random_uuid()::text, 'No phones at table', 'Family rule at meals', 'Other', 0, 'Ongoing', '#607D8B', '2026-05-15', false, false, true, 'b5f8c413-4730-4b0a-ae27-e642cddf906e', '2026-04-01 10:00:00+00'),
  (gen_random_uuid()::text, 'Swim lessons', 'Complete level 2', 'Sports', 0, 'By summer', '#FF5722', '2026-05-31', false, false, false, 'b5f8c413-4730-4b0a-ae27-e642cddf906e', '2026-04-10 15:00:00+00');

-- Link all these goals to the kid
INSERT INTO goal_kids (goal_id, kid_id)
SELECT id, '0f5176bf-084d-450f-8a7a-46f32c670974'
FROM goals
WHERE created_by = 'b5f8c413-4730-4b0a-ae27-e642cddf906e'
  AND created_at >= '2025-11-01'
  AND created_at <= '2026-04-11';

-- One goal_owner per goal (the creating user)
INSERT INTO goal_owners (id, goal_id, name, email)
SELECT gen_random_uuid()::text, id, 'Parent Pal', 'parentpal3@gmail.com'
FROM goals
WHERE created_by = 'b5f8c413-4730-4b0a-ae27-e642cddf906e'
  AND created_at >= '2025-11-01'
  AND created_at <= '2026-04-11';

-- =============================================================================
-- TASKS (mix of goal-linked and standalone, spread over 6 months)
-- =============================================================================

-- Tasks tied to goals (4 tasks per goal; goals ordered by deadline)
WITH goal_rows AS (
  SELECT id, deadline,
         (deadline - interval '1 month')::date AS base_date
  FROM goals
  WHERE created_by = 'b5f8c413-4730-4b0a-ae27-e642cddf906e'
    AND created_at >= '2025-11-01'
    AND created_at <= '2026-04-11'
  ORDER BY deadline
),
task_templates AS (
  SELECT * FROM (VALUES
    (1, 'Read chapter', 'Ch 1–2', '09:00', '09:20', true, 'Activity'),
    (2, 'Practice worksheet', NULL, '16:00', '16:30', false, 'Task'),
    (3, 'Log progress', NULL, '20:00', '20:05', true, 'Task'),
    (4, 'Review with parent', NULL, '18:00', '18:15', false, 'Activity')
  ) AS t(offset_days, title, notes, start_time, end_time, done, typ)
)
INSERT INTO tasks (id, goal_id, title, notes, date, start_time, end_time, type, is_completed, pinned, created_by, created_at)
SELECT
  gen_random_uuid()::text,
  g.id,
  t.title,
  t.notes,
  (g.base_date + (t.offset_days || ' days')::interval)::date,
  t.start_time,
  t.end_time,
  t.typ,
  t.done,
  false,
  'b5f8c413-4730-4b0a-ae27-e642cddf906e',
  (g.base_date + (t.offset_days || ' days')::interval) AT TIME ZONE 'UTC'
FROM goal_rows g
CROSS JOIN task_templates t;

-- Standalone tasks (no goal_id), spread over last 3 and next 3 months
INSERT INTO tasks (id, goal_id, title, notes, date, start_time, end_time, type, is_completed, pinned, created_by, created_at)
SELECT
  gen_random_uuid()::text,
  NULL,
  v.title,
  v.notes,
  v.dt::date,
  v.start_time,
  v.end_time,
  v.typ,
  v.done,
  false,
  'b5f8c413-4730-4b0a-ae27-e642cddf906e',
  v.dt::timestamptz
FROM (VALUES
  ('Dentist checkup', 'Annual cleaning', '2025-11-08', '09:00', '10:00', 'Activity', true),
  ('Buy school supplies', NULL, '2025-11-12', NULL, NULL, 'Task', false),
  ('Birthday party prep', 'Venue and cake', '2025-11-22', '10:00', '12:00', 'Task', true),
  ('Flu shot', NULL, '2025-12-03', '14:00', '14:30', 'Activity', true),
  ('Holiday recital', 'Piano piece', '2025-12-20', '18:00', '19:00', 'Activity', true),
  ('New year goals', 'Set 3 goals together', '2026-01-02', '11:00', '11:30', 'Task', false),
  ('Library visit', 'Get new books', '2026-01-18', '15:00', '16:00', 'Activity', false),
  ('Science fair idea', 'Pick project topic', '2026-02-05', NULL, NULL, 'Task', false),
  ('Valentine cards', 'Class cards', '2026-02-12', '16:00', '17:00', 'Task', false),
  ('Spring break plan', 'Day trips', '2026-03-20', NULL, NULL, 'Task', false),
  ('Easter egg hunt', NULL, '2026-03-30', '10:00', '12:00', 'Activity', false),
  ('Summer camp signup', 'Deadline', '2026-04-25', NULL, NULL, 'Task', false),
  ('End of year party', NULL, '2026-05-10', '15:00', '18:00', 'Activity', false)
) AS v(title, notes, dt, start_time, end_time, typ, done);

-- Link all tasks created by this user to the kid (includes goal-linked and standalone from this migration)
INSERT INTO task_kids (task_id, kid_id)
SELECT id, '0f5176bf-084d-450f-8a7a-46f32c670974'
FROM tasks
WHERE created_by = 'b5f8c413-4730-4b0a-ae27-e642cddf906e'
  AND created_at >= '2025-10-01'
  AND created_at <= '2026-05-11';

-- One task_owner per task
INSERT INTO task_owners (id, task_id, name, email)
SELECT gen_random_uuid()::text, id, 'Parent Pal', 'parentpal3@gmail.com'
FROM tasks
WHERE created_by = 'b5f8c413-4730-4b0a-ae27-e642cddf906e'
  AND created_at >= '2025-10-01'
  AND created_at <= '2026-05-11';
