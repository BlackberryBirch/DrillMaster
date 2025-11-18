-- Populate short_id column from drill_data->>'id' for existing drills
-- This migration is safe to run multiple times (only updates NULL short_id values)

UPDATE drills
SET short_id = drill_data->>'id'
WHERE short_id IS NULL 
  AND drill_data->>'id' IS NOT NULL
  AND LENGTH(drill_data->>'id') <= 8;

-- Add a NOT NULL constraint after populating (optional, can be done manually if needed)
-- ALTER TABLE drills ALTER COLUMN short_id SET NOT NULL;

