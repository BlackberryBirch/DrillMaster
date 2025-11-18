-- Add audio_url and audio_filename columns to drill_versions table
-- This migration is safe to run even if the columns already exist

-- Add audio_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drill_versions' AND column_name = 'audio_url'
  ) THEN
    ALTER TABLE drill_versions ADD COLUMN audio_url TEXT;
  END IF;
END $$;

-- Add audio_filename column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drill_versions' AND column_name = 'audio_filename'
  ) THEN
    ALTER TABLE drill_versions ADD COLUMN audio_filename TEXT;
  END IF;
END $$;

