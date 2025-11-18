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
    return '.drill.json';
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
      
      if (!drillId) {
        // Only search if no drillId provided
        const existingResult = await drillService.getDrillByShortId(drill.id);
        if (existingResult.data) {
          existingDrillId = existingResult.data.id;
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
        const versionResult = await drillService.createDrillVersion(
          dbDrillId,
          drill,
          drill.audioTrack?.url || null,
          drill.audioTrack?.filename || null
        );
        if (versionResult.error) {
          console.warn('Failed to create version:', versionResult.error);
          // Don't fail the save if version creation fails
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

