import { supabase } from '../lib/supabase';
import { Drill } from '../types/drill';
import { DrillRecord, CreateDrillInput, UpdateDrillInput, DatabaseResult, DrillVersionRecord } from '../types/database';

/**
 * Service for managing drills in Supabase
 */
export class DrillService {
  /**
   * Get all drills for the current user
   */
  async getUserDrills(): Promise<DatabaseResult<DrillRecord[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated'),
        };
      }

      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to fetch drills: ${error.message}`),
        };
      }

      return {
        data: data as DrillRecord[],
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Get a single drill by database UUID
   */
  async getDrillById(drillId: string): Promise<DatabaseResult<DrillRecord>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated'),
        };
      }

      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .eq('id', drillId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to fetch drill: ${error.message}`),
        };
      }

      return {
        data: data as DrillRecord,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Get a drill by its short ID (stored in short_id column)
   * This is used for URL-based drill access
   */
  async getDrillByShortId(shortId: string): Promise<DatabaseResult<DrillRecord>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated'),
        };
      }

      if (shortId.length > 8) {
        return {
          data: null,
          error: new Error('Short ID is too long'),
        };
      }

      // Query short_id column directly
      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .eq('user_id', user.id)
        .eq('short_id', shortId)
        .single();

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to fetch drill: ${error.message}`),
        };
      }

      return {
        data: data as DrillRecord,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Create a new drill
   */
  async createDrill(input: CreateDrillInput): Promise<DatabaseResult<DrillRecord>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated'),
        };
      }

      const { data, error } = await supabase
        .from('drills')
        .insert({
          user_id: user.id,
          name: input.name,
          short_id: input.short_id,
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to create drill: ${error.message}`),
        };
      }

      return {
        data: data as DrillRecord,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Update an existing drill
   */
  async updateDrill(drillId: string, input: UpdateDrillInput): Promise<DatabaseResult<DrillRecord>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated'),
        };
      }

      // First verify the drill belongs to the user
      const { data: existingDrill, error: fetchError } = await supabase
        .from('drills')
        .select('id')
        .eq('id', drillId)
        .eq('user_id', user.id)
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
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to update drill: ${error.message}`),
        };
      }

      return {
        data: data as DrillRecord,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Delete a drill
   */
  async deleteDrill(drillId: string): Promise<DatabaseResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated'),
        };
      }

      const { error } = await supabase
        .from('drills')
        .delete()
        .eq('id', drillId)
        .eq('user_id', user.id);

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to delete drill: ${error.message}`),
        };
      }

      return {
        data: undefined,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Create or update a version of a drill
   * Creates a new version if the latest version is more than 15 minutes old,
   * otherwise updates the current version
   */
  async createDrillVersion(
    drillId: string,
    drill: Drill,
    audioUrl?: string | null,
    audioFilename?: string | null
  ): Promise<DatabaseResult<DrillVersionRecord>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated'),
        };
      }

      // Get the latest version with created_at timestamp
      const { data: latestVersion } = await supabase
        .from('drill_versions')
        .select('id, version_number, created_at')
        .eq('drill_id', drillId)
        .eq('user_id', user.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
      const now = new Date();
      const shouldUpdateExisting = latestVersion && latestVersion.created_at
        ? (now.getTime() - new Date(latestVersion.created_at).getTime()) < FIFTEEN_MINUTES_MS
        : false;

      if (shouldUpdateExisting && latestVersion) {
        // Serialize drill data properly for JSONB (convert Date objects to strings)
        const serializedDrill = JSON.parse(JSON.stringify(drill));
        
        // Update the existing version
        const { data, error } = await supabase
          .from('drill_versions')
          .update({
            drill_data: serializedDrill,
            name: drill.name,
            audio_url: audioUrl || null,
            audio_filename: audioFilename || null,
            updated_at: now.toISOString(), // Update the updated_at timestamp
          })
          .eq('id', latestVersion.id)
          .select()
          .maybeSingle();

        if (error) {
          return {
            data: null,
            error: new Error(`Failed to update drill version: ${error.message}`),
          };
        }

        if (!data) {
          // Row was not found or not updated, create a new version instead
          // Re-query to get the actual latest version number (handles race conditions)
          const { data: actualLatestVersion } = await supabase
            .from('drill_versions')
            .select('version_number')
            .eq('drill_id', drillId)
            .eq('user_id', user.id)
            .order('version_number', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          const nextVersion = actualLatestVersion ? actualLatestVersion.version_number + 1 : 1;
          // Serialize drill data properly for JSONB (convert Date objects to strings)
          const serializedDrill = JSON.parse(JSON.stringify(drill));
          
          const { data: newData, error: insertError } = await supabase
            .from('drill_versions')
            .insert({
              drill_id: drillId,
              user_id: user.id,
              version_number: nextVersion,
              drill_data: serializedDrill,
              name: drill.name,
              audio_url: audioUrl || null,
              audio_filename: audioFilename || null,
              updated_at: now.toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            // If duplicate key error, retry with next version number
            if (insertError.code === '23505' && insertError.message.includes('drill_versions_drill_id_version_number_key')) {
              // Query again and try with the next version
              const { data: retryLatestVersion } = await supabase
                .from('drill_versions')
                .select('version_number')
                .eq('drill_id', drillId)
                .eq('user_id', user.id)
                .order('version_number', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              const retryNextVersion = retryLatestVersion ? retryLatestVersion.version_number + 1 : 1;
              
              const { data: retryData, error: retryError } = await supabase
                .from('drill_versions')
                .insert({
                  drill_id: drillId,
                  user_id: user.id,
                  version_number: retryNextVersion,
                  drill_data: serializedDrill,
                  name: drill.name,
                  audio_url: audioUrl || null,
                  audio_filename: audioFilename || null,
                  updated_at: now.toISOString(),
                })
                .select()
                .single();

              if (retryError) {
                return {
                  data: null,
                  error: new Error(`Failed to create drill version: ${retryError.message}`),
                };
              }

              return {
                data: retryData as DrillVersionRecord,
                error: null,
              };
            }
            
            return {
              data: null,
              error: new Error(`Failed to create drill version: ${insertError.message}`),
            };
          }

          return {
            data: newData as DrillVersionRecord,
            error: null,
          };
        }

        return {
          data: data as DrillVersionRecord,
          error: null,
        };
      } else {
        // Create a new version
        // Re-query to get the actual latest version number (handles race conditions)
        const { data: actualLatestVersion } = await supabase
          .from('drill_versions')
          .select('version_number')
          .eq('drill_id', drillId)
          .eq('user_id', user.id)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        const nextVersion = actualLatestVersion ? actualLatestVersion.version_number + 1 : 1;
        // Serialize drill data properly for JSONB (convert Date objects to strings)
        const serializedDrill = JSON.parse(JSON.stringify(drill));

        const { data, error } = await supabase
          .from('drill_versions')
          .insert({
            drill_id: drillId,
            user_id: user.id,
            version_number: nextVersion,
            drill_data: serializedDrill,
            name: drill.name,
            audio_url: audioUrl || null,
            audio_filename: audioFilename || null,
            updated_at: now.toISOString(), // Set updated_at for new versions
          })
          .select()
          .single();

        if (error) {
          // If duplicate key error, retry with next version number
          if (error.code === '23505' && error.message.includes('drill_versions_drill_id_version_number_key')) {
            // Query again and try with the next version
            const { data: retryLatestVersion } = await supabase
              .from('drill_versions')
              .select('version_number')
              .eq('drill_id', drillId)
              .eq('user_id', user.id)
              .order('version_number', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            const retryNextVersion = retryLatestVersion ? retryLatestVersion.version_number + 1 : 1;
            
            const { data: retryData, error: retryError } = await supabase
              .from('drill_versions')
              .insert({
                drill_id: drillId,
                user_id: user.id,
                version_number: retryNextVersion,
                drill_data: serializedDrill,
                name: drill.name,
                audio_url: audioUrl || null,
                audio_filename: audioFilename || null,
                updated_at: now.toISOString(),
              })
              .select()
              .single();

            if (retryError) {
              return {
                data: null,
                error: new Error(`Failed to create drill version: ${retryError.message}`),
              };
            }

            return {
              data: retryData as DrillVersionRecord,
              error: null,
            };
          }
          
          return {
            data: null,
            error: new Error(`Failed to create drill version: ${error.message}`),
          };
        }

        return {
          data: data as DrillVersionRecord,
          error: null,
        };
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Get all versions for a drill
   */
  async getDrillVersions(drillId: string): Promise<DatabaseResult<DrillVersionRecord[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated'),
        };
      }

      const { data, error } = await supabase
        .from('drill_versions')
        .select('*')
        .eq('drill_id', drillId)
        .eq('user_id', user.id)
        .order('version_number', { ascending: false });

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to fetch drill versions: ${error.message}`),
        };
      }

      return {
        data: data as DrillVersionRecord[],
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Get a specific version by version number
   */
  async getDrillVersion(drillId: string, versionNumber: number): Promise<DatabaseResult<DrillVersionRecord>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated'),
        };
      }

      const { data, error } = await supabase
        .from('drill_versions')
        .select('*')
        .eq('drill_id', drillId)
        .eq('version_number', versionNumber)
        .eq('user_id', user.id)
        .single();

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to fetch drill version: ${error.message}`),
        };
      }

      return {
        data: data as DrillVersionRecord,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Delete a drill version
   */
  async deleteDrillVersion(versionId: string): Promise<DatabaseResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated'),
        };
      }

      const { error } = await supabase
        .from('drill_versions')
        .delete()
        .eq('id', versionId)
        .eq('user_id', user.id);

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to delete drill version: ${error.message}`),
        };
      }

      return {
        data: null,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Convert a DrillRecord to a Drill (for use in the app)
   * Note: This method now requires loading the latest version to get drill_data
   * Use getDrillWithLatestVersion() instead for loading drills
   */
  static recordToDrill(record: DrillRecord, latestVersion: DrillVersionRecord | null): Drill | null {
    if (!latestVersion) {
      return null;
    }
    
    // Get drill data from latest version
    const drill = latestVersion.drill_data;
    // Synchronize drill.id with short_id from database
    drill.id = record.short_id;
    drill.metadata.createdAt = new Date(record.created_at);
    drill.metadata.modifiedAt = new Date(record.updated_at);
    
    // Restore audio track from version if it exists
    if (latestVersion.audio_url) {
      drill.audioTrack = {
        url: latestVersion.audio_url,
        offset: drill.audioTrack?.offset || 0,
        filename: latestVersion.audio_filename || undefined,
      };
    }

    return drill;
  }

  /**
   * Get a drill with its latest version data
   */
  async getDrillWithLatestVersion(drillId: string): Promise<DatabaseResult<{ record: DrillRecord; drill: Drill }>> {
    try {
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
      const drill = DrillService.recordToDrill(recordResult.data, latestVersion);

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
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Get a drill by short ID with its latest version data
   */
  async getDrillByShortIdWithVersion(shortId: string): Promise<DatabaseResult<{ record: DrillRecord; drill: Drill }>> {
    try {
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
      const drill = DrillService.recordToDrill(recordResult.data, latestVersion);

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
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }
}

// Export singleton instance
export const drillService = new DrillService();

