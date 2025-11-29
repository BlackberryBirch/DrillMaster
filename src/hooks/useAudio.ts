import { useEffect, useRef } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useDrillStore } from '../stores/drillStore';

// Module-level singleton for audio element - persists across component unmounts
let globalAudioElement: HTMLAudioElement | null = null;
let globalAudioUrl: string | null = null;
let globalAudioOffset: number = 0;
let activeInstances = 0; // Track how many components are using the hook

/**
 * Safely pause audio element (handles test environment where pause may not be implemented)
 */
function safePause(audio: HTMLAudioElement): void {
  try {
    audio.pause();
  } catch {
    // Ignore errors in test environment (jsdom doesn't fully implement HTMLMediaElement)
  }
}

/**
 * Get or create the global audio element
 */
function getGlobalAudioElement(): HTMLAudioElement {
  if (!globalAudioElement) {
    globalAudioElement = new Audio();
    globalAudioElement.preload = 'auto';
    
    // Handle audio errors
    globalAudioElement.addEventListener('error', () => {
      // Error handling without logging
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
        safePause(globalAudioElement);
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
        safePause(audio);
        audio.src = '';
      }
      globalAudioUrl = null;
      globalAudioOffset = 0;
      return;
    }

    const audioTrack = drill.audioTrack;
    
    // Validate URL before creating audio element
    if (!audioTrack.url || audioTrack.url.trim() === '') {
      if (globalAudioUrl) {
        safePause(audio);
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
      if (globalAudioUrl) {
        safePause(audio);
        audio.src = '';
      }
      globalAudioUrl = null;
      globalAudioOffset = 0;
      return;
    }

    // Only update if URL changed
    if (globalAudioUrl !== audioTrack.url) {
      globalAudioUrl = audioTrack.url;
      globalAudioOffset = audioTrack.offset || 0;
      // Pause and reset the audio element before setting new src to avoid conflicts
      safePause(audio);
      audio.currentTime = 0;
      
      // Clear any existing src first to ensure clean state
      if (audio.src) {
        audio.src = '';
      }
      
      // Set the new URL
      audio.src = audioTrack.url;
      const urlAfterSet = audio.src;
      
      // Verify src was set correctly immediately
      const isValidSrc = urlAfterSet && (
        urlAfterSet.startsWith('http://') || 
        urlAfterSet.startsWith('https://') || 
        urlAfterSet.startsWith('data:')
      );
      if (!isValidSrc) {
        // Try setting it again after a brief delay
        setTimeout(() => {
          if (audio.src !== audioTrack.url && audio.src) {
            audio.src = audioTrack.url;
            audio.load();
          }
        }, 50);
      }
      
      // Verify the src was set correctly
      if (!audio.src || (!audio.src.startsWith('http') && !audio.src.startsWith('data:'))) {
        // Try setting it again
        audio.src = audioTrack.url;
      }
      
      // Call load() after setting up listeners
      audio.load();
      
      // Verify src again after load() call
      setTimeout(() => {
        if (audio.src !== audioTrack.url && audio.src) {
          // Restore the correct URL if it was changed
          if (!audio.src.includes(audioTrack.url.split('?')[0])) {
            audio.src = audioTrack.url;
            audio.load();
          }
        }
      }, 100);
    } else {
      // Even if URL is unchanged, verify the audio element still has the correct src
      if (audio.src && globalAudioUrl) {
        const currentSrc = audio.src;
        // Check if the src matches (accounting for URL normalization)
        if (!currentSrc.includes(globalAudioUrl.split('?')[0]) && !currentSrc.includes(new URL(globalAudioUrl).pathname)) {
          audio.src = globalAudioUrl;
          audio.load();
        }
      }
    }
  }, [drill?.audioTrack?.url, drill?.audioTrack?.offset, drill?.audioTrack]);

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

      // Set playback rate to match animation speed
      audio.playbackRate = playbackSpeed;

      // Play audio if not already playing
      if (audio.paused) {
        // Check if audio is ready to play
        // readyState values: 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA
        const isReadyToPlay = audio.readyState >= 2; // HAVE_CURRENT_DATA or better
        
        if (!isReadyToPlay) {
          // Wait for audio to be ready, then play
          const handleCanPlay = () => {
            audio.play().catch(() => {
              // Ignore playback errors
            });
          };
          
          audio.addEventListener('canplay', handleCanPlay, { once: true });
          
          // Also try loading if network state indicates it might help
          if (audio.networkState === HTMLMediaElement.NETWORK_EMPTY || 
              audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
            audio.load();
          }
        } else {
          // Audio is ready, play immediately
          audio.play().catch(() => {
            // Ignore playback errors
          });
        }
      }
    } else if (animationState === 'paused') {
      // Pause audio
      safePause(audio);
    } else if (animationState === 'stopped') {
      // Stop and reset audio
      safePause(audio);
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

