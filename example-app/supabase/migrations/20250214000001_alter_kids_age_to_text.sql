-- Change kids.age from INTEGER to TEXT (e.g. for flexible values like "5", "12", "18+")
ALTER TABLE kids
  ALTER COLUMN age TYPE TEXT
  USING age::TEXT;
