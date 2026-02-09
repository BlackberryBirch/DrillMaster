import { useEffect, useState, useRef, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDrillStore } from './stores/drillStore';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import Layout from './components/UI/Layout';
import BuildInfo from './components/UI/BuildInfo';
import Home from './components/Home/Home';
import DrillPlayer from './components/Player/DrillPlayer';
import VersionHistory from './components/VersionHistory/VersionHistory';
import SaveVersionDialog from './components/VersionHistory/SaveVersionDialog';
import PrintKeyFramesDialog from './components/Print/PrintKeyFramesDialog';
import type { KeyFramesPrintLayout } from './components/Print/PrintKeyFramesDialog';
import { useExportKeyFramesPDF } from './hooks/useExportKeyFramesPDF';
import { CloudStorageAdapter } from './utils/cloudStorage';
import { JSONFileFormatAdapter } from './utils/fileIO';
import { useAutoSave } from './hooks/useAutoSave';
import { drillService } from './services/drillService';

// Cloud storage adapter instance
const cloudAdapter = new CloudStorageAdapter(new JSONFileFormatAdapter());

function DrillEditor() {
  const { id: drillId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const drill = useDrillStore((state) => state.drill);
  const setDrill = useDrillStore((state) => state.setDrill);
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const loadedDrillIdRef = useRef<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAutoSavedVersions, setShowAutoSavedVersions] = useState(false);
  const [showSaveVersionDialog, setShowSaveVersionDialog] = useState(false);
  const [showPrintKeyFramesDialog, setShowPrintKeyFramesDialog] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [databaseDrillId, setDatabaseDrillId] = useState<string | null>(null);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const { exportToPDF } = useExportKeyFramesPDF();

  const keyFrames = useMemo(
    () => drill?.frames.filter((f) => f.isKeyFrame) ?? [],
    [drill?.frames]
  );

  // Enable auto-save when user is authenticated and drill exists
  const { isSaving, hasUnsavedChanges } = useAutoSave({
    enabled: !!user && !!drill && !!drillId,
    interval: 30000, // Save every 30 seconds
    debounceMs: 5000, // Save 5 seconds after last change
  });

  // Save to cloud storage on window closing
  useEffect(() => {
    let isSavingOnClose = false;

    const saveOnClose = async () => {
      if (isSavingOnClose || !user || !drill || !drillId) {
        return;
      }

      isSavingOnClose = true;
      try {
        // Attempt to save - this may not complete if page is closing
        await cloudAdapter.saveDrillToCloud(drill);
      } catch (err) {
        // Ignore errors during unload
        console.error('Failed to save on close:', err);
      } finally {
        isSavingOnClose = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is being hidden (tab switch, minimize, or close)
        saveOnClose();
      }
    };

    const handlePageHide = () => {
      // Page is being unloaded
      saveOnClose();
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Show warning if there are unsaved changes
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = ''; // Required for Chrome
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, drill, drillId, hasUnsavedChanges]);

  useEffect(() => {
    const loadDrill = async () => {
      if (!drillId) {
        return;
      }

      // Skip if we're already loading this drill
      if (isLoadingRef.current && loadedDrillIdRef.current === drillId) {
        return;
      }

      // Skip cloud load when drill was just opened from uploaded file (Home page)
      const fromUpload = (location.state as { fromUpload?: boolean } | null)?.fromUpload;
      if (fromUpload && drill && drill.id === drillId) {
        loadedDrillIdRef.current = drillId;
        return;
      }

      // Skip if the drill is already in the store and matches the drillId
      if (drill && drill.id === drillId && loadedDrillIdRef.current === drillId) {
        return;
      }

      // Load drill from cloud storage
      isLoadingRef.current = true;
      loadedDrillIdRef.current = drillId;
      setLoading(true);
      setError(null);
      try {
        const result = await cloudAdapter.loadDrillFromCloud(drillId);
        if (result.error) {
          // If we already have this drill in store (e.g. from upload or persistence), keep it
          if (drill && drill.id === drillId) {
            setError(null);
            setLoading(false);
            isLoadingRef.current = false;
            return;
          }
          setError(result.error.message);
          navigate('/', { replace: true });
          loadedDrillIdRef.current = null;
        } else if (result.data) {
          // Only set drill if it matches the current URL
          if (result.data.id === drillId) {
            setDrill(result.data, false, false);
            // Get the database UUID for version history
            const dbResult = await drillService.getDrillByShortId(drillId);
            if (dbResult.data) {
              setDatabaseDrillId(dbResult.data.id);
            }
          } else {
            // Drill ID mismatch - this shouldn't happen, but handle it gracefully
            console.warn(`Drill ID mismatch: URL has ${drillId}, but loaded drill has ${result.data.id}`);
            setError('Drill ID mismatch');
            navigate('/', { replace: true });
            loadedDrillIdRef.current = null;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load drill');
        navigate('/', { replace: true });
        loadedDrillIdRef.current = null;
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadDrill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillId, location.state]); // Only depend on drillId and upload state to avoid infinite loops


  // Update URL when drill is saved to cloud (drill.id changes)
  // But only if we're not currently loading a drill
  useEffect(() => {
    // Don't update URL if we're loading
    if (isLoadingRef.current || loading) {
      return;
    }

    // Don't update URL if we just loaded this drill from the URL
    if (drill && drill.id && loadedDrillIdRef.current === drill.id) {
      return;
    }

    // Update URL if drill ID doesn't match URL (e.g., after saving)
    if (drill && drill.id && drillId && drillId !== drill.id) {
      navigate(`/drill/${drill.id}`, { replace: true });
      loadedDrillIdRef.current = drill.id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill?.id, loading]); // Only depend on drill.id to update URL after cloud save

  // Update database drill ID when drill changes (for version history)
  useEffect(() => {
    const updateDatabaseId = async () => {
      if (drill && drill.id && drillId) {
        const dbResult = await drillService.getDrillByShortId(drill.id);
        if (dbResult.data) {
          setDatabaseDrillId(dbResult.data.id);
        }
      }
    };
    updateDatabaseId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill?.id, drillId]); // Only depend on drill.id, not the full drill object

  const handleRestoreVersion = async (restoredDrill: typeof drill) => {
    if (!restoredDrill) return;
    
    // Set the restored drill
    setDrill(restoredDrill, false, false);
    
    // Save it to update the main drill record
    if (user) {
      try {
        await cloudAdapter.saveDrillToCloud(restoredDrill);
      } catch (err) {
        console.error('Failed to save restored drill:', err);
      }
    }
  };

  const handleSaveVersion = async (versionName: string) => {
    if (!drill || !user || !databaseDrillId) return;
    setIsSavingVersion(true);
    try {
      await cloudAdapter.saveDrillToCloud(drill);
      const result = await drillService.createDrillVersion(
        databaseDrillId,
        drill,
        drill.audioTrack?.url || null,
        drill.audioTrack?.filename || null,
        versionName
      );
      if (result.error) {
        alert(`Failed to save version: ${result.error.message}`);
      } else {
        setShowSaveVersionDialog(false);
      }
    } catch (err) {
      alert(`Failed to save version: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSavingVersion(false);
    }
  };

  const handleExportPDF = async (layout: KeyFramesPrintLayout) => {
    if (keyFrames.length === 0) return;
    setIsExportingPDF(true);
    try {
      const drillName = drill?.name?.replace(/[^a-zA-Z0-9-_]/g, '-') ?? 'drill';
      await exportToPDF(keyFrames, layout, `${drillName}-key-frames.pdf`);
      setShowPrintKeyFramesDialog(false);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-700 dark:text-gray-300">Loading drill...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 dark:text-red-400 mb-2">Error: {error}</div>
          <button
            onClick={() => {
              setError(null);
              navigate('/', { replace: true });
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Layout
        onOpenVersionHistory={() => setShowVersionHistory(true)}
        onSaveVersion={() => setShowSaveVersionDialog(true)}
        onOpenPrintKeyFrames={() => setShowPrintKeyFramesDialog(true)}
        isSaving={isSaving || hasUnsavedChanges}
      />
      {databaseDrillId && (
        <VersionHistory
          drillId={databaseDrillId}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          onRestore={handleRestoreVersion}
          showAutoSavedVersions={showAutoSavedVersions}
          onShowAutoSavedVersionsChange={setShowAutoSavedVersions}
        />
      )}
      <SaveVersionDialog
        isOpen={showSaveVersionDialog}
        onClose={() => setShowSaveVersionDialog(false)}
        onSave={handleSaveVersion}
        isSaving={isSavingVersion}
      />
      <PrintKeyFramesDialog
        isOpen={showPrintKeyFramesDialog}
        onClose={() => setShowPrintKeyFramesDialog(false)}
        onExportPDF={handleExportPDF}
        keyFrameCount={keyFrames.length}
        isExporting={isExportingPDF}
      />
    </>
  );
}

function AppContent() {
  const theme = useThemeStore((state) => state.theme);
  const location = useLocation();
  const isPlayerRoute = location.pathname.startsWith('/play/');
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Initialize authentication
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    // Apply theme class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900 relative">
      <Routes>
        <Route path="/play/:token" element={<DrillPlayer />} />
        <Route path="/drill/:id" element={<DrillEditor />} />
        <Route path="/" element={<Home />} />
      </Routes>
      {!isPlayerRoute && <BuildInfo />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

