import { supabase } from '../lib/supabase';
import { Drill } from '../types/drill';
import { DrillRecord, CreateDrillInput, UpdateDrillInput, DatabaseResult, DrillVersionRecord } from '../types/database';
import type { User } from '@supabase/supabase-js';
import { JSONFileFormatAdapter } from '../utils/fileIO';

/**
 * Configuration constants
 */
const CONFIG = {
  VERSION_UPDATE_THRESHOLD_MS: 15 * 60 * 1000, // 15 minutes
  SHORT_ID_MAX_LENGTH: 8,
  DUPLICATE_KEY_ERROR_CODE: '23505',
  DRILL_VERSIONS_UNIQUE_KEY: 'drill_versions_drill_id_version_number_key',
} as const;

/**
 * Service for managing drills in Supabase
 */
export class DrillService {
  /**
   * Ensure user is authenticated
   * @returns User object or error result
   */
  private async ensureAuthenticated(): Promise<{ user: User; error: null } | { user: null; error: Error }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { user: null, error: new Error('User not authenticated') };
    }
    return { user, error: null };
  }

  /**
   * Create a standardized error result
   */
  private createErrorResult<T>(error: unknown, operation: string): DatabaseResult<T> {
    if (error instanceof Error) {
      return {
        data: null,
        error: new Error(`Failed to ${operation}: ${error.message}`),
      };
    }
    return {
      data: null,
      error: new Error(`Failed to ${operation}: Unknown error occurred`),
    };
  }

  /**
   * Wrap a database operation with error handling
   */
  private async wrapDatabaseOperation<T>(
    operation: () => Promise<DatabaseResult<T>>,
    operationName: string
  ): Promise<DatabaseResult<T>> {
    try {
      return await operation();
    } catch (error) {
      return this.createErrorResult<T>(error, operationName);
    }
  }

  /**
   * Serialize drill data for JSONB storage (converts Date objects to strings)
   * Excludes signed URLs from audioTrack - only saves storagePath
   */
  private serializeDrill(drill: Drill): unknown {
    // Create a copy without the signed URL in audioTrack
    const drillToSerialize = {
      ...drill,
      audioTrack: drill.audioTrack ? {
        // Exclude url (signed URL) - only save storagePath
        storagePath: drill.audioTrack.storagePath,
        offset: drill.audioTrack.offset,
        filename: drill.audioTrack.filename,
      } : undefined,
    };
    return JSON.parse(JSON.stringify(drillToSerialize));
  }

  /**
   * Get the latest version for a drill
   */
  private async getLatestVersion(
    drillId: string,
    userId: string
  ): Promise<{ data: { id: string; version_number: number; created_at: string; version_label: string | null } | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('drill_versions')
      .select('id, version_number, created_at, version_label')
      .eq('drill_id', drillId)
      .eq('user_id', userId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(`Failed to fetch latest version: ${error.message}`) };
    }

    return { data, error: null };
  }

  /**
   * Check if existing version should be updated based on age.
   * Named versions (version_label set) are never updated by auto-save.
   */
  private shouldUpdateExistingVersion(latestVersion: { created_at: string; version_label?: string | null } | null): boolean {
    if (!latestVersion || !latestVersion.created_at) {
      return false;
    }
    // Never update a version that has a user-given name (explicit save)
    if (latestVersion.version_label != null && latestVersion.version_label !== '') {
      return false;
    }

    const now = new Date();
    const versionAge = now.getTime() - new Date(latestVersion.created_at).getTime();
    return versionAge < CONFIG.VERSION_UPDATE_THRESHOLD_MS;
  }

  /**
   * Get the next version number for a drill
   */
  private async getNextVersionNumber(drillId: string, userId: string): Promise<number> {
    const { data: latestVersion } = await supabase
      .from('drill_versions')
      .select('version_number')
      .eq('drill_id', drillId)
      .eq('user_id', userId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    return latestVersion ? latestVersion.version_number + 1 : 1;
  }

  /**
   * Check if error is a duplicate key error
   */
  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      error.code === CONFIG.DUPLICATE_KEY_ERROR_CODE &&
      typeof error.message === 'string' &&
      error.message.includes(CONFIG.DRILL_VERSIONS_UNIQUE_KEY)
    );
  }

  /**
   * Update an existing drill version
   */
  private async updateExistingVersion(
    versionId: string,
    drill: Drill,
    audioUrl?: string | null,
    audioFilename?: string | null
  ): Promise<DatabaseResult<DrillVersionRecord>> {
    const serializedDrill = this.serializeDrill(drill);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('drill_versions')
      .update({
        drill_data: serializedDrill,
        name: drill.name,
        audio_url: audioUrl || null,
        audio_filename: audioFilename || null,
        updated_at: now,
      })
      .eq('id', versionId)
      .select()
      .maybeSingle();

    if (error) {
      return this.createErrorResult(error, 'update drill version');
    }

    if (!data) {
      return {
        data: null,
        error: new Error('Version not found or update failed'),
      };
    }

    return { data: data as DrillVersionRecord, error: null };
  }

  /**
   * Insert a new version with retry logic for duplicate key errors
   */
  private async insertVersionWithRetry(
    drillId: string,
    userId: string,
    initialVersionNumber: number,
    drill: Drill,
    audioUrl?: string | null,
    audioFilename?: string | null,
    versionLabel?: string | null
  ): Promise<DatabaseResult<DrillVersionRecord>> {
    let versionNumber = initialVersionNumber;
    const serializedDrill = this.serializeDrill(drill);
    const now = new Date().toISOString();
    const insertPayload = {
      drill_id: drillId,
      user_id: userId,
      version_number: versionNumber,
      drill_data: serializedDrill,
      name: drill.name,
      version_label: versionLabel || null,
      audio_url: audioUrl || null,
      audio_filename: audioFilename || null,
      updated_at: now,
    };

    // Try inserting with the initial version number
    const { data, error } = await supabase
      .from('drill_versions')
      .insert(insertPayload)
      .select()
      .single();

    // If duplicate key error, retry with next version number
    if (error && this.isDuplicateKeyError(error)) {
      console.log(`[DrillService] Duplicate key error detected, retrying with next version number for drill ${drillId}`);
      
      // Get the actual latest version number
      versionNumber = await this.getNextVersionNumber(drillId, userId);
      console.log(`[DrillService] Retrying: Creating new version ${versionNumber} for drill ${drillId} (${drill.name})`);

      // Retry insert
      const { data: retryData, error: retryError } = await supabase
        .from('drill_versions')
        .insert({ ...insertPayload, version_number: versionNumber })
        .select()
        .single();

      if (retryError) {
        console.error(`[DrillService] Failed to create version ${versionNumber} after retry:`, retryError.message);
        return this.createErrorResult(retryError, 'create drill version');
      }

      console.log(`[DrillService] Successfully created version ${versionNumber} for drill ${drillId} (${drill.name})`);
      return { data: retryData as DrillVersionRecord, error: null };
    }

    if (error) {
      console.error(`[DrillService] Failed to create version ${versionNumber}:`, error.message);
      return this.createErrorResult(error, 'create drill version');
    }

    console.log(`[DrillService] Successfully created version ${versionNumber} for drill ${drillId} (${drill.name})`);
    return { data: data as DrillVersionRecord, error: null };
  }

  /**
   * Create a new drill version
   */
  private async createNewVersion(
    drillId: string,
    userId: string,
    drill: Drill,
    audioUrl?: string | null,
    audioFilename?: string | null,
    versionLabel?: string | null
  ): Promise<DatabaseResult<DrillVersionRecord>> {
    const latestVersion = await this.getLatestVersion(drillId, userId);
    
    if (latestVersion.error) {
      return { data: null, error: latestVersion.error };
    }

    const now = new Date();
    if (latestVersion.data) {
      const ageMinutes = (now.getTime() - new Date(latestVersion.data.created_at).getTime()) / (60 * 1000);
      console.log(
        `[DrillService] Latest version ${latestVersion.data.version_number} is ${ageMinutes.toFixed(1)} minutes old (>15 min), creating new version for drill ${drillId} (${drill.name})`
      );
    } else {
      console.log(`[DrillService] No existing versions found, creating first version for drill ${drillId} (${drill.name})`);
    }

    const nextVersion = await this.getNextVersionNumber(drillId, userId);
    console.log(`[DrillService] Creating new version ${nextVersion} for drill ${drillId} (${drill.name})`);

    return this.insertVersionWithRetry(drillId, userId, nextVersion, drill, audioUrl, audioFilename, versionLabel);
  }
  /**
   * Get all drills for the current user
   */
  async getUserDrills(): Promise<DatabaseResult<DrillRecord[]>> {
    return this.wrapDatabaseOperation(async () => {
      const authResult = await this.ensureAuthenticated();
      if (authResult.error) {
        return { data: null, error: authResult.error };
      }

      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .eq('user_id', authResult.user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        return this.createErrorResult(error, 'fetch drills');
      }

      return {
        data: data as DrillRecord[],
        error: null,
      };
    }, 'get user drills');
  }

  /**
   * Get a single drill by database UUID
   */
  async getDrillById(drillId: string): Promise<DatabaseResult<DrillRecord>> {
    return this.wrapDatabaseOperation(async () => {
      const authResult = await this.ensureAuthenticated();
      if (authResult.error) {
        return { data: null, error: authResult.error };
      }

      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .eq('id', drillId)
        .eq('user_id', authResult.user.id)
        .single();

      if (error) {
        return this.createErrorResult(error, 'fetch drill');
      }

      return {
        data: data as DrillRecord,
        error: null,
      };
    }, 'get drill by id');
  }

  /**
   * Get a drill by its short ID (stored in short_id column)
   * This is used for URL-based drill access
   */
  async getDrillByShortId(shortId: string): Promise<DatabaseResult<DrillRecord>> {
    return this.wrapDatabaseOperation(async () => {
      const authResult = await this.ensureAuthenticated();
      if (authResult.error) {
        return { data: null, error: authResult.error };
      }

      if (shortId.length > CONFIG.SHORT_ID_MAX_LENGTH) {
        return {
          data: null,
          error: new Error('Short ID is too long'),
        };
      }

      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .eq('user_id', authResult.user.id)
        .eq('short_id', shortId)
        .single();

      if (error) {
        return this.createErrorResult(error, 'fetch drill');
      }

      return {
        data: data as DrillRecord,
        error: null,
      };
    }, 'get drill by short id');
  }

  /**
   * Create a new drill
   */
  async createDrill(input: CreateDrillInput): Promise<DatabaseResult<DrillRecord>> {
    return this.wrapDatabaseOperation(async () => {
      const authResult = await this.ensureAuthenticated();
      if (authResult.error) {
        return { data: null, error: authResult.error };
      }

      const { data, error } = await supabase
        .from('drills')
        .insert({
          user_id: authResult.user.id,
          name: input.name,
          short_id: input.short_id,
        })
        .select()
        .single();

      if (error) {
        return this.createErrorResult(error, 'create drill');
      }

      return {
        data: data as DrillRecord,
        error: null,
      };
    }, 'create drill');
  }

  /**
   * Update an existing drill
   */
  async updateDrill(drillId: string, input: UpdateDrillInput): Promise<DatabaseResult<DrillRecord>> {
    return this.wrapDatabaseOperation(async () => {
      const authResult = await this.ensureAuthenticated();
      if (authResult.error) {
        return { data: null, error: authResult.error };
      }

      // First verify the drill belongs to the user
      const { data: existingDrill, error: fetchError } = await supabase
        .from('drills')
        .select('id')
        .eq('id', drillId)
        .eq('user_id', authResult.user.id)
        .single();

      if (fetchError || !existingDrill) {
        return {
          data: null,
          error: new Error('Drill not found or access denied'),
        };
      }

      const updateData: Partial<DrillRecord> = {
        updated_at: new Date().toISOString(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.short_id !== undefined) updateData.short_id = input.short_id;

      const { data, error } = await supabase
        .from('drills')
        .update(updateData)
        .eq('id', drillId)
        .eq('user_id', authResult.user.id)
        .select()
        .single();

      if (error) {
        return this.createErrorResult(error, 'update drill');
      }

      return {
        data: data as DrillRecord,
        error: null,
      };
    }, 'update drill');
  }

  /**
   * Delete a drill
   */
  async deleteDrill(drillId: string): Promise<DatabaseResult<void>> {
    return this.wrapDatabaseOperation(async () => {
      const authResult = await this.ensureAuthenticated();
      if (authResult.error) {
        return { data: null, error: authResult.error };
      }

      const { error } = await supabase
        .from('drills')
        .delete()
        .eq('id', drillId)
        .eq('user_id', authResult.user.id);

      if (error) {
        return this.createErrorResult(error, 'delete drill');
      }

      return {
        data: undefined,
        error: null,
      };
    }, 'delete drill');
  }

  /**
   * Create or update a version of a drill
   * Creates a new version if the latest version is more than 15 minutes old,
   * or if the latest version has a version_label (named save), or if versionLabel is provided.
   * Otherwise updates the current auto-saved version.
   */
  async createDrillVersion(
    drillId: string,
    drill: Drill,
    audioUrl?: string | null,
    audioFilename?: string | null,
    versionLabel?: string | null
  ): Promise<DatabaseResult<DrillVersionRecord>> {
    return this.wrapDatabaseOperation(async () => {
      const authResult = await this.ensureAuthenticated();
      if (authResult.error) {
        return { data: null, error: authResult.error };
      }

      // Explicit named save: always create a new version, never update
      if (versionLabel != null && versionLabel.trim() !== '') {
        console.log(`[DrillService] Creating named version "${versionLabel}" for drill ${drillId} (${drill.name})`);
        return this.createNewVersion(drillId, authResult.user.id, drill, audioUrl, audioFilename, versionLabel.trim());
      }

      // Get the latest version
      const latestVersionResult = await this.getLatestVersion(drillId, authResult.user.id);
      if (latestVersionResult.error) {
        return { data: null, error: latestVersionResult.error };
      }

      const latestVersion = latestVersionResult.data;

      // Check if we should update existing version or create new one
      if (latestVersion && this.shouldUpdateExistingVersion(latestVersion)) {
        console.log(
          `[DrillService] Updating existing version ${latestVersion.version_number} for drill ${drillId} (${drill.name})`
        );

        const updateResult = await this.updateExistingVersion(
          latestVersion.id,
          drill,
          audioUrl,
          audioFilename
        );

        // If update failed or returned no data, fall back to creating new version
        if (updateResult.error || !updateResult.data) {
          console.log(
            `[DrillService] Update returned no data, falling back to creating new version for drill ${drillId}`
          );
          return this.createNewVersion(drillId, authResult.user.id, drill, audioUrl, audioFilename, null);
        }

        console.log(
          `[DrillService] Successfully updated version ${latestVersion.version_number} for drill ${drillId} (${drill.name})`
        );
        return updateResult;
      }

      // Create a new version
      return this.createNewVersion(drillId, authResult.user.id, drill, audioUrl, audioFilename, null);
    }, 'create drill version');
  }

  /**
   * Get all versions for a drill
   */
  async getDrillVersions(drillId: string): Promise<DatabaseResult<DrillVersionRecord[]>> {
    return this.wrapDatabaseOperation(async () => {
      const authResult = await this.ensureAuthenticated();
      if (authResult.error) {
        return { data: null, error: authResult.error };
      }

      const { data, error } = await supabase
        .from('drill_versions')
        .select('*')
        .eq('drill_id', drillId)
        .eq('user_id', authResult.user.id)
        .order('version_number', { ascending: false });

      if (error) {
        return this.createErrorResult(error, 'fetch drill versions');
      }

      return {
        data: data as DrillVersionRecord[],
        error: null,
      };
    }, 'get drill versions');
  }

  /**
   * Get a specific version by version number
   */
  async getDrillVersion(drillId: string, versionNumber: number): Promise<DatabaseResult<DrillVersionRecord>> {
    return this.wrapDatabaseOperation(async () => {
      const authResult = await this.ensureAuthenticated();
      if (authResult.error) {
        return { data: null, error: authResult.error };
      }

      const { data, error } = await supabase
        .from('drill_versions')
        .select('*')
        .eq('drill_id', drillId)
        .eq('version_number', versionNumber)
        .eq('user_id', authResult.user.id)
        .single();

      if (error) {
        return this.createErrorResult(error, 'fetch drill version');
      }

      return {
        data: data as DrillVersionRecord,
        error: null,
      };
    }, 'get drill version');
  }

  /**
   * Delete a drill version
   */
  async deleteDrillVersion(versionId: string): Promise<DatabaseResult<void>> {
    return this.wrapDatabaseOperation(async () => {
      const authResult = await this.ensureAuthenticated();
      if (authResult.error) {
        return { data: null, error: authResult.error };
      }

      const { error } = await supabase
        .from('drill_versions')
        .delete()
        .eq('id', versionId)
        .eq('user_id', authResult.user.id);

      if (error) {
        return this.createErrorResult(error, 'delete drill version');
      }

      return {
        data: null,
        error: null,
      };
    }, 'delete drill version');
  }

  /**
   * Convert a DrillRecord to a Drill (for use in the app)
   * Note: This method now requires loading the latest version to get drill_data
   * Use getDrillWithLatestVersion() instead for loading drills
   * 
   * IMPORTANT: This method also migrates old normalized coordinates (0-1) to meters
   * for drills loaded from the cloud, ensuring backward compatibility.
   */
  static async recordToDrill(record: DrillRecord, latestVersion: DrillVersionRecord | null): Promise<Drill | null> {
    if (!latestVersion) {
      return null;
    }
    
    // Get drill data from latest version
    let drill = latestVersion.drill_data;
    
    // Migrate old normalized coordinates to meters if needed
    // This ensures backward compatibility for drills saved before the coordinate system change
    const jsonAdapter = new JSONFileFormatAdapter();
    drill = jsonAdapter.migrateCoordinates(drill);
    
    // Synchronize drill.id with short_id from database
    drill.id = record.short_id;
    drill.metadata.createdAt = new Date(record.created_at);
    drill.metadata.modifiedAt = new Date(record.updated_at);
    
    // Restore audio track from version's audio_url (prioritize this over drill_data)
    // The audio_url in the version is the source of truth for the audio file location
    if (latestVersion.audio_url) {
      const audioUrl = latestVersion.audio_url;
      console.log('[DrillService] Loading audio track:', {
        audioUrl: audioUrl,
        filename: latestVersion.audio_filename,
      });
      
      // Check if audio_url is already a full URL (starts with http:// or https://)
      // If it is, use it directly. Otherwise, treat it as a storage path and create a signed URL
      const isFullUrl = audioUrl.startsWith('http://') || audioUrl.startsWith('https://');
      
      let signedUrl: string;
      if (isFullUrl) {
        // Already a full URL, use it directly
        signedUrl = audioUrl;
        console.log('[DrillService] Using provided URL directly:', audioUrl);
      } else {
        // Convert storage path to signed URL for playback
        // The storage path is a path like "user_id/drillId/timestamp.mp3"
        console.log('[DrillService] Converting storage path to signed URL:', audioUrl);
        const { data: urlData, error } = await supabase.storage
          .from('drill-audio')
          .createSignedUrl(audioUrl, 3600); // 1 hour expiration
        
        if (error) {
          console.error('[DrillService] Failed to create signed URL for audio:', {
            error,
            storagePath: audioUrl,
          });
          // If signed URL creation fails, clear the audio track
          drill.audioTrack = undefined;
          return drill;
        }
        
        signedUrl = urlData.signedUrl;
        console.log('[DrillService] Successfully created signed URL:', {
          storagePath: audioUrl,
          signedUrl: signedUrl.substring(0, 100) + '...', // Log first 100 chars
        });
      }
      
      // Set audio track with both storagePath (for saving) and url (for playback)
      // storagePath is what gets saved to DB, url is temporary for playback
      drill.audioTrack = {
        url: signedUrl, // URL for playback (signed URL or full URL)
        storagePath: isFullUrl ? undefined : audioUrl, // Storage path saved to DB (only if it was a storage path)
        offset: drill.audioTrack?.offset || 0,
        filename: latestVersion.audio_filename || undefined,
      };
      console.log('[DrillService] Audio track set:', {
        storagePath: isFullUrl ? undefined : audioUrl,
        url: signedUrl.substring(0, 100) + '...',
        offset: drill.audioTrack.offset,
        filename: drill.audioTrack.filename,
      });
    } else {
      // If audio_url is null or undefined, clear the audioTrack
      // This ensures we don't use stale audio URLs from drill_data
      console.log('[DrillService] No audio_url in version, clearing audio track');
      drill.audioTrack = undefined;
    }

    return drill;
  }

  /**
   * Get a drill with its latest version data
   */
  async getDrillWithLatestVersion(drillId: string): Promise<DatabaseResult<{ record: DrillRecord; drill: Drill }>> {
    return this.wrapDatabaseOperation(async () => {
      // Get the drill record
      const recordResult = await this.getDrillById(drillId);
      if (recordResult.error || !recordResult.data) {
        return {
          data: null,
          error: recordResult.error || new Error('Drill not found'),
        };
      }

      // Get the latest version
      const versionsResult = await this.getDrillVersions(drillId);
      if (versionsResult.error || !versionsResult.data || versionsResult.data.length === 0) {
        return {
          data: null,
          error: new Error('No version data found for drill'),
        };
      }

      const latestVersion = versionsResult.data[0]; // Versions are ordered by version_number DESC
      const drill = await DrillService.recordToDrill(recordResult.data, latestVersion);

      if (!drill) {
        return {
          data: null,
          error: new Error('Failed to convert drill record'),
        };
      }

      return {
        data: { record: recordResult.data, drill },
        error: null,
      };
    }, 'get drill with latest version');
  }

  /**
   * Get a drill by short ID with its latest version data
   */
  async getDrillByShortIdWithVersion(shortId: string): Promise<DatabaseResult<{ record: DrillRecord; drill: Drill }>> {
    return this.wrapDatabaseOperation(async () => {
      // Get the drill record by short_id
      const recordResult = await this.getDrillByShortId(shortId);
      if (recordResult.error || !recordResult.data) {
        return {
          data: null,
          error: recordResult.error || new Error('Drill not found'),
        };
      }

      // Get the latest version
      const versionsResult = await this.getDrillVersions(recordResult.data.id);
      if (versionsResult.error || !versionsResult.data || versionsResult.data.length === 0) {
        return {
          data: null,
          error: new Error('No version data found for drill'),
        };
      }

      const latestVersion = versionsResult.data[0]; // Versions are ordered by version_number DESC
      const drill = await DrillService.recordToDrill(recordResult.data, latestVersion);

      if (!drill) {
        return {
          data: null,
          error: new Error('Failed to convert drill record'),
        };
      }

      return {
        data: { record: recordResult.data, drill },
        error: null,
      };
    }, 'get drill by short id with version');
  }
}

// Export singleton instance
export const drillService = new DrillService();

