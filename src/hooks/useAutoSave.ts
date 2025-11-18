import { useEffect, useRef, useState, useCallback } from 'react';
import { useDrillStore } from '../stores/drillStore';
import { useAuthStore } from '../stores/authStore';
import { useHistoryStore } from '../stores/historyStore';
import { CloudStorageAdapter } from '../utils/cloudStorage';
import { JSONFileFormatAdapter } from '../utils/fileIO';
import { drillService } from '../services/drillService';

const cloudAdapter = new CloudStorageAdapter(new JSONFileFormatAdapter());

interface UseAutoSaveOptions {
  enabled?: boolean;
  interval?: number; // milliseconds between auto-saves
  debounceMs?: number; // debounce delay after last change
}

/**
 * Hook for auto-saving drills with version history
 * Saves the drill periodically and creates version history entries
 * Returns the current saving state
 */
export function useAutoSave(options: UseAutoSaveOptions = {}): { isSaving: boolean; hasUnsavedChanges: boolean } {
  const {
    enabled = true,
    interval = 30000, // 30 seconds
    debounceMs = 5000, // 5 seconds after last change
  } = options;

  const drill = useDrillStore((state) => state.drill);
  const user = useAuthStore((state) => state.user);
  const history = useHistoryStore((state) => state.history);
  const lastSavedRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastDrillHashRef = useRef<string>('');
  const lastHistoryLengthRef = useRef<number>(0);

  // Generate a hash of the drill to detect changes
  const getDrillHash = useCallback((drillData: typeof drill): string => {
    if (!drillData) return '';
    // Simple hash based on drill content
    return JSON.stringify({
      id: drillData.id,
      name: drillData.name,
      frames: drillData.frames.length,
      // Include a hash of frame data
      frameHashes: drillData.frames.map(f => `${f.id}-${f.horses.length}`).join(','),
    });
  }, []);

  const saveDrill = useCallback(async () => {
    if (!drill || !user || isSaving) {
      return;
    }

    // Check if drill has actually changed
    const currentHash = getDrillHash(drill);
    if (currentHash === lastDrillHashRef.current && lastSavedRef.current === drill.id) {
      setHasUnsavedChanges(false);
      return; // No changes, skip save
    }

    setIsSaving(true);
    setHasUnsavedChanges(true);
    try {
      // First, save the drill to update the main record
      const saveResult = await cloudAdapter.saveDrillToCloud(drill);
      
      if (saveResult.error) {
        console.error('Auto-save failed:', saveResult.error);
        return;
      }

      // Get the database UUID for the drill
      const drillRecordResult = await drillService.getDrillByShortId(drill.id);
      if (drillRecordResult.data) {
        // Create a version history entry with audio URL from drill
        await drillService.createDrillVersion(
          drillRecordResult.data.id,
          drill,
          drill.audioTrack?.url || null,
          drill.audioTrack?.filename || null
        );
        lastDrillHashRef.current = currentHash;
        lastSavedRef.current = drill.id;
        console.log('Auto-saved drill and created version');
      }
    } catch (error) {
      console.error('Error during auto-save:', error);
    } finally {
      setIsSaving(false);
      setHasUnsavedChanges(false);
    }
  }, [drill, user, isSaving, getDrillHash]);

  // Queue save when history changes (undo/redo queue)
  useEffect(() => {
    if (!enabled || !user || !drill) {
      return;
    }

    // Check if history length changed (new entry added)
    if (history.length !== lastHistoryLengthRef.current && history.length > lastHistoryLengthRef.current) {
      lastHistoryLengthRef.current = history.length;
      
      // Queue a save
      if (!isSaving) {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for debounced save
        saveTimeoutRef.current = setTimeout(() => {
          saveDrill();
        }, debounceMs);
      }
    } else {
      lastHistoryLengthRef.current = history.length;
    }
  }, [history.length, enabled, user, drill, debounceMs, saveDrill, isSaving]);

  // Debounced save after changes
  useEffect(() => {
    if (!enabled || !user || !drill) {
      setHasUnsavedChanges(false);
      return;
    }

    // Check if drill has changed
    const currentHash = getDrillHash(drill);
    if (currentHash !== lastDrillHashRef.current || lastSavedRef.current !== drill.id) {
      setHasUnsavedChanges(true);
    }

    // Don't set up a new save if we're already saving
    if (isSaving) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      saveDrill();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [drill, enabled, user, debounceMs, saveDrill, getDrillHash, isSaving]);

  // Periodic save (interval-based)
  useEffect(() => {
    if (!enabled || !user || !drill) {
      return;
    }

    intervalRef.current = setInterval(() => {
      saveDrill();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, user, drill, interval, saveDrill]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { isSaving, hasUnsavedChanges: hasUnsavedChanges || isSaving };
}

