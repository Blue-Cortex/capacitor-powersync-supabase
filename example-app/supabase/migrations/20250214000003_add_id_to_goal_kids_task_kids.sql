-- PowerSync and PostgREST expect an 'id' column for PUT/upsert. Add id to goal_kids and task_kids
-- so uploads from the app (which send id = goal_id || '_' || kid_id) succeed.

-- -----------------------------------------------------------------------------
-- goal_kids: add id as primary key, keep (goal_id, kid_id) unique
-- -----------------------------------------------------------------------------
ALTER TABLE goal_kids ADD COLUMN id TEXT;

UPDATE goal_kids SET id = goal_id || '_' || kid_id WHERE id IS NULL;

ALTER TABLE goal_kids ALTER COLUMN id SET NOT NULL;

ALTER TABLE goal_kids DROP CONSTRAINT goal_kids_pkey;

ALTER TABLE goal_kids ADD PRIMARY KEY (id);

CREATE UNIQUE INDEX goal_kids_goal_id_kid_id_key ON goal_kids(goal_id, kid_id);

-- -----------------------------------------------------------------------------
-- task_kids: add id as primary key, keep (task_id, kid_id) unique
-- -----------------------------------------------------------------------------
ALTER TABLE task_kids ADD COLUMN id TEXT;

UPDATE task_kids SET id = task_id || '_' || kid_id WHERE id IS NULL;

ALTER TABLE task_kids ALTER COLUMN id SET NOT NULL;

ALTER TABLE task_kids DROP CONSTRAINT task_kids_pkey;

ALTER TABLE task_kids ADD PRIMARY KEY (id);

CREATE UNIQUE INDEX task_kids_task_id_kid_id_key ON task_kids(task_id, kid_id);

-- Default id when not provided (e.g. seed scripts or raw INSERTs)
CREATE OR REPLACE FUNCTION goal_kids_set_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := NEW.goal_id || '_' || NEW.kid_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goal_kids_set_id_trigger
  BEFORE INSERT ON goal_kids
  FOR EACH ROW EXECUTE FUNCTION goal_kids_set_id();

CREATE OR REPLACE FUNCTION task_kids_set_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := NEW.task_id || '_' || NEW.kid_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_kids_set_id_trigger
  BEFORE INSERT ON task_kids
  FOR EACH ROW EXECUTE FUNCTION task_kids_set_id();
