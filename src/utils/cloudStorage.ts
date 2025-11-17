import { Drill, FileFormatAdapter } from '../types';
import { drillService, DrillService } from '../services/drillService';
import { DatabaseResult } from '../types/database';

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
   */
  async saveDrillToCloud(drill: Drill, drillId?: string): Promise<DatabaseResult<string>> {
    try {
      // Check if user is authenticated
      const { supabase } = await import('../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated. Please sign in to save drills to the cloud.'),
        };
      }

      const input = {
        name: drill.name,
        drill_data: drill,
        audio_url: drill.audioTrack?.url || undefined,
        audio_filename: drill.audioTrack?.filename || undefined,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: DatabaseResult<any>;
      
      if (drillId) {
        // Update existing drill
        result = await drillService.updateDrill(drillId, input);
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

      return {
        data: result.data!.id,
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
   * Load drill from cloud storage
   */
  async loadDrillFromCloud(drillId: string): Promise<DatabaseResult<Drill>> {
    try {
      const result = await drillService.getDrillById(drillId);

      if (result.error) {
        return {
          data: null,
          error: result.error,
        };
      }

      const drill = DrillService.recordToDrill(result.data!);

      return {
        data: drill,
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
        id: record.id,
        name: record.name,
        updatedAt: new Date(record.updated_at),
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
   * Delete drill from cloud storage
   */
  async deleteDrillFromCloud(drillId: string): Promise<DatabaseResult<void>> {
    try {
      return await drillService.deleteDrill(drillId);
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to delete drill from cloud'),
      };
    }
  }
}

