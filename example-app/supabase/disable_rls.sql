DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'default'
  LOOP
    EXECUTE format('ALTER TABLE default.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;