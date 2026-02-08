import { Drill, FileFormatAdapter } from '../types';
import { drillService } from '../services/drillService';
import { DatabaseResult } from '../types/database';
import { supabase } from '../lib/supabase';

/**
 * Cloud Storage Adapter that implements FileFormatAdapter
 * This adapter saves/loads drills from Supabase instead of local files
 */
export class CloudStorageAdapter implements FileFormatAdapter {
  private jsonAdapter: FileFormatAdapter;

  constructor(jsonAdapter: FileFormatAdapter) {
    this.jsonAdapter = jsonAdapter;
  }

  serialize(drill: Drill): string {
    // Use the JSON adapter for serialization
    return this.jsonAdapter.serialize(drill);
  }

  deserialize(data: string): Drill {
    // Use the JSON adapter for deserialization
    return this.jsonAdapter.deserialize(data);
  }

  validate(data: unknown): boolean {
    // Use the JSON adapter for validation
    return this.jsonAdapter.validate(data);
  }

  getFileExtension(): string {
    return '.drill';
  }

  /**
   * Extract storage path from a Supabase URL (public or signed)
   * Returns the original string if it's not a Supabase URL (assumes it's already a path)
   */
  private extractStoragePathFromUrl(url: string): string {
    // If it's a Supabase public URL, extract the storage path
    if (url.includes('/storage/v1/object/public/drill-audio/')) {
      const parts = url.split('/storage/v1/object/public/drill-audio/');
      if (parts.length > 1) {
        // Return just the path part (user_id/drillId/filename)
        // Remove any query parameters
        return parts[1].split('?')[0];
      }
    }
    // If it's a Supabase signed URL, extract the storage path
    if (url.includes('/storage/v1/object/sign/drill-audio/')) {
      const parts = url.split('/storage/v1/object/sign/drill-audio/');
      if (parts.length > 1) {
        // Return just the path part (user_id/drillId/filename)
        // Remove any query parameters
        return parts[1].split('?')[0];
      }
    }
    // If it's not a Supabase URL, assume it's already a storage path
    return url;
  }

  /**
   * Save drill to cloud storage
   * Uses the drill.id (short ID) to find existing drill in database
   */
  async saveDrillToCloud(drill: Drill, drillId?: string): Promise<DatabaseResult<string>> {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated. Please sign in to save drills to the cloud.'),
        };
      }

      const input = {
        name: drill.name,
        short_id: drill.id,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: DatabaseResult<any>;
      
      // Use drill.id (short ID) to find existing drill
      let existingDrillId: string | undefined;
      let originalAudioUrl: string | null = null;
      
      if (!drillId) {
        // Only search if no drillId provided
        const existingResult = await drillService.getDrillByShortId(drill.id);
        if (existingResult.data) {
          existingDrillId = existingResult.data.id;
          
          // Get the original audio_url from the latest version to preserve it
          const versionResult = await drillService.getDrillVersions(existingResult.data.id);
          if (versionResult.data && versionResult.data.length > 0) {
            originalAudioUrl = versionResult.data[0].audio_url;
          }
        }
      } else {
        // Get the original audio_url from the latest version to preserve it
        const versionResult = await drillService.getDrillVersions(drillId);
        if (versionResult.data && versionResult.data.length > 0) {
          originalAudioUrl = versionResult.data[0].audio_url;
        }
      }
      
      // Use provided drillId (database UUID) or found existing ID
      const targetId = drillId || existingDrillId;
      
      if (targetId) {
        // Update existing drill using database UUID
        result = await drillService.updateDrill(targetId, input);
      } else {
        // Create new drill
        result = await drillService.createDrill(input);
      }

      if (result.error) {
        return {
          data: null,
          error: result.error,
        };
      }

      // Now create a version with the drill data
      // Get the database UUID (either from result or targetId)
      const dbDrillId = result.data?.id || targetId;
      if (dbDrillId) {
        // Always save the storagePath, never the signed URL
        // If storagePath exists, use it; otherwise try to extract from URL or use original
        let audioPathToSave: string | null = null;
        
        if (drill.audioTrack) {
          // Priority 1: Use storagePath if it exists (this is the source of truth)
          if (drill.audioTrack.storagePath) {
            audioPathToSave = drill.audioTrack.storagePath;
            console.log('[CloudStorage] Saving audio storage path from audioTrack.storagePath:', audioPathToSave);
          } 
          // Priority 2: If we have an original audio_url, use it (it's always a path)
          else if (originalAudioUrl && !originalAudioUrl.startsWith('http://') && !originalAudioUrl.startsWith('https://')) {
            audioPathToSave = originalAudioUrl;
            console.log('[CloudStorage] Saving audio storage path from original audio_url:', audioPathToSave);
          }
          // Priority 3: Try to extract path from URL (for new uploads that might have full URLs)
          else if (drill.audioTrack.url) {
            audioPathToSave = this.extractStoragePathFromUrl(drill.audioTrack.url);
            console.log('[CloudStorage] Extracted storage path from URL:', audioPathToSave);
          }
        }
        
        console.log('[CloudStorage] Saving drill version with audio path:', {
          hasAudioTrack: !!drill.audioTrack,
          storagePath: audioPathToSave,
          filename: drill.audioTrack?.filename,
        });
        
        const versionResult = await drillService.createDrillVersion(
          dbDrillId,
          drill,
          audioPathToSave,
          drill.audioTrack?.filename || null
        );
        if (versionResult.error) {
          console.warn('[CloudStorage] Failed to create version:', versionResult.error);
          // Don't fail the save if version creation fails
        } else {
          console.log('[CloudStorage] Successfully saved drill version with audio path');
        }
      }

      // Return the drill.id (short ID) for URL usage, not the database UUID
      return {
        data: drill.id,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to save drill to cloud'),
      };
    }
  }

  /**
   * Load drill from cloud storage by short ID (used in URLs)
   * Loads the latest version of the drill
   */
  async loadDrillFromCloud(drillId: string): Promise<DatabaseResult<Drill>> {
    try {
      const result = drillId.length > 8 
        ? await drillService.getDrillWithLatestVersion(drillId)
        : await drillService.getDrillByShortIdWithVersion(drillId);
      
      if (result.error) {
        return {
          data: null,
          error: result.error,
        };
      }

      if (!result.data) {
        return {
          data: null,
          error: new Error('Drill data not found'),
        };
      }

      return {
        data: result.data.drill,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to load drill from cloud'),
      };
    }
  }

  /**
   * List all user's drills
   */
  async listUserDrills(): Promise<DatabaseResult<Array<{ id: string; name: string; updatedAt: Date }>>> {
    try {
      const result = await drillService.getUserDrills();

      if (result.error) {
        return {
          data: null,
          error: result.error,
        };
      }

      const drills = result.data!.map(record => ({
        id: record.short_id, // Use short_id column for URLs
        name: record.name,
        updatedAt: new Date(record.updated_at),
        databaseId: record.id, // Keep database UUID for deletion
      }));

      return {
        data: drills,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to list drills'),
      };
    }
  }

  /**
   * Delete drill from cloud storage by short ID (used in URLs)
   */
  async deleteDrillFromCloud(drillId: string): Promise<DatabaseResult<void>> {
    try {
      // Try to find drill by short ID first
      const result = await drillService.getDrillByShortId(drillId);
      
      if (result.error || !result.data) {
        // If not found by short ID, try database UUID (for backward compatibility)
        return await drillService.deleteDrill(drillId);
      }
      
      // Delete using the database UUID
      return await drillService.deleteDrill(result.data.id);
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to delete drill from cloud'),
      };
    }
  }
}

