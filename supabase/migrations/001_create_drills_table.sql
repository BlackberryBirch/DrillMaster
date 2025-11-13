-- Create drills table
CREATE TABLE IF NOT EXISTS drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  drill_data JSONB NOT NULL,
  audio_url TEXT,
  audio_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS drills_user_id_idx ON drills(user_id);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS drills_updated_at_idx ON drills(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own drills
CREATE POLICY "Users can view own drills"
  ON drills
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own drills
CREATE POLICY "Users can insert own drills"
  ON drills
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own drills
CREATE POLICY "Users can update own drills"
  ON drills
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own drills
CREATE POLICY "Users can delete own drills"
  ON drills
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row update
CREATE TRIGGER update_drills_updated_at
  BEFORE UPDATE ON drills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

