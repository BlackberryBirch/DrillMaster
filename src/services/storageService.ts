import { supabase } from '../lib/supabase';

/**
 * Service for managing file storage (audio files) in Supabase Storage
 */
export class StorageService {
  private readonly BUCKET_NAME = 'drill-audio';

  /**
   * Upload an audio file to Supabase Storage
   * @param file The file to upload
   * @param drillId The drill ID
   * @returns Object with promise and abort function
   */
  uploadAudioFile(
    file: File,
    drillId: string
  ): { promise: Promise<{ url: string | null; storagePath?: string; error: Error | null }>; abort: () => void } {
    // Create abort controller and cancellation state for this upload
    const abortController = new AbortController();
    
    let isCancelled = false;
    let uploadedFilePath: string | null = null;
    
    const abort = () => {
      isCancelled = true;
      abortController.abort();
      
      // Try to clean up uploaded file if upload was in progress
      if (uploadedFilePath) {
        supabase.storage
          .from(this.BUCKET_NAME)
          .remove([uploadedFilePath])
          .catch(() => {
            // Ignore errors when cleaning up cancelled upload
          });
      }
    };

    const uploadPromise = (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return {
            url: null,
            error: new Error('User not authenticated'),
          };
        }

        // Check if cancelled before starting upload
        if (isCancelled) {
          return {
            url: null,
            storagePath: undefined,
            error: new Error('Upload cancelled'),
          };
        }

        // Create a unique filename: {user_id}/{drillId}/{timestamp}-{originalFilename}
        // user_id is the root path folder to comply with Supabase storage policies
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${drillId}/${timestamp}.${fileExt}`;

        // Note: Supabase storage doesn't support AbortController directly,
        // but we can check cancellation state and clean up if cancelled
        const { data, error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        // Store the uploaded file path for potential cleanup
        if (data?.path) {
          uploadedFilePath = data.path;
        }

        // Check if cancelled after upload completes
        if (isCancelled) {
          // Try to delete the uploaded file if it was uploaded before cancellation
          if (uploadedFilePath) {
            await supabase.storage
              .from(this.BUCKET_NAME)
              .remove([uploadedFilePath])
              .catch(() => {
                // Ignore errors when cleaning up cancelled upload
              });
          }
          return {
            url: null,
            storagePath: undefined,
            error: new Error('Upload cancelled'),
          };
        }

        if (error) {
          return {
            url: null,
            storagePath: undefined,
            error: new Error(`Failed to upload file: ${error.message}`),
          };
        }

        // Get signed URL for immediate use (since bucket is private)
        const { data: urlData, error: urlError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .createSignedUrl(data.path, 3600); // 1 hour expiration

        if (urlError) {
          return {
            url: null,
            storagePath: data.path, // Still return path even if signed URL fails
            error: new Error(`Failed to create signed URL: ${urlError.message}`),
          };
        }

        return {
          url: urlData.signedUrl,
          storagePath: data.path, // Return the storage path for saving to DB
          error: null,
        };
      } catch (error) {
        if (isCancelled || abortController.signal.aborted) {
          return {
            url: null,
            storagePath: undefined,
            error: new Error('Upload cancelled'),
          };
        }
        
        return {
          url: null,
          storagePath: undefined,
          error: error instanceof Error ? error : new Error('Unknown error occurred'),
        };
      }
    })();

    return {
      promise: uploadPromise,
      abort,
    };
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
      // Path structure: {bucket_name}/{user_id}/{drillId}/{filename}
      // After splitting by bucket name, we need to keep the full path including user_id
      let path: string;
      if (filePath.includes('/storage/v1/object/public/')) {
        // Full URL format: .../storage/v1/object/public/{bucket_name}/{user_id}/{drillId}/{filename}
        const parts = filePath.split('/storage/v1/object/public/')[1]?.split('/') || [];
        // Skip bucket name (first part), keep the rest (user_id/drillId/filename)
        path = parts.slice(1).join('/');
      } else {
        path = filePath;
      }

      // Verify the path starts with user_id for security
      if (!path.startsWith(`${user.id}/`)) {
        return {
          success: false,
          error: new Error('File path does not belong to current user'),
        };
      }

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

