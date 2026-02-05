-- Share links: allow drill owners to create shareable links for named versions only.
-- One share link per (drill_id, version_number). Token can be regenerated (updated).
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(drill_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(share_token);
CREATE INDEX IF NOT EXISTS idx_share_links_drill_version ON share_links(drill_id, version_number);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read share_links by token (for anonymous player)
CREATE POLICY "Allow read share_links"
  ON share_links FOR SELECT
  USING (true);

-- Only drill owner can create share links for their drill
CREATE POLICY "Users can create share links for own drills"
  ON share_links FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM drills d
      WHERE d.id = share_links.drill_id AND d.user_id = auth.uid()
    )
  );

-- Only creator can update/delete their share links (e.g. regenerate token)
CREATE POLICY "Users can update own share links"
  ON share_links FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own share links"
  ON share_links FOR DELETE
  USING (auth.uid() = created_by);

-- Allow anonymous read of drills that have an active share link
CREATE POLICY "Allow read drills via share link"
  ON drills FOR SELECT
  USING (
    id IN (
      SELECT drill_id FROM share_links
      WHERE expires_at IS NULL OR expires_at > NOW()
    )
  );

-- Allow anonymous read of drill_versions that have an active share link
CREATE POLICY "Allow read drill_versions via share link"
  ON drill_versions FOR SELECT
  USING (
    (drill_id, version_number) IN (
      SELECT drill_id, version_number FROM share_links
      WHERE expires_at IS NULL OR expires_at > NOW()
    )
  );
