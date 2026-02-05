import { Drill } from './drill';

/**
 * Database representation of a drill
 * This is what gets stored in Supabase
 * Note: drill_data is now stored in drill_versions, not in the drills table
 */
export interface DrillRecord {
  id: string;
  user_id: string;
  name: string;
  short_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Input type for creating a new drill record
 */
export interface CreateDrillInput {
  name: string;
  short_id: string;
}

/**
 * Input type for updating a drill record
 */
export interface UpdateDrillInput {
  name?: string;
  short_id?: string;
}

/**
 * Database representation of a drill version
 */
export interface DrillVersionRecord {
  id: string;
  drill_id: string;
  user_id: string;
  version_number: number;
  drill_data: Drill;
  name: string;
  /** User-given name for this version (e.g. "Before competition"). When set, this version is never combined with auto-saves. */
  version_label: string | null;
  audio_url: string | null;
  audio_filename: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Share link record: allows anonymous access to a specific (named) drill version.
 * Only named versions should have share links; enforcement is in the application.
 */
export interface ShareLinkRecord {
  id: string;
  drill_id: string;
  version_number: number;
  share_token: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  access_count: number;
  last_accessed_at: string | null;
}

/**
 * Result type for database operations
 */
export interface DatabaseResult<T> {
  data: T | null;
  error: Error | null;
}

