import { useEffect, useRef } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useDrillStore } from '../stores/drillStore';

// Module-level singleton for audio element - persists across component unmounts
let globalAudioElement: HTMLAudioElement | null = null;
let globalAudioUrl: string | null = null;
let globalAudioOffset: number = 0;
let activeInstances = 0; // Track how many components are using the hook

/**
 * Get or create the global audio element
 */
function getGlobalAudioElement(): HTMLAudioElement {
  if (!globalAudioElement) {
    globalAudioElement = new Audio();
    globalAudioElement.preload = 'auto';
    
    // Handle audio errors - log all errors with context
    globalAudioElement.addEventListener('error', (e) => {
      const audioEl = e.target as HTMLAudioElement;
      if (audioEl.src && audioEl.error) {
        const errorCode = audioEl.error.code;
        const errorMessages: Record<number, string> = {
          1: 'MEDIA_ERR_ABORTED - The user aborted the loading',
          2: 'MEDIA_ERR_NETWORK - A network error occurred',
          3: 'MEDIA_ERR_DECODE - The audio was decoded with an error',
          4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - The audio source is not supported',
        };
        
        console.error('[useAudio] Audio playback error:', {
          code: errorCode,
          message: errorMessages[errorCode] || 'Unknown error',
          src: audioEl.src.substring(0, 150),
          networkState: audioEl.networkState,
          readyState: audioEl.readyState,
        });
      } else if (audioEl.src && !audioEl.error) {
        console.warn('[useAudio] Audio error event fired but no error object available:', {
          src: audioEl.src.substring(0, 150),
          networkState: audioEl.networkState,
          readyState: audioEl.readyState,
        });
      }
    });

    // Handle audio end
    globalAudioElement.addEventListener('ended', () => {
      // Audio ended, but animation might still be playing
      // Let animation handle stopping
    });
  }
  return globalAudioElement;
}

/**
 * Hook that manages audio playback synchronized with animation
 */
