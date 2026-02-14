# Supabase – Parent Pal schema

Migration `migrations/20250213000001_parent_pal_schema.sql` creates the Parent Pal schema on PostgreSQL (Supabase), converted from the SQLite schema in `capacitor-powersync-supabase/example-app/doc/parent-pal-db-schema.md`.

## Apply the migration

**Option A – Supabase CLI (push to remote)**

1. One-time: link the project and set env (get **Project ref** from dashboard URL, **Database password** from Settings → Database):
   ```bash
   cd example-app
   export SUPABASE_PROJECT_REF=your_project_ref   # e.g. abcdefghijklmnopqrst
   export SUPABASE_DB_PASSWORD=your_db_password
   bun run supabase:push
   ```
2. Or copy `.env.local.template` to `.env.local`, set `SUPABASE_PROJECT_REF` and `SUPABASE_DB_PASSWORD`, then:
   ```bash
   set -a && source .env.local && set +a && bun run supabase:push
   ```

**Option B – Supabase Dashboard**

1. In Supabase: **SQL Editor** → **New query**
2. Paste the contents of `migrations/20250213000001_parent_pal_schema.sql`
3. Run the query

**Option C – Local file**

```bash
psql "$DATABASE_URL" -f supabase/migrations/20250213000001_parent_pal_schema.sql
```

## Contents

- All tables from the schema doc (users, kids, goals, tasks, junctions, attachments, settings, app_state, sync_queue)
- `insight_dismissals` table (referenced in doc queries but not defined there)
- PostgreSQL types: `TIMESTAMPTZ`, `BOOLEAN`, `DATE`, `JSONB` for sync_queue payload
- Triggers to keep `updated_at` / `last_updated_at` in sync
- RLS enabled and policies so data is scoped by `auth.uid()::text` (assumes `users.id` matches Supabase auth user id)

## After applying

- If your auth user id is UUID, ensure `users.id` is set from `auth.uid()` on sign-up, or adjust RLS policies to match your id format.
- Optional: uncomment the default user and app_state inserts at the bottom of the migration for local/dev data.
