import { useEffect, useRef } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useDrillStore } from '../stores/drillStore';

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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioOffsetRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);

  // Initialize audio element (only once, not on every drill change)
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      
      // Handle audio errors - log all errors with context
      audioRef.current.addEventListener('error', (e) => {
        const audio = e.target as HTMLAudioElement;
        if (audio.src && audio.error) {
          const errorCode = audio.error.code;
          const errorMessages: Record<number, string> = {
            1: 'MEDIA_ERR_ABORTED - The user aborted the loading',
            2: 'MEDIA_ERR_NETWORK - A network error occurred',
            3: 'MEDIA_ERR_DECODE - The audio was decoded with an error',
            4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - The audio source is not supported',
          };
          
          console.error('[useAudio] Audio playback error:', {
            code: errorCode,
            message: errorMessages[errorCode] || 'Unknown error',
            src: audio.src.substring(0, 150), // Log first 150 chars of URL
            networkState: audio.networkState,
            readyState: audio.readyState,
          });
        } else if (audio.src && !audio.error) {
          console.warn('[useAudio] Audio error event fired but no error object available:', {
            src: audio.src.substring(0, 150),
            networkState: audio.networkState,
            readyState: audio.readyState,
          });
        }
      });

      // Note: We don't sync animation time from audio time
      // Animation time is the master, audio follows it

      // Handle audio end
      audioRef.current.addEventListener('ended', () => {
        // Audio ended, but animation might still be playing
        // Let animation handle stopping
      });
    }

    return () => {
      // Only cleanup on unmount, not on every drill change
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []); // Empty dependency array - only create once

  // Update audio source when drill changes
  useEffect(() => {
    if (!audioRef.current || !drill?.audioTrack) {
      if (audioRef.current) {
        console.log('[useAudio] Clearing audio source - no drill or audio track');
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      audioUrlRef.current = null;
      audioOffsetRef.current = 0;
      return;
    }

    const audioTrack = drill.audioTrack;
    
    // Only update if URL changed
    if (audioUrlRef.current !== audioTrack.url) {
      console.log('[useAudio] Setting audio URL:', {
        previousUrl: audioUrlRef.current ? audioUrlRef.current.substring(0, 100) + '...' : null,
        newUrl: audioTrack.url.substring(0, 100) + '...',
        offset: audioTrack.offset || 0,
        filename: audioTrack.filename,
      });
      
      audioUrlRef.current = audioTrack.url;
      audioOffsetRef.current = audioTrack.offset || 0;
      
      if (audioRef.current) {
        // Verify URL is valid before setting
        if (!audioTrack.url || audioTrack.url.trim() === '') {
          console.error('[useAudio] Invalid audio URL (empty or whitespace):', audioTrack.url);
          return;
        }
        
        // Check if URL looks valid
        const isValidUrl = audioTrack.url.startsWith('http://') || 
                          audioTrack.url.startsWith('https://') || 
                          audioTrack.url.startsWith('data:');
        
        if (!isValidUrl) {
          console.warn('[useAudio] Audio URL does not appear to be a valid URL:', {
            url: audioTrack.url.substring(0, 150),
            urlLength: audioTrack.url.length,
          });
        }
        
        console.log('[useAudio] Setting audio element src and loading...');
        const urlBeforeSet = audioRef.current.src;
        audioRef.current.src = audioTrack.url;
        const urlAfterSet = audioRef.current.src;
        
        // Log the URL that was set (browser may normalize it)
        console.log('[useAudio] Audio src set:', {
          requested: audioTrack.url.substring(0, 150) + '...',
          actual: urlAfterSet.substring(0, 150) + '...',
          changed: urlBeforeSet !== urlAfterSet,
        });
        
        audioRef.current.load();
        
        // Log when audio is loaded
        audioRef.current.addEventListener('loadedmetadata', () => {
          console.log('[useAudio] Audio metadata loaded:', {
            duration: audioRef.current?.duration,
            readyState: audioRef.current?.readyState,
            networkState: audioRef.current?.networkState,
            src: audioRef.current?.src.substring(0, 150) + '...',
          });
        }, { once: true });
        
        // Log when audio can play
        audioRef.current.addEventListener('canplay', () => {
          console.log('[useAudio] Audio can play:', {
            duration: audioRef.current?.duration,
            readyState: audioRef.current?.readyState,
            networkState: audioRef.current?.networkState,
            src: audioRef.current?.src.substring(0, 150) + '...',
          });
        }, { once: true });
        
        // Log loadstart
        audioRef.current.addEventListener('loadstart', () => {
          console.log('[useAudio] Audio load started:', {
            src: audioRef.current?.src.substring(0, 150) + '...',
          });
        }, { once: true });
      }
    } else {
      console.log('[useAudio] Audio URL unchanged, skipping update');
    }
  }, [drill?.audioTrack]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioEnabled ? audioVolume : 0;
    }
  }, [audioEnabled, audioVolume]);

  // Sync audio playback with animation state
  useEffect(() => {
    if (!audioRef.current || !drill?.audioTrack) return;

    const audio = audioRef.current;
    const offset = audioOffsetRef.current;

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
        audio.play().catch((error) => {
          // Only log if it's not a user interaction error (common when autoplay is blocked)
          if (error.name !== 'NotAllowedError' && error.name !== 'NotSupportedError') {
            console.error('Failed to play audio:', error);
          }
        });
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
    if (!audioRef.current || !drill?.audioTrack || animationState !== 'playing') return;
    
    const audio = audioRef.current;
    const offset = audioOffsetRef.current;
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

