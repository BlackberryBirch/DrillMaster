-- Refactor drills table: drop audio columns and add short_id column

-- Add short_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drills' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE drills ADD COLUMN short_id TEXT;
    -- Create unique index on short_id for fast lookups
    CREATE UNIQUE INDEX IF NOT EXISTS idx_drills_short_id ON drills(short_id);
    -- Create index on user_id + short_id for user-specific lookups
    CREATE INDEX IF NOT EXISTS idx_drills_user_short_id ON drills(user_id, short_id);
  END IF;
END $$;

-- Drop audio_url column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drills' AND column_name = 'audio_url'
  ) THEN
    ALTER TABLE drills DROP COLUMN audio_url;
  END IF;
END $$;

-- Drop audio_filename column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drills' AND column_name = 'audio_filename'
  ) THEN
    ALTER TABLE drills DROP COLUMN audio_filename;
  END IF;
END $$;

