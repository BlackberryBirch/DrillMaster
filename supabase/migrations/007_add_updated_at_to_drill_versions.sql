-- Add updated_at column to drill_versions table
ALTER TABLE drill_versions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create index for faster lookups by updated_at
CREATE INDEX IF NOT EXISTS idx_drill_versions_updated_at ON drill_versions(updated_at DESC);

-- Set updated_at to created_at for existing records
UPDATE drill_versions 
SET updated_at = created_at 
WHERE updated_at IS NULL OR updated_at = created_at;

-- Policy: Users can update their own drill versions
CREATE POLICY IF NOT EXISTS "Users can update own drill versions"
  ON drill_versions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

