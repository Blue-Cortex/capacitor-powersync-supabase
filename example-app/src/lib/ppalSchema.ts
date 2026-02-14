import { SchemaTable } from '@blue-cortex/capacitor-powersync-supabase';

/**
 * PowerSync Database Schema – Parent Pal
 *
 * Matches tables synced from Supabase via powersync-sync-rules.yaml.
 * Each table automatically includes an 'id' column (TEXT, primary key).
 * Types map to SQLite: TEXT, INTEGER (booleans as 0/1), REAL.
 */
export const powerSyncSchema: SchemaTable[] = [
  {
    name: 'lists',
    columns: [
      { name: 'name', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' },
      { name: 'owner_id', type: 'TEXT' }
    ]
  },
  {
    name: 'todos',
    columns: [
      { name: 'list_id', type: 'TEXT' },
      { name: 'photo_id', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'completed', type: 'INTEGER' }, // 0 = false, 1 = true
      { name: 'created_at', type: 'TEXT' },
      { name: 'completed_at', type: 'TEXT' },
      { name: 'created_by', type: 'TEXT' },
      { name: 'completed_by', type: 'TEXT' }
    ],
    indexes: [
      {
        name: 'list_id_idx',
        columns: [{ name: 'list_id', ascending: true }]
      }
    ]
  },
  {
    name: 'users',
    columns: [
      { name: 'name', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'phone', type: 'TEXT' },
      { name: 'zip_code', type: 'TEXT' },
      { name: 'avatar', type: 'TEXT' },
      { name: 'email_verified', type: 'INTEGER' },
      { name: 'phone_verified', type: 'INTEGER' },
      { name: 'has_ai_features', type: 'INTEGER' },
      { name: 'created_at', type: 'TEXT' },
      { name: 'updated_at', type: 'TEXT' },
      { name: 'external_user_id', type: 'TEXT' }
    ],
    indexes: [{ name: 'idx_users_email', columns: [{ name: 'email', ascending: true }] }]
  },
  {
    name: 'user_status',
    columns: [
      { name: 'user_id', type: 'TEXT' },
      { name: 'status', type: 'TEXT' },
      { name: 'updated_at', type: 'TEXT' }
    ],
    indexes: [{ name: 'idx_user_status_status', columns: [{ name: 'status', ascending: true }] }]
  },
  {
    name: 'linked_accounts',
    columns: [
      { name: 'user_id', type: 'TEXT' },
      { name: 'provider', type: 'TEXT' },
      { name: 'provider_user_id', type: 'TEXT' },
      { name: 'linked_at', type: 'TEXT' }
    ],
    indexes: [{ name: 'idx_linked_accounts_user', columns: [{ name: 'user_id', ascending: true }] }]
  },
  {
    name: 'kids',
    columns: [
      { name: 'user_id', type: 'TEXT' },
      { name: 'name', type: 'TEXT' },
      { name: 'age', type: 'TEXT' },
      { name: 'birthday', type: 'TEXT' },
      { name: 'avatar', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' },
      { name: 'updated_at', type: 'TEXT' }
    ],
    indexes: [{ name: 'idx_kids_user', columns: [{ name: 'user_id', ascending: true }] }]
  },
  {
    name: 'kid_collaborators',
    columns: [
      { name: 'kid_id', type: 'TEXT' },
      { name: 'user_id', type: 'TEXT' },
      { name: 'access', type: 'TEXT' },
      { name: 'invited_at', type: 'TEXT' },
      { name: 'accepted_at', type: 'TEXT' }
    ],
    indexes: [
      { name: 'idx_kid_collaborators_user', columns: [{ name: 'user_id', ascending: true }] },
      { name: 'idx_kid_collaborators_accepted', columns: [{ name: 'accepted_at', ascending: true }] }
    ]
  },
  {
    name: 'goals',
    columns: [
      { name: 'title', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'category', type: 'TEXT' },
      { name: 'progress', type: 'INTEGER' },
      { name: 'target', type: 'TEXT' },
      { name: 'color', type: 'TEXT' },
      { name: 'deadline', type: 'TEXT' },
      { name: 'is_archived', type: 'INTEGER' },
      { name: 'is_completed', type: 'INTEGER' },
      { name: 'pinned', type: 'INTEGER' },
      { name: 'created_by', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' },
      { name: 'last_updated_by', type: 'TEXT' },
      { name: 'last_updated_at', type: 'TEXT' },
      { name: 'deleted_at', type: 'TEXT' }
    ],
    indexes: [
      { name: 'idx_goals_deleted', columns: [{ name: 'deleted_at', ascending: true }] },
      { name: 'idx_goals_archived', columns: [{ name: 'is_archived', ascending: true }] },
      { name: 'idx_goals_completed', columns: [{ name: 'is_completed', ascending: true }] },
      { name: 'idx_goals_deadline', columns: [{ name: 'deadline', ascending: true }] }
    ]
  },
  {
    name: 'goal_kids',
    columns: [
      { name: 'goal_id', type: 'TEXT' },
      { name: 'kid_id', type: 'TEXT' },
      { name: 'assigned_at', type: 'TEXT' }
    ],
    indexes: [{ name: 'idx_goal_kids_kid', columns: [{ name: 'kid_id', ascending: true }] }]
  },
  {
    name: 'goal_owners',
    columns: [
      { name: 'goal_id', type: 'TEXT' },
      { name: 'name', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'avatar', type: 'TEXT' }
    ],
    indexes: [{ name: 'idx_goal_owners_goal', columns: [{ name: 'goal_id', ascending: true }] }]
  },
  {
    name: 'tasks',
    columns: [
      { name: 'goal_id', type: 'TEXT' },
      { name: 'title', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' },
      { name: 'date', type: 'TEXT' },
      { name: 'start_time', type: 'TEXT' },
      { name: 'end_time', type: 'TEXT' },
      { name: 'type', type: 'TEXT' },
      { name: 'is_completed', type: 'INTEGER' },
      { name: 'pinned', type: 'INTEGER' },
      { name: 'location', type: 'TEXT' },
      { name: 'created_by', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' },
      { name: 'last_updated_by', type: 'TEXT' },
      { name: 'last_updated_at', type: 'TEXT' },
      { name: 'deleted_at', type: 'TEXT' }
    ],
    indexes: [
      { name: 'idx_tasks_goal', columns: [{ name: 'goal_id', ascending: true }] },
      { name: 'idx_tasks_date', columns: [{ name: 'date', ascending: true }] },
      { name: 'idx_tasks_deleted', columns: [{ name: 'deleted_at', ascending: true }] },
      { name: 'idx_tasks_completed', columns: [{ name: 'is_completed', ascending: true }] }
    ]
  },
  {
    name: 'task_kids',
    columns: [
      { name: 'task_id', type: 'TEXT' },
      { name: 'kid_id', type: 'TEXT' },
      { name: 'assigned_at', type: 'TEXT' }
    ],
    indexes: [{ name: 'idx_task_kids_kid', columns: [{ name: 'kid_id', ascending: true }] }]
  },
  {
    name: 'task_owners',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'task_id', type: 'TEXT' },
      { name: 'name', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'avatar', type: 'TEXT' }
    ],
    indexes: [{ name: 'idx_task_owners_task', columns: [{ name: 'task_id', ascending: true }] }]
  },
  {
    name: 'attachments',
    columns: [
      { name: 'goal_id', type: 'TEXT' },
      { name: 'task_id', type: 'TEXT' },
      { name: 'name', type: 'TEXT' },
      { name: 'size', type: 'INTEGER' },
      { name: 'type', type: 'TEXT' },
      { name: 'url', type: 'TEXT' },
      { name: 'uploaded_at', type: 'TEXT' }
    ],
    indexes: [
      { name: 'idx_attachments_goal', columns: [{ name: 'goal_id', ascending: true }] },
      { name: 'idx_attachments_task', columns: [{ name: 'task_id', ascending: true }] }
    ]
  },
  {
    name: 'notification_settings',
    columns: [
      { name: 'user_id', type: 'TEXT' },
      { name: 'push_enabled', type: 'INTEGER' },
      { name: 'email_enabled', type: 'INTEGER' },
      { name: 'task_reminders', type: 'INTEGER' },
      { name: 'goal_updates', type: 'INTEGER' },
      { name: 'insight_alerts', type: 'INTEGER' },
      { name: 'daily_summary', type: 'INTEGER' },
      { name: 'weekly_report', type: 'INTEGER' },
      { name: 'updated_at', type: 'TEXT' }
    ]
  },
  {
    name: 'privacy_settings',
    columns: [
      { name: 'user_id', type: 'TEXT' },
      { name: 'data_collection', type: 'INTEGER' },
      { name: 'analytics_enabled', type: 'INTEGER' },
      { name: 'share_with_collaborators', type: 'INTEGER' },
      { name: 'updated_at', type: 'TEXT' }
    ]
  }
];
