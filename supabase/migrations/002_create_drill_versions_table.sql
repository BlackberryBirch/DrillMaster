-- Create drill_versions table for version history
CREATE TABLE IF NOT EXISTS drill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  drill_data JSONB NOT NULL,
  name TEXT NOT NULL,
  audio_url TEXT,
  audio_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure version numbers are unique per drill
  UNIQUE(drill_id, version_number)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drill_versions_drill_id ON drill_versions(drill_id);
CREATE INDEX IF NOT EXISTS idx_drill_versions_user_id ON drill_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_versions_created_at ON drill_versions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE drill_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own drill versions
CREATE POLICY "Users can view own drill versions"
  ON drill_versions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own drill versions
CREATE POLICY "Users can insert own drill versions"
  ON drill_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own drill versions
CREATE POLICY "Users can delete own drill versions"
  ON drill_versions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically increment version number
CREATE OR REPLACE FUNCTION get_next_version_number(p_drill_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM drill_versions
  WHERE drill_id = p_drill_id;
$$ LANGUAGE SQL;

