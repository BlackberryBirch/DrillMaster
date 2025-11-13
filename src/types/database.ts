import { Drill } from './drill';

/**
 * Database representation of a drill
 * This is what gets stored in Supabase
 */
export interface DrillRecord {
  id: string;
  user_id: string;
  name: string;
  drill_data: Drill; // Stored as JSONB in PostgreSQL
  audio_url: string | null;
  audio_filename: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input type for creating a new drill record
 */
export interface CreateDrillInput {
  name: string;
  drill_data: Drill;
  audio_url?: string;
  audio_filename?: string;
}

/**
 * Input type for updating a drill record
 */
export interface UpdateDrillInput {
  name?: string;
  drill_data?: Drill;
  audio_url?: string;
  audio_filename?: string;
}

/**
 * Result type for database operations
 */
export interface DatabaseResult<T> {
  data: T | null;
  error: Error | null;
}

