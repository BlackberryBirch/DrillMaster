import { supabase } from '../lib/supabase';

/**
 * Service for managing file storage (audio files) in Supabase Storage
 */
export class StorageService {
  private readonly BUCKET_NAME = 'drill-audio';

  /**
   * Upload an audio file to Supabase Storage
   */
  async uploadAudioFile(file: File, drillId: string): Promise<{ url: string | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          url: null,
          error: new Error('User not authenticated'),
        };
      }

      // Create a unique filename: {drillId}/{timestamp}-{originalFilename}
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${drillId}/${timestamp}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        return {
          url: null,
          error: new Error(`Failed to upload file: ${error.message}`),
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        error: null,
      };
    } catch (error) {
      return {
        url: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Delete an audio file from Supabase Storage
   */
  async deleteAudioFile(filePath: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: new Error('User not authenticated'),
        };
      }

      // Extract path from URL if full URL is provided
      const path = filePath.includes('/storage/v1/object/public/') 
        ? filePath.split('/storage/v1/object/public/')[1]?.split('/').slice(1).join('/')
        : filePath;

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (error) {
        return {
          success: false,
          error: new Error(`Failed to delete file: ${error.message}`),
        };
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Check if storage bucket exists, create if not
   * This should be called during app initialization
   */
  async ensureBucketExists(): Promise<void> {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.warn('Could not check storage buckets:', error.message);
        return;
      }

      const bucketExists = data?.some(bucket => bucket.name === this.BUCKET_NAME);
      
      if (!bucketExists) {
        console.warn(
          `Storage bucket "${this.BUCKET_NAME}" does not exist. ` +
          `Please create it in your Supabase dashboard under Storage.`
        );
      }
    } catch (error) {
      console.warn('Error checking storage bucket:', error);
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();

