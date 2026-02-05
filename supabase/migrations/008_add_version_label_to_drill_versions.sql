-- Add version_label to drill_versions for user-named saves.
-- When set, this version was explicitly saved with that name and must never be
-- updated or combined with auto-saved versions.
ALTER TABLE drill_versions
ADD COLUMN IF NOT EXISTS version_label TEXT;
