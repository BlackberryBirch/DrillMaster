import { useState, useRef, useEffect } from 'react';
import { useAnimationStore } from '../../stores/animationStore';
import { useDrillStore } from '../../stores/drillStore';
import { useAuthStore } from '../../stores/authStore';
import { storageService } from '../../services/storageService';
import { CloudStorageAdapter } from '../../utils/cloudStorage';
import { JSONFileFormatAdapter } from '../../utils/fileIO';
import UploadProgressModal from './UploadProgressModal';

const cloudAdapter = new CloudStorageAdapter(new JSONFileFormatAdapter());

export default function AudioControl() {
  const [showAudioPopup, setShowAudioPopup] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadAbort, setUploadAbort] = useState<(() => void) | null>(null);
  const audioPopupRef = useRef<HTMLDivElement>(null);
  const audioButtonRef = useRef<HTMLButtonElement>(null);

  const audioEnabled = useAnimationStore((state) => state.audioEnabled);
  const toggleAudio = useAnimationStore((state) => state.toggleAudio);
  const audioVolume = useAnimationStore((state) => state.audioVolume);
  const setAudioVolume = useAnimationStore((state) => state.setAudioVolume);

  const drill = useDrillStore((state) => state.drill);
  const setAudioTrack = useDrillStore((state) => state.setAudioTrack);
  const removeAudioTrack = useDrillStore((state) => state.removeAudioTrack);
  const user = useAuthStore((state) => state.user);

  const handleLoadAudio = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !drill) return;

      // Show upload modal
      setIsUploading(true);
      setUploadFileName(file.name);

      try {
        // Upload file to Supabase Storage
        const { promise, abort } = storageService.uploadAudioFile(file, drill.id);
        setUploadAbort(() => abort);

        const uploadResult = await promise;
        
        // Close modal
        setIsUploading(false);
        setUploadFileName('');
        setUploadAbort(null);

        if (uploadResult.error || !uploadResult.url) {
          // Only show error if not cancelled
          if (uploadResult.error?.message !== 'Upload cancelled') {
            alert(`Failed to upload audio file: ${uploadResult.error?.message || 'Unknown error'}`);
          }
          return;
        }

        // Set the audio track with the storage URL
        setAudioTrack(uploadResult.url, 0, file.name);

        // Save the drill to cloud storage to update the version with the new audio URL
        // Get the updated drill from the store after setAudioTrack (Zustand updates are synchronous)
        if (user) {
          try {
            const updatedDrill = useDrillStore.getState().drill;
            if (updatedDrill) {
              const saveResult = await cloudAdapter.saveDrillToCloud(updatedDrill);
              if (saveResult.error) {
                console.warn('Failed to save drill after audio upload:', saveResult.error);
                // Don't show error to user as the audio was successfully uploaded
              }
            }
          } catch (error) {
            console.warn('Error saving drill after audio upload:', error);
            // Don't show error to user as the audio was successfully uploaded
          }
        }
      } catch (error) {
        setIsUploading(false);
        setUploadFileName('');
        setUploadAbort(null);
        alert(`Failed to load audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  };

  const handleCancelUpload = () => {
    if (uploadAbort) {
      uploadAbort();
      setUploadAbort(null);
    }
    setIsUploading(false);
    setUploadFileName('');
  };

  // Close popup when clicking outside or on the button again
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (showAudioPopup) {
        const isAudioButton = audioButtonRef.current?.contains(target);
        const isAudioPopup = audioPopupRef.current?.contains(target);
        if (!isAudioButton && !isAudioPopup) {
          setShowAudioPopup(false);
        }
      }
    };

    if (showAudioPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAudioPopup]);

  const isMuted = !audioEnabled || audioVolume === 0;

  return (
    <div className="relative">
      <button
        ref={audioButtonRef}
        onClick={() => setShowAudioPopup(!showAudioPopup)}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        title="Audio Settings"
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      
      {showAudioPopup && (
        <div
          ref={audioPopupRef}
          className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 min-w-[200px]"
        >
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={audioEnabled}
                onChange={toggleAudio}
              />
              <span>Audio Enabled</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400 w-12">Volume:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={audioVolume}
                onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                className="flex-1"
                disabled={!audioEnabled}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">
                {Math.round(audioVolume * 100)}%
              </span>
            </div>
            {!drill?.audioTrack && (
              <button
                onClick={handleLoadAudio}
                disabled={!drill}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed text-sm"
                title="Load audio file"
              >
                🎵 Load Audio
              </button>
            )}
            {drill?.audioTrack && (
              <button
                onClick={() => removeAudioTrack().catch(console.error)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                title="Remove audio track"
              >
                🗑️ Remove Audio
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress Modal */}
      <UploadProgressModal
        isOpen={isUploading}
        fileName={uploadFileName}
        onCancel={handleCancelUpload}
      />
    </div>
  );
}

