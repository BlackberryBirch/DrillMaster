import { useEffect, useState, useCallback } from 'react';
import { drillService } from '../../services/drillService';
import { DrillVersionRecord } from '../../types/database';
import { Drill } from '../../types/drill';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { JSONFileFormatAdapter, fileIO } from '../../utils/fileIO';
import ShareVersionDialog from './ShareVersionDialog';

interface VersionHistoryProps {
  drillId: string; // Database UUID
  isOpen: boolean;
  onClose: () => void;
  onRestore: (drill: Drill) => void;
  /** When false (default), only named versions are shown. When true, auto-saved versions are included. */
  showAutoSavedVersions?: boolean;
  onShowAutoSavedVersionsChange?: (value: boolean) => void;
}

export default function VersionHistory({ drillId, isOpen, onClose, onRestore, showAutoSavedVersions = false, onShowAutoSavedVersionsChange }: VersionHistoryProps) {
  const [versions, setVersions] = useState<DrillVersionRecord[]>([]);
  const [shareLinkVersionNumbers, setShareLinkVersionNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [shareVersion, setShareVersion] = useState<DrillVersionRecord | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await drillService.getDrillVersions(drillId);
      if (result.error) {
        setError(result.error.message);
      } else if (result.data) {
        setVersions(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  }, [drillId]);

  const loadShareLinkVersionNumbers = useCallback(async () => {
    if (!drillId) return;
    const result = await drillService.getShareLinkVersionNumbers(drillId);
    if (result.data) {
      setShareLinkVersionNumbers(result.data);
    }
  }, [drillId]);

  useEffect(() => {
    if (isOpen && drillId) {
      loadVersions();
      loadShareLinkVersionNumbers();
    }
  }, [isOpen, drillId, loadVersions, loadShareLinkVersionNumbers]);

  // When showAutoSavedVersions is false, show only named versions (version_label set)
  const displayedVersions = showAutoSavedVersions
    ? versions
    : versions.filter((v) => v.version_label != null && v.version_label !== '');

  const handleRestore = async (version: DrillVersionRecord) => {
    if (!confirm(`Are you sure you want to restore version ${version.version_number}? This will replace your current drill.`)) {
      return;
    }

    setRestoring(version.id);
    try {
      // Restore the drill from the version
      let restoredDrill = version.drill_data;
      
      // Migrate old normalized coordinates to meters if needed
      // This ensures backward compatibility for versions saved before the coordinate system change
      const jsonAdapter = new JSONFileFormatAdapter();
      restoredDrill = jsonAdapter.migrateCoordinates(restoredDrill);
      
      // Update metadata to reflect restoration
      restoredDrill.metadata.modifiedAt = new Date();
      
      // Restore audio track if it exists in the version
      if (version.audio_url) {
        // The audio_url from the database is always a storage path (never a signed URL)
        const storagePath = version.audio_url;
        console.log('[VersionHistory] Restoring audio track:', {
          storagePath: storagePath,
          filename: version.audio_filename,
        });
        
        // Convert storage path to signed URL for playback
        console.log('[VersionHistory] Converting storage path to signed URL:', storagePath);
        const { data: urlData, error } = await supabase.storage
          .from('drill-audio')
          .createSignedUrl(storagePath, 3600); // 1 hour expiration
        
        if (error) {
          console.error('[VersionHistory] Failed to create signed URL for audio:', {
            error,
            storagePath: storagePath,
          });
          // If signed URL creation fails, clear the audio track
          restoredDrill.audioTrack = undefined;
        } else {
          const signedUrl = urlData.signedUrl;
          console.log('[VersionHistory] Successfully created signed URL:', {
            storagePath: storagePath,
            signedUrl: signedUrl.substring(0, 100) + '...',
          });
          
          // Set audio track with both storagePath (for saving) and url (for playback)
          restoredDrill.audioTrack = {
            url: signedUrl, // Temporary signed URL for playback
            storagePath: storagePath, // Storage path saved to DB
            offset: restoredDrill.audioTrack?.offset || 0,
            filename: version.audio_filename || undefined,
          };
          
          console.log('[VersionHistory] Audio track restored:', {
            storagePath: storagePath,
            url: signedUrl.substring(0, 100) + '...',
            offset: restoredDrill.audioTrack.offset,
            filename: restoredDrill.audioTrack.filename,
          });
        }
      } else {
        // Clear audio track if version doesn't have one
        console.log('[VersionHistory] No audio_url in version, clearing audio track');
        restoredDrill.audioTrack = undefined;
      }
      
      onRestore(restoredDrill);
      onClose();
    } catch (err) {
      alert(`Failed to restore version: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (versionId: string) => {
    if (!confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await drillService.deleteDrillVersion(versionId);
      if (result.error) {
        alert(`Failed to delete version: ${result.error.message}`);
      } else {
        // Reload versions
        await loadVersions();
      }
    } catch (err) {
      alert(`Failed to delete version: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDownload = async (version: DrillVersionRecord) => {
    try {
      let restoredDrill: Drill = version.drill_data;
      const jsonAdapter = new JSONFileFormatAdapter();
      restoredDrill = jsonAdapter.migrateCoordinates(restoredDrill);
      restoredDrill.metadata.modifiedAt = new Date(restoredDrill.metadata.modifiedAt);
      // Serialization omits audio url; storagePath/offset/filename are included in the file
      const label = (version.version_label || `v${version.version_number}`).replace(/[^\w\s-]/g, '').trim() || `v${version.version_number}`;
      const filename = `${restoredDrill.name}-${label}.drill`;
      await fileIO.saveDrillCompressed(restoredDrill, filename);
    } catch (err) {
      alert(`Failed to download: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Version History</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          {onShowAutoSavedVersionsChange && (
            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAutoSavedVersions}
                onChange={(e) => onShowAutoSavedVersionsChange(e.target.checked)}
                className="rounded border-gray-400 dark:border-gray-500 text-blue-600 focus:ring-blue-500"
                title="Include auto-saved versions in history"
                aria-label="Show auto-saved versions"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Show auto-saved versions</span>
            </label>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-600 dark:text-gray-400">Loading versions...</div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          ) : displayedVersions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                {versions.length === 0
                  ? 'No version history available'
                  : 'No named versions. Enable "Show auto-saved" to see all versions.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedVersions.map((version) => (
                <div
                  key={version.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {version.version_label ? (
                            <>
                              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {version.version_label}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {format(new Date(version.updated_at), 'MMM d, yyyy h:mm a')}
                              </span>
                            </>
                          ) : (
                          <span className="text-sm font-semibold italic text-gray-900 dark:text-gray-100">
                            Autosave {format(new Date(version.updated_at), 'MMM d, yyyy h:mm a')}
                          </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0">
                          {version.drill_data.frames.length} frame{version.drill_data.frames.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {version.version_label != null && version.version_label !== '' && (
                        <button
                          onClick={() => setShareVersion(version)}
                          className={`px-3 py-1.5 text-sm rounded transition-colors ${
                            shareLinkVersionNumbers.includes(version.version_number)
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                          title={
                            shareLinkVersionNumbers.includes(version.version_number)
                              ? 'View or copy shareable player link'
                              : 'Get shareable player link'
                          }
                        >
                          Share
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(version)}
                        className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                        title="Download as compressed drill file (.drill)"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleRestore(version)}
                        disabled={restoring === version.id}
                        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        title="Restore this version"
                      >
                        {restoring === version.id ? 'Restoring...' : 'Restore'}
                      </button>
                      <button
                        onClick={() => handleDelete(version.id)}
                        className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                        title="Delete this version"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <ShareVersionDialog
        isOpen={shareVersion !== null}
        onClose={() => {
          setShareVersion(null);
          loadShareLinkVersionNumbers();
        }}
        drillId={drillId}
        version={shareVersion}
      />
    </div>
  );
}