export function useAudio() {
  const animationState = useAnimationStore((state) => state.state);
  const currentTime = useAnimationStore((state) => state.currentTime);
  const playbackSpeed = useAnimationStore((state) => state.playbackSpeed);
  const audioEnabled = useAnimationStore((state) => state.audioEnabled);
  const audioVolume = useAnimationStore((state) => state.audioVolume);
  const drill = useDrillStore((state) => state.drill);

  const isSeekingRef = useRef<boolean>(false);

  // Track active instances - increment on mount, decrement on unmount
  useEffect(() => {
    activeInstances++;
    return () => {
      activeInstances--;
      // Only clean up global audio if no instances are using it
      // This prevents cleanup when component temporarily unmounts
      if (activeInstances === 0 && globalAudioElement) {
        console.log('[useAudio] No active instances, pausing audio (but keeping element)');
        globalAudioElement.pause();
        // Don't destroy the element - keep it for next mount
      }
    };
  }, []);

  // Update audio source when drill changes - create Audio element only when there's a valid URL
  useEffect(() => {
    const audio = getGlobalAudioElement(); // Get singleton audio element
    
    if (!drill?.audioTrack) {
      // Clean up if audio exists but no drill/audio track
      if (globalAudioUrl) {
        console.log('[useAudio] Clearing audio source - no drill or audio track');
        audio.pause();
        audio.src = '';
      }
      globalAudioUrl = null;
      globalAudioOffset = 0;
      return;
    }

    const audioTrack = drill.audioTrack;
    
    // Validate URL before creating audio element
    if (!audioTrack.url || audioTrack.url.trim() === '') {
      console.log('[useAudio] Invalid audio URL (empty or whitespace), not creating audio element');
      if (globalAudioUrl) {
        audio.pause();
        audio.src = '';
      }
      globalAudioUrl = null;
      globalAudioOffset = 0;
      return;
    }
    
    // Check if URL looks valid
    const isValidUrl = audioTrack.url.startsWith('http://') || 
                      audioTrack.url.startsWith('https://') || 
                      audioTrack.url.startsWith('data:');
    
    if (!isValidUrl) {
      console.warn('[useAudio] Audio URL does not appear to be a valid URL, not creating audio element:', {
        url: audioTrack.url.substring(0, 150),
        urlLength: audioTrack.url.length,
      });
      if (globalAudioUrl) {
        audio.pause();
        audio.src = '';
      }
      globalAudioUrl = null;
      globalAudioOffset = 0;
      return;
    }

    // Only update if URL changed
    if (globalAudioUrl !== audioTrack.url) {
      console.log('[useAudio] Setting audio URL:', {
        previousUrl: globalAudioUrl ? globalAudioUrl.substring(0, 100) + '...' : null,
        newUrl: audioTrack.url.substring(0, 100) + '...',
        offset: audioTrack.offset || 0,
        filename: audioTrack.filename,
      });
      
      globalAudioUrl = audioTrack.url;
      globalAudioOffset = audioTrack.offset || 0;
      // Pause and reset the audio element before setting new src to avoid conflicts
      audio.pause();
      audio.currentTime = 0;
      
      console.log('[useAudio] Setting audio element src and loading...');
      const urlBeforeSet = audio.src;
      
      // Clear any existing src first to ensure clean state
      if (audio.src) {
        audio.src = '';
      }
      
      // Set the new URL
      audio.src = audioTrack.url;
      const urlAfterSet = audio.src;
      
      // Log the URL that was set (browser may normalize it)
      console.log('[useAudio] Audio src set:', {
        requested: audioTrack.url.substring(0, 150) + '...',
        actual: urlAfterSet ? urlAfterSet.substring(0, 150) + '...' : 'undefined',
        changed: urlBeforeSet !== urlAfterSet,
      });
      
      // Verify src was set correctly immediately
      const isValidSrc = urlAfterSet && (
        urlAfterSet.startsWith('http://') || 
        urlAfterSet.startsWith('https://') || 
        urlAfterSet.startsWith('data:')
      );
      if (!isValidSrc) {
        console.error('[useAudio] Audio src was not set correctly immediately after assignment:', {
          expected: audioTrack.url.substring(0, 150) + '...',
          actual: urlAfterSet || 'undefined',
        });
        // Try setting it again after a brief delay
        setTimeout(() => {
          if (audio.src !== audioTrack.url && audio.src) {
            console.log('[useAudio] Retrying to set audio src');
            audio.src = audioTrack.url;
            audio.load();
          }
        }, 50);
      }
      
      // Add event listeners before calling load() to ensure they're registered
      // Capture the URL in the closure to avoid stale refs
      const capturedUrl = audioTrack.url;
      
      // Log when audio is loaded
      audio.addEventListener('loadedmetadata', () => {
        console.log('[useAudio] Audio metadata loaded:', {
          duration: audio.duration,
          readyState: audio.readyState,
          networkState: audio.networkState,
          src: audio.src ? audio.src.substring(0, 150) + '...' : 'undefined',
          expectedUrl: capturedUrl.substring(0, 150) + '...',
        });
      }, { once: true });
      
      // Log when audio can play
      audio.addEventListener('canplay', () => {
        console.log('[useAudio] Audio can play:', {
          duration: audio.duration,
          readyState: audio.readyState,
          networkState: audio.networkState,
          src: audio.src ? audio.src.substring(0, 150) + '...' : 'undefined',
          expectedUrl: capturedUrl.substring(0, 150) + '...',
        });
      }, { once: true });
      
      // Log loadstart
      audio.addEventListener('loadstart', () => {
        console.log('[useAudio] Audio load started:', {
          src: audio.src ? audio.src.substring(0, 150) + '...' : 'undefined',
          expectedUrl: capturedUrl.substring(0, 150) + '...',
        });
      }, { once: true });
      
      // Verify the src was set correctly
      if (!audio.src || !audio.src.startsWith('http') && !audio.src.startsWith('data:')) {
        console.error('[useAudio] Audio src was not set correctly after assignment:', {
          expected: audioTrack.url.substring(0, 150) + '...',
          actual: audio.src || 'undefined',
        });
        // Try setting it again
        audio.src = audioTrack.url;
      }
      
      // Call load() after setting up listeners
      audio.load();
      
      // Verify src again after load() call
      setTimeout(() => {
        if (audio.src !== audioTrack.url && audio.src) {
          console.warn('[useAudio] Audio src changed after load() call:', {
            expected: audioTrack.url.substring(0, 150) + '...',
            actual: audio.src.substring(0, 150) + '...',
          });
          // Restore the correct URL if it was changed
          if (!audio.src.includes(audioTrack.url.split('?')[0])) {
            console.log('[useAudio] Restoring correct audio URL');
            audio.src = audioTrack.url;
            audio.load();
          }
        }
      }, 100);
    } else {
      console.log('[useAudio] Audio URL unchanged, skipping update');
      // Even if URL is unchanged, verify the audio element still has the correct src
      if (audio.src && globalAudioUrl) {
        const currentSrc = audio.src;
        // Check if the src matches (accounting for URL normalization)
        if (!currentSrc.includes(globalAudioUrl.split('?')[0]) && !currentSrc.includes(new URL(globalAudioUrl).pathname)) {
          console.warn('[useAudio] Audio src does not match expected URL, restoring:', {
            expected: globalAudioUrl.substring(0, 150) + '...',
            actual: currentSrc.substring(0, 150) + '...',
          });
          audio.src = globalAudioUrl;
          audio.load();
        }
      }
    }
  }, [drill?.audioTrack?.url, drill?.audioTrack?.offset]);

  // Update volume
  useEffect(() => {
    const audio = getGlobalAudioElement();
    audio.volume = audioEnabled ? audioVolume : 0;
  }, [audioEnabled, audioVolume]);

  // Sync audio playback with animation state
  useEffect(() => {
    if (!drill?.audioTrack) {
      return;
    }

    const audio = getGlobalAudioElement();
    const offset = globalAudioOffset;

    // Verify audio has a valid src before attempting playback
    if (!audio.src || audio.src === '' || audio.src === window.location.href) {
      console.warn('[useAudio] Audio element has no valid src, cannot play:', {
        src: audio.src || 'empty',
        expectedUrl: globalAudioUrl ? globalAudioUrl.substring(0, 100) + '...' : 'none',
      });
      return;
    }

    if (animationState === 'playing') {
      // Calculate target audio time (animation time + offset)
      const targetAudioTime = currentTime + offset;
      
      // Only seek if significantly different to avoid constant seeking
      if (Math.abs(audio.currentTime - targetAudioTime) > 0.1) {
        isSeekingRef.current = true;
        audio.currentTime = Math.max(0, targetAudioTime);
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 100);
      }

      
      console.log('[useAudio] Setting playback rate to match animation speed:', playbackSpeed);
      // Set playback rate to match animation speed
      audio.playbackRate = playbackSpeed;

      // Play audio if not already playing
      if (audio.paused) {
        // Check if audio is ready to play
        // readyState values: 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA
        const isReadyToPlay = audio.readyState >= 2; // HAVE_CURRENT_DATA or better
        
        if (!isReadyToPlay) {
          console.log('[useAudio] Audio not ready to play yet, waiting for canplay event:', {
            readyState: audio.readyState,
            src: audio.src ? audio.src.substring(0, 100) + '...' : 'no src',
          });
          
          // Wait for audio to be ready, then play
          const handleCanPlay = () => {
            console.log('[useAudio] Audio ready, attempting to play');
            audio.play().catch((error) => {
              console.error('[useAudio] Failed to play audio after ready:', {
                error: error.name,
                message: error.message,
                readyState: audio.readyState,
                networkState: audio.networkState,
                src: audio.src ? audio.src.substring(0, 100) + '...' : 'no src',
              });
            });
          };
          
          audio.addEventListener('canplay', handleCanPlay, { once: true });
          
          // Also try loading if network state indicates it might help
          if (audio.networkState === HTMLMediaElement.NETWORK_EMPTY || 
              audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
            console.log('[useAudio] Audio network state indicates loading needed, calling load()');
            audio.load();
          }
        } else {
          // Audio is ready, play immediately
          audio.play().catch((error) => {
            console.error('[useAudio] Failed to play audio:', {
              error: error.name,
              message: error.message,
              readyState: audio.readyState,
              networkState: audio.networkState,
              paused: audio.paused,
              src: audio.src ? audio.src.substring(0, 100) + '...' : 'no src',
            });
            // Only suppress NotAllowedError (autoplay blocked) as it's common and expected
            if (error.name === 'NotAllowedError') {
              console.warn('[useAudio] Autoplay blocked - user interaction required');
            }
          });
        }
      }
    } else if (animationState === 'paused') {
      // Pause audio
      audio.pause();
    } else if (animationState === 'stopped') {
      // Stop and reset audio
      audio.pause();
      audio.currentTime = offset;
    }
  }, [animationState, currentTime, playbackSpeed, drill?.audioTrack]);

  // Sync audio time when currentTime changes (e.g., from timeline scrub)
  useEffect(() => {
    if (!drill?.audioTrack || animationState !== 'playing') return;
    
    const audio = getGlobalAudioElement();
    const offset = globalAudioOffset;
    const targetAudioTime = currentTime + offset;

    // Only seek if significantly different
    if (Math.abs(audio.currentTime - targetAudioTime) > 0.1) {
      isSeekingRef.current = true;
      audio.currentTime = Math.max(0, targetAudioTime);
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
    }
  }, [currentTime, animationState, drill?.audioTrack]);
}

