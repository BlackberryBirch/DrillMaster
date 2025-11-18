-- Drop drill_data column from drills table
-- Drill data will now only be stored in drill_versions table

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drills' AND column_name = 'drill_data'
  ) THEN
    ALTER TABLE drills DROP COLUMN drill_data;
  END IF;
END $$;

