# Version History & Auto-Save Feature

This document describes the auto-save and version history feature that has been added to Equimotion Studio.

## Overview

The application now includes:
- **Auto-save**: Automatically saves drills to cloud storage periodically and after changes
- **Version History**: Maintains a history of all saved versions of each drill
- **Restore**: Ability to restore any previous version of a drill

## Database Setup

### Migration

Run the migration file to create the `drill_versions` table:

```sql
-- Located in: supabase/migrations/002_create_drill_versions_table.sql
```

This creates:
- `drill_versions` table with version tracking
- Automatic version numbering
- Row-level security policies
- Indexes for performance

### Running the Migration

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of `supabase/migrations/002_create_drill_versions_table.sql`
5. Click **Run**

## Features

### Auto-Save

- **Interval-based**: Saves every 30 seconds (configurable)
- **Debounced**: Saves 5 seconds after the last change (configurable)
- **Change detection**: Only saves if the drill has actually changed
- **Automatic versioning**: Each auto-save creates a new version entry

### Version History

- **View all versions**: Click the "📜 History" button in the toolbar
- **Version details**: See version number, timestamp, drill name, and frame count
- **Restore**: Click "Restore" on any version to restore it
- **Delete**: Remove old versions you no longer need

### How It Works

1. **Auto-save hook** (`useAutoSave.ts`):
   - Monitors drill changes
   - Debounces saves to avoid excessive API calls
   - Creates version history entries automatically

2. **Version History UI** (`VersionHistory.tsx`):
   - Modal dialog showing all versions
   - Displays version metadata
   - Provides restore and delete actions

3. **Service methods** (`drillService.ts`):
   - `createDrillVersion()`: Creates a new version entry
   - `getDrillVersions()`: Retrieves all versions for a drill
   - `getDrillVersion()`: Gets a specific version
   - `deleteDrillVersion()`: Removes a version

## Configuration

Auto-save can be configured in `App.tsx`:

```typescript
useAutoSave({
  enabled: !!user && !!drill && drillId !== 'new',
  interval: 30000, // 30 seconds between saves
  debounceMs: 5000, // 5 seconds after last change
});
```

## Usage

### For Users

1. **Auto-save**: Works automatically when editing a drill (if authenticated)
2. **View history**: Click "📜 History" button in the toolbar
3. **Restore version**: 
   - Open version history
   - Click "Restore" on the desired version
   - Confirm the action
   - The drill will be restored and saved

### For Developers

The auto-save hook can be used in any component:

```typescript
import { useAutoSave } from '../hooks/useAutoSave';

function MyComponent() {
  useAutoSave({
    enabled: true,
    interval: 30000,
    debounceMs: 5000,
  });
  // ...
}
```

## Database Schema

### drill_versions Table

```sql
CREATE TABLE drill_versions (
  id UUID PRIMARY KEY,
  drill_id UUID REFERENCES drills(id),
  user_id UUID REFERENCES auth.users(id),
  version_number INTEGER NOT NULL,
  drill_data JSONB NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE(drill_id, version_number)
);
```

## Security

- Row-level security (RLS) is enabled
- Users can only view/modify their own versions
- All operations require authentication

## Performance Considerations

- Version history is stored as JSONB for efficient querying
- Indexes on `drill_id`, `user_id`, and `created_at` for fast lookups
- Auto-save uses debouncing to minimize API calls
- Change detection prevents unnecessary saves

## Future Enhancements

Potential improvements:
- Version comparison/diff view
- Automatic cleanup of old versions
- Version labels/descriptions
- Export specific versions
- Version branching

