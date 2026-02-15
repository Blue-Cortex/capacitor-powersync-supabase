-- Parentpal Supabase (PostgreSQL) schema
-- Converted from parent-pal-db-schema.md (SQLite) for Supabase
-- Design: soft deletes, audit trail, multi-assignment, RLS-ready

-- Extensions (Supabase has these by default; uncomment if needed)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CREATE SCHEMA IF NOT EXISTS ppal;
-- SET search_path TO ppal;

-- =============================================================================
-- CORE TABLES
-- =============================================================================

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  zip_code TEXT,
  avatar TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  has_ai_features BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  external_user_id uuid not null,
  FOREIGN KEY (external_user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_users_email ON users(email);

COMMENT ON TABLE users IS 'Parent/guardian accounts';

-- -----------------------------------------------------------------------------
-- User lifecycle state (invited → enrolled → active | inactive | deactivated)
-- -----------------------------------------------------------------------------

CREATE TYPE user_status_enum AS ENUM (
  'invited',
  'enrolled',
  'active',
  'inactive',
  'deactivated'
);

CREATE TABLE user_status (
  user_id TEXT PRIMARY KEY,
  status user_status_enum NOT NULL DEFAULT 'invited',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_user_status_status ON user_status(status);

COMMENT ON TABLE user_status IS 'User lifecycle state throughout the app';

-- -----------------------------------------------------------------------------

CREATE TABLE linked_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'facebook')),
  provider_user_id TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, provider)
) TABLESPACE pg_default;

CREATE INDEX idx_linked_accounts_user ON linked_accounts(user_id);

-- -----------------------------------------------------------------------------

CREATE TABLE kids (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  birthday DATE,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_kids_user ON kids(user_id);

-- -----------------------------------------------------------------------------

CREATE TABLE kid_collaborators (
  kid_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  access TEXT NOT NULL CHECK (access IN ('full', 'view')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  PRIMARY KEY (kid_id, user_id),
  FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_kid_collaborators_user ON kid_collaborators(user_id);
CREATE INDEX idx_kid_collaborators_accepted ON kid_collaborators(accepted_at);

COMMENT ON COLUMN kid_collaborators.access IS 'full = create/edit/delete, view = read-only';

-- =============================================================================
-- GOALS AND TASKS
-- =============================================================================

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Academic', 'Sports', 'Screen Time', 'Food', 'Health', 'Other')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  target TEXT,
  color TEXT NOT NULL,
  deadline DATE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  pinned BOOLEAN DEFAULT FALSE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_by TEXT,
  last_updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (created_by) REFERENCES users(id)
) TABLESPACE pg_default;

CREATE INDEX idx_goals_deleted ON goals(deleted_at);
CREATE INDEX idx_goals_archived ON goals(is_archived);
CREATE INDEX idx_goals_completed ON goals(is_completed);
CREATE INDEX idx_goals_deadline ON goals(deadline);

-- -----------------------------------------------------------------------------

CREATE TABLE goal_kids (
  goal_id TEXT NOT NULL,
  kid_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (goal_id, kid_id),
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_goal_kids_kid ON goal_kids(kid_id);

-- -----------------------------------------------------------------------------

CREATE TABLE goal_owners (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_goal_owners_goal ON goal_owners(goal_id);

-- -----------------------------------------------------------------------------

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  goal_id TEXT,
  title TEXT NOT NULL,
  notes TEXT,
  date DATE,
  start_time TEXT,
  end_time TEXT,
  type TEXT NOT NULL CHECK (type IN ('Activity', 'Task')),
  is_completed BOOLEAN DEFAULT FALSE,
  pinned BOOLEAN DEFAULT FALSE,
  location TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_by TEXT,
  last_updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
) TABLESPACE pg_default;

CREATE INDEX idx_tasks_goal ON tasks(goal_id);
CREATE INDEX idx_tasks_date ON tasks(date);
CREATE INDEX idx_tasks_deleted ON tasks(deleted_at);
CREATE INDEX idx_tasks_completed ON tasks(is_completed);

-- -----------------------------------------------------------------------------

CREATE TABLE task_kids (
  task_id TEXT NOT NULL,
  kid_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, kid_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_task_kids_kid ON task_kids(kid_id);

-- -----------------------------------------------------------------------------

CREATE TABLE task_owners (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_task_owners_task ON task_owners(task_id);

-- =============================================================================
-- ATTACHMENTS
-- =============================================================================

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  goal_id TEXT,
  task_id TEXT,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CHECK (
    (goal_id IS NOT NULL AND task_id IS NULL) OR
    (goal_id IS NULL AND task_id IS NOT NULL)
  )
) TABLESPACE pg_default;

CREATE INDEX idx_attachments_goal ON attachments(goal_id);
CREATE INDEX idx_attachments_task ON attachments(task_id);

-- =============================================================================
-- SETTINGS & PREFERENCES
-- =============================================================================

CREATE TABLE notification_settings (
  user_id TEXT PRIMARY KEY,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  task_reminders BOOLEAN DEFAULT TRUE,
  goal_updates BOOLEAN DEFAULT TRUE,
  insight_alerts BOOLEAN DEFAULT TRUE,
  daily_summary BOOLEAN DEFAULT TRUE,
  weekly_report BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- -----------------------------------------------------------------------------

CREATE TABLE theme_settings (
  user_id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  accent_color TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- -----------------------------------------------------------------------------

CREATE TABLE privacy_settings (
  user_id TEXT PRIMARY KEY,
  data_collection BOOLEAN DEFAULT TRUE,
  analytics_enabled BOOLEAN DEFAULT TRUE,
  share_with_collaborators BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- =============================================================================
-- TRIGGERS (auto-update timestamps)
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER kids_updated_at
  BEFORE UPDATE ON kids
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER goals_last_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION set_last_updated_at();

CREATE TRIGGER tasks_last_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER theme_settings_updated_at
  BEFORE UPDATE ON theme_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER privacy_settings_updated_at
  BEFORE UPDATE ON privacy_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Seed data (requires auth.users row for external_user_id to exist first)
-- =============================================================================

INSERT INTO users (
  id,
  name,
  email,
  email_verified,
  has_ai_features,
  external_user_id,
  zip_code,
  phone_verified,
  phone
) VALUES (
  'b5f8c413-4730-4b0a-ae27-e642cddf906e',
  'Parent Pal',
  'parentpal3@gmail.com',
  true,
  true,
  'b5f8c413-4730-4b0a-ae27-e642cddf906e'::uuid,
  '77407',
  false,
  '5555555555'
);

INSERT INTO user_status (user_id, status)
VALUES ('b5f8c413-4730-4b0a-ae27-e642cddf906e', 'active');
