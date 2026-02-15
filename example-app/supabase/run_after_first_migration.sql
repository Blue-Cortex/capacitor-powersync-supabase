-- Create a role/user with replication privileges for PowerSync
CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD '#Test1234!';

-- Set up permissions for the newly created role
-- Read-only (SELECT) access is required
GRANT SELECT ON ALL TABLES IN SCHEMA ppal TO powersync_role;

-- Optionally, grant SELECT on all future tables (to cater for schema additions)
ALTER DEFAULT PRIVILEGES IN SCHEMA ppal GRANT SELECT ON TABLES TO powersync_role;

-- Create a publication to replicate tables. The publication must be named "powersync"
DROP PUBLICATION IF EXISTS powersync;
CREATE PUBLICATION powersync FOR ALL TABLES;