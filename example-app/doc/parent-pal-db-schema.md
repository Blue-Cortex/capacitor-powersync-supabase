# Parentpal SQLite Database Schema

## Overview
This document defines the SQLite database schema for the Parentpal application. The schema is designed to support multi-user collaboration, soft deletes, audit trails, and offline-first functionality with Capacitor.

## Design Principles
- **Soft Deletes**: All primary entities (tasks, goals) support soft deletion via `deleted_at` timestamp
- **Audit Trail**: Track creation and modification with `created_by`, `created_at`, `last_updated_by`, and `last_updated_at`
- **Multi-Assignment**: Tasks and goals can be assigned to multiple children via junction tables
- **Relationships**: Proper foreign key constraints with cascading deletes
- **Timestamps**: All timestamps stored as ISO 8601 strings for SQLite compatibility
- **Flexibility**: Support for attachments, collaborators, and activity scheduling

---

## Core Tables

### 1. users
Stores user account information for the parent/guardian.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  zip_code TEXT,
  avatar TEXT, -- URL to avatar image
  email_verified INTEGER DEFAULT 0, -- SQLite boolean (0/1)
  phone_verified INTEGER DEFAULT 0,
  has_ai_features INTEGER DEFAULT 1, -- Paid feature flag
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
```

---

### 2. linked_accounts
Stores OAuth/SSO connections (Google, Apple, Facebook).

```sql
CREATE TABLE linked_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('google', 'apple', 'facebook')),
  provider_user_id TEXT, -- External OAuth ID
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_linked_accounts_user ON linked_accounts(user_id);
```

---

### 3. kids
Stores child profiles managed by the parent.

```sql
CREATE TABLE kids (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- Owner/parent
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  birthday TEXT, -- ISO 8601 date
  avatar TEXT, -- URL to avatar image
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_kids_user ON kids(user_id);
```

---

### 4. kid_collaborators
Junction table linking users to kids they can collaborate on, with permission levels.

```sql
CREATE TABLE kid_collaborators (
  kid_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  access TEXT NOT NULL CHECK(access IN ('full', 'view')),
  invited_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT, -- NULL if invitation pending
  PRIMARY KEY (kid_id, user_id),
  FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_kid_collaborators_user ON kid_collaborators(user_id);
CREATE INDEX idx_kid_collaborators_accepted ON kid_collaborators(accepted_at);
```

**Purpose**: Links any user to any kid with specific access permissions. A user can be both a parent (owning their own kids) and a collaborator (having access to other users' kids). Teachers, coaches, co-parents, and grandparents are all just users with collaboration rights.

**Access Levels**:
- `full` - Can create/edit/delete goals and tasks
- `view` - Read-only access to view kid's progress

---

## Goals and Tasks

### 5. goals
Stores long-term objectives for children.

```sql
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK(category IN ('Academic', 'Sports', 'Screen Time', 'Food', 'Health', 'Other')),
  progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
  target TEXT, -- Optional target description
  color TEXT NOT NULL, -- Tailwind class (e.g., 'bg-blue-500')
  deadline TEXT, -- ISO 8601 date
  is_archived INTEGER DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  pinned INTEGER DEFAULT 0,
  
  -- Audit trail
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_updated_by TEXT,
  last_updated_at TEXT,
  deleted_at TEXT, -- Soft delete timestamp
  
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_goals_deleted ON goals(deleted_at);
CREATE INDEX idx_goals_archived ON goals(is_archived);
CREATE INDEX idx_goals_completed ON goals(is_completed);
CREATE INDEX idx_goals_deadline ON goals(deadline);
```

---

### 6. goal_kids
Junction table linking goals to one or more children.

```sql
CREATE TABLE goal_kids (
  goal_id TEXT NOT NULL,
  kid_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (goal_id, kid_id),
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
);

CREATE INDEX idx_goal_kids_kid ON goal_kids(kid_id);
```

---

### 7. goal_owners
Stores people responsible for a goal (parent, collaborator, teacher, etc.).

```sql
CREATE TABLE goal_owners (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

CREATE INDEX idx_goal_owners_goal ON goal_owners(goal_id);
```

---

### 8. tasks
Stores individual tasks and activities. Can optionally link to a goal.

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  goal_id TEXT, -- Optional: link to parent goal
  title TEXT NOT NULL,
  notes TEXT,
  
  -- Date/time fields
  date TEXT, -- ISO 8601 date (optional - tasks can have no deadline)
  start_time TEXT, -- For activities (e.g., "10:00 AM")
  end_time TEXT, -- For activities (e.g., "11:00 AM")
  
  -- Task metadata
  type TEXT NOT NULL CHECK(type IN ('Activity', 'Task')),
  is_completed INTEGER DEFAULT 0,
  pinned INTEGER DEFAULT 0,
  location TEXT,
  
  -- Audit trail
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_updated_by TEXT,
  last_updated_at TEXT,
  deleted_at TEXT, -- Soft delete timestamp
  
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_tasks_goal ON tasks(goal_id);
CREATE INDEX idx_tasks_date ON tasks(date);
CREATE INDEX idx_tasks_deleted ON tasks(deleted_at);
CREATE INDEX idx_tasks_completed ON tasks(is_completed);
```

---

### 9. task_kids
Junction table linking tasks to one or more children.

```sql
CREATE TABLE task_kids (
  task_id TEXT NOT NULL,
  kid_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (task_id, kid_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_kids_kid ON task_kids(kid_id);
```

---

### 10. task_owners
Stores people responsible for a task (similar to goal_owners).

```sql
CREATE TABLE task_owners (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_owners_task ON task_owners(task_id);
```

---

## Attachments

### 11. attachments
Stores files attached to goals or tasks.

```sql
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  goal_id TEXT,
  task_id TEXT,
  name TEXT NOT NULL,
  size INTEGER NOT NULL, -- Bytes
  type TEXT NOT NULL, -- MIME type (e.g., 'image/png')
  url TEXT, -- Local file path or cloud URL
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Ensure attachment belongs to either a goal or task, not both
  CHECK ((goal_id IS NOT NULL AND task_id IS NULL) OR (goal_id IS NULL AND task_id IS NOT NULL))
);

CREATE INDEX idx_attachments_goal ON attachments(goal_id);
CREATE INDEX idx_attachments_task ON attachments(task_id);
```

---

## Insights & AI

### LLM Context Data Sources

### Data Retrieved from Existing Tables for Daily Insight Generation

When generating insights, the system queries:

1. **Kids Table**: Get all active children profiles (id, name, age)

2. **Goals Table**: 
   - All active goals (not deleted, not archived) for each kid
   - Goal progress, category, deadline proximity
   - Recent updates (via `last_updated_at`)

3. **Tasks Table** (14-day window):
   - Tasks dated between `DATE('now', '-7 days')` and `DATE('now', '+7 days')`
   - Completion status, type (Activity vs Task)
   - Overdue tasks, upcoming deadlines
   - Recent completions showing progress patterns

### Previous Insights Context

Previous day's insights are stored in **app state/localStorage** (not database) to provide LLM context. The app tracks:
- `last_insights_generated_at` timestamp
- `previous_insights` JSON array

This allows the LLM to reference yesterday's insights for continuity without persisting historical data in SQLite.

### What the LLM Generates (In Memory, Not Stored)

The LLM returns a structured JSON response with insights like:

```typescript
interface GeneratedInsight {
  id: string; // Temporary ID for UI rendering
  kidId: string;
  title: string;
  description: string;
  type: 'Growth' | 'Alert' | 'Achievement' | 'Suggestion';
  source: string; // e.g., 'Activity Data', 'Goal Progress'
  actions?: Array<{
    label: string;
    type: 'primary' | 'secondary';
    action: string;
  }>;
  date: Date;
}
```

These insights live only in React state (`context.tsx`) and are regenerated daily or on-demand.

---

## Settings & Preferences

### 12. notification_settings
Per-user notification preferences.

```sql
CREATE TABLE notification_settings (
  user_id TEXT PRIMARY KEY,
  push_enabled INTEGER DEFAULT 1,
  email_enabled INTEGER DEFAULT 1,
  task_reminders INTEGER DEFAULT 1,
  goal_updates INTEGER DEFAULT 1,
  insight_alerts INTEGER DEFAULT 1,
  daily_summary INTEGER DEFAULT 1,
  weekly_report INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### 13. theme_settings
User interface theme preferences.

```sql
CREATE TABLE theme_settings (
  user_id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light', 'dark', 'auto')),
  accent_color TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### 14. privacy_settings
Privacy-related settings.

```sql
CREATE TABLE privacy_settings (
  user_id TEXT PRIMARY KEY,
  data_collection INTEGER DEFAULT 1,
  analytics_enabled INTEGER DEFAULT 1,
  share_with_collaborators INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Session & State

### 15. app_state
Stores user's UI state (current tab, filters, etc.) for persistence.

```sql
CREATE TABLE app_state (
  user_id TEXT PRIMARY KEY,
  active_tab TEXT NOT NULL DEFAULT 'pulse' CHECK(active_tab IN ('pulse', 'goals', 'calendar', 'profile', 'notifications')),
  selected_kid_ids TEXT, -- JSON array of kid IDs (empty = all kids)
  last_sync_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Triggers for Automatic Timestamps

### Update timestamps on modification

```sql
-- Users
CREATE TRIGGER update_users_timestamp 
AFTER UPDATE ON users 
FOR EACH ROW 
BEGIN
  UPDATE users SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Kids
CREATE TRIGGER update_kids_timestamp 
AFTER UPDATE ON kids 
FOR EACH ROW 
BEGIN
  UPDATE kids SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Goals
CREATE TRIGGER update_goals_timestamp 
AFTER UPDATE ON goals 
FOR EACH ROW 
BEGIN
  UPDATE goals SET last_updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Tasks
CREATE TRIGGER update_tasks_timestamp 
AFTER UPDATE ON tasks 
FOR EACH ROW 
BEGIN
  UPDATE tasks SET last_updated_at = datetime('now') WHERE id = OLD.id;
END;
```

---

## Common Queries

### Get all active goals for a specific kid

```sql
SELECT g.*, 
       GROUP_CONCAT(DISTINCT k.name) as kid_names,
       COUNT(DISTINCT t.id) as total_tasks,
       SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END) as completed_tasks
FROM goals g
JOIN goal_kids gk ON g.id = gk.goal_id
JOIN kids k ON gk.kid_id = k.id
LEFT JOIN tasks t ON g.id = t.goal_id AND t.deleted_at IS NULL
WHERE gk.kid_id = ? 
  AND g.deleted_at IS NULL 
  AND g.is_archived = 0
GROUP BY g.id
ORDER BY g.pinned DESC, g.created_at DESC;
```

---

### Get upcoming tasks for a kid (next 7 days)

```sql
SELECT t.*, 
       GROUP_CONCAT(DISTINCT k.name) as kid_names,
       g.title as goal_title
FROM tasks t
JOIN task_kids tk ON t.id = tk.task_id
JOIN kids k ON tk.kid_id = k.id
LEFT JOIN goals g ON t.goal_id = g.id
WHERE tk.kid_id = ? 
  AND t.deleted_at IS NULL
  AND t.is_completed = 0
  AND (t.date IS NULL OR DATE(t.date) BETWEEN DATE('now') AND DATE('now', '+7 days'))
ORDER BY t.date ASC, t.start_time ASC;
```

---

### Get all soft-deleted items (for Trash feature)

```sql
-- Deleted Goals
SELECT 'goal' as type, 
       id, 
       title as name, 
       deleted_at, 
       GROUP_CONCAT(k.name) as kids
FROM goals g
JOIN goal_kids gk ON g.id = gk.goal_id
JOIN kids k ON gk.kid_id = k.id
WHERE g.deleted_at IS NOT NULL
GROUP BY g.id

UNION ALL

-- Deleted Tasks
SELECT 'task' as type, 
       id, 
       title as name, 
       deleted_at,
       GROUP_CONCAT(k.name) as kids
FROM tasks t
JOIN task_kids tk ON t.id = tk.task_id
JOIN kids k ON tk.kid_id = k.id
WHERE t.deleted_at IS NOT NULL
GROUP BY t.id

ORDER BY deleted_at DESC;
```

---

### Get data for LLM insight generation (14-day window)

```sql
-- Get tasks from 1 week before to 1 week ahead for LLM context
SELECT t.*, 
       GROUP_CONCAT(DISTINCT k.name) as kid_names,
       g.title as goal_title,
       g.category as goal_category
FROM tasks t
JOIN task_kids tk ON t.id = tk.task_id
JOIN kids k ON tk.kid_id = k.id
LEFT JOIN goals g ON t.goal_id = g.id
WHERE tk.kid_id = ? 
  AND t.deleted_at IS NULL
  AND (
    t.date IS NULL 
    OR DATE(t.date) BETWEEN DATE('now', '-7 days') AND DATE('now', '+7 days')
  )
ORDER BY t.date ASC, t.is_completed ASC;
```

---

### Check active insight dismissals

```sql
-- Get dismissals that haven't expired
SELECT kid_id, insight_type, dismissed_at, expires_at
FROM insight_dismissals
WHERE kid_id IN (?)
  AND (expires_at IS NULL OR DATE(expires_at) > DATE('now'))
ORDER BY dismissed_at DESC;
```

---

### Get all kids accessible to a user (owned + collaborated)

```sql
-- Get kids the user owns or collaborates on
SELECT k.*,
       CASE 
         WHEN k.user_id = ? THEN 'owner'
         ELSE kc.access
       END as access_level,
       u.name as owner_name,
       u.email as owner_email
FROM kids k
LEFT JOIN kid_collaborators kc ON k.id = kc.kid_id AND kc.user_id = ?
LEFT JOIN users u ON k.user_id = u.id
WHERE k.user_id = ? 
   OR (kc.user_id = ? AND kc.accepted_at IS NOT NULL)
ORDER BY k.created_at DESC;
```

---

### Get all collaborators for a kid

```sql
-- Get owner and collaborators for a kid
SELECT u.id, u.name, u.email, u.avatar,
       CASE 
         WHEN k.user_id = u.id THEN 'owner'
         ELSE kc.access
       END as role,
       kc.invited_at,
       kc.accepted_at
FROM kids k
LEFT JOIN kid_collaborators kc ON k.id = kc.kid_id
LEFT JOIN users u ON (u.id = kc.user_id OR u.id = k.user_id)
WHERE k.id = ?
ORDER BY 
  CASE WHEN k.user_id = u.id THEN 0 ELSE 1 END,
  u.name ASC;
```

---

### Calculate goal progress based on task completion

```sql
SELECT g.id,
       g.title,
       COUNT(t.id) as total_tasks,
       SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
       CASE 
         WHEN COUNT(t.id) > 0 THEN ROUND((SUM(CASE WHEN t.is_completed = 1 THEN 1.0 ELSE 0 END) / COUNT(t.id)) * 100)
         ELSE 0 
       END as calculated_progress
FROM goals g
LEFT JOIN tasks t ON g.id = t.goal_id AND t.deleted_at IS NULL
WHERE g.deleted_at IS NULL
GROUP BY g.id;
```

---

## Migration Notes

### From Current Mock Data Structure

When migrating from the current React context state to SQLite:

1. **User Setup**: Create a user record for the authenticated parent
2. **Kids Migration**: Insert kids with proper `user_id` reference
3. **Collaborators Migration**:
   - For each collaborator in the current `Kid.collaborators[]` array, check if a user exists by email
   - If user doesn't exist, create a user record for them (they can claim it later)
   - Create entries in `kid_collaborators` junction table linking user to kid with appropriate access level
4. **Goals Migration**: 
   - Insert goal records
   - Create entries in `goal_kids` for each kid assigned
   - Create entries in `goal_owners` for each owner
5. **Tasks Migration**:
   - Insert task records with optional `goal_id`
   - Create entries in `task_kids` for each kid assigned
   - Create entries in `task_owners` for each owner
6. **Settings**: Initialize default notification, theme, and privacy settings

**Key Change**: The old `collaborators` table stored redundant user data. Now collaborators are users in the `users` table, linked via `kid_collaborators`. This allows:
- Collaborators to have their own accounts and be parents themselves
- A single user record shared across multiple kid collaborations
- Proper authentication and permission management

### Schema Evolution

Consider using a migration tool like:
- **Knex.js** migrations for JavaScript/TypeScript
- **Drizzle ORM** with SQLite adapter
- Custom migration scripts with version tracking

---

## Offline-First Considerations

### Sync Strategy

For Capacitor apps with offline support:

1. **Local-First**: All writes go to local SQLite first
2. **Sync Queue**: Track pending changes in a sync queue table
3. **Conflict Resolution**: Last-write-wins or manual conflict resolution
4. **Optimistic Updates**: Update UI immediately, sync in background

### Sync Queue Table

```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
  payload TEXT, -- JSON snapshot of the record
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at TEXT,
  retry_count INTEGER DEFAULT 0
);

CREATE INDEX idx_sync_queue_synced ON sync_queue(synced_at);
```

---

## Security Considerations

1. **Row-Level Security**: When syncing with a backend (e.g., Supabase), implement RLS policies
2. **Encryption**: Consider encrypting sensitive fields (e.g., notes, emails) at rest
3. **Input Validation**: Always validate/sanitize user input before queries
4. **Prepared Statements**: Use parameterized queries to prevent SQL injection
5. **Access Control**: Verify user owns the kid/goal/task before allowing operations

---

## Performance Optimization

1. **Indexes**: Already defined on frequently queried columns
2. **Pagination**: Use LIMIT/OFFSET for large result sets
3. **Vacuum**: Periodically run `VACUUM` to reclaim space and optimize
4. **Analyze**: Run `ANALYZE` to update query planner statistics
5. **Connection Pooling**: Reuse database connections in the app

```sql
-- Maintenance queries
PRAGMA optimize;
PRAGMA integrity_check;
VACUUM;
ANALYZE;
```

---

## Future Enhancements

Potential schema additions:

1. **Recurring Tasks**: Add a `recurrence_rule` table for repeating tasks
2. **Achievements/Badges**: Track kid accomplishments
3. **Activity Log**: Detailed audit log of all changes
4. **Comments/Notes**: Thread discussions on goals/tasks
5. **Templates**: Pre-built goal/task templates for common scenarios
6. **Reminders**: Custom notification rules per task/goal
7. **Time Tracking**: Log actual time spent on tasks
8. **Media Library**: Centralized storage for photos/videos

---

## Database File Location

### For Capacitor

```typescript
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

const DB_NAME = 'parentpal.db';
const DB_VERSION = 1;

// Database will be stored at platform-specific location:
// - iOS: Documents folder
// - Android: databases folder
// - Web: IndexedDB (fallback)
```

### Backup Strategy

```typescript
// Export database for backup
async function exportDatabase() {
  const data = await CapacitorSQLite.exportToJson({
    database: DB_NAME,
    jsonexportmode: 'full'
  });
  return data.export;
}

// Import database from backup
async function importDatabase(jsonData: string) {
  await CapacitorSQLite.importFromJson({
    database: DB_NAME,
    jsonstring: jsonData
  });
}
```

---

## Complete Schema Setup Script

```sql
-- Enable foreign key support (must be run per connection)
PRAGMA foreign_keys = ON;

-- Run all CREATE TABLE statements in order
-- (Copy from sections above)

-- Run all CREATE INDEX statements

-- Run all CREATE TRIGGER statements

-- Insert default data if needed
INSERT INTO users (id, name, email, has_ai_features) 
VALUES ('default-user', 'Parent', 'parent@example.com', 1);

INSERT INTO app_state (user_id, active_tab, selected_kid_ids) 
VALUES ('default-user', 'pulse', '[]');

-- Commit transaction
COMMIT;
```

---

## License & Attribution

This schema is designed for the Parentpal iOS-style React application using SQLite with Capacitor for offline-first mobile functionality.