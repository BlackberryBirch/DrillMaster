import { supabase } from '../lib/supabase';
import { Drill } from '../types/drill';
import { DrillRecord, CreateDrillInput, UpdateDrillInput, DatabaseResult } from '../types/database';

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
   * Get a single drill by ID
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
          drill_data: input.drill_data,
          audio_url: input.audio_url || null,
          audio_filename: input.audio_filename || null,
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
      if (input.drill_data !== undefined) updateData.drill_data = input.drill_data as any;
      if (input.audio_url !== undefined) updateData.audio_url = input.audio_url || null;
      if (input.audio_filename !== undefined) updateData.audio_filename = input.audio_filename || null;

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
   * Convert a DrillRecord to a Drill (for use in the app)
   */
  static recordToDrill(record: DrillRecord): Drill {
    // Update metadata timestamps from database
    const drill = record.drill_data;
    drill.metadata.createdAt = new Date(record.created_at);
    drill.metadata.modifiedAt = new Date(record.updated_at);
    
    // Update audio track URL if it exists
    if (record.audio_url) {
      drill.audioTrack = {
        url: record.audio_url,
        offset: drill.audioTrack?.offset || 0,
        filename: record.audio_filename || undefined,
      };
    }

    return drill;
  }
}

// Export singleton instance
export const drillService = new DrillService();

