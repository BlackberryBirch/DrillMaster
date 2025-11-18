import { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { useDrillStore } from './stores/drillStore';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import Layout from './components/UI/Layout';
import Home from './components/Home/Home';
import VersionHistory from './components/VersionHistory/VersionHistory';
import { CloudStorageAdapter } from './utils/cloudStorage';
import { JSONFileFormatAdapter } from './utils/fileIO';
import { useAutoSave } from './hooks/useAutoSave';
import { drillService } from './services/drillService';

// Cloud storage adapter instance
const cloudAdapter = new CloudStorageAdapter(new JSONFileFormatAdapter());

function DrillEditor() {
  const { id: drillId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const drill = useDrillStore((state) => state.drill);
  const setDrill = useDrillStore((state) => state.setDrill);
  const createNewDrill = useDrillStore((state) => state.createNewDrill);
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isLoadingRef = useRef(false);
  const loadedDrillIdRef = useRef<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [databaseDrillId, setDatabaseDrillId] = useState<string | null>(null);

  // Enable auto-save when user is authenticated and drill exists
  const { isSaving, hasUnsavedChanges } = useAutoSave({
    enabled: !!user && !!drill && drillId !== 'new',
    interval: 30000, // Save every 30 seconds
    debounceMs: 5000, // Save 5 seconds after last change
  });

  useEffect(() => {
    const loadDrill = async () => {
      if (drillId === 'new') {
        // Create a new drill
        createNewDrill('New Drill');
        loadedDrillIdRef.current = null;
        // The URL will be updated when the drill gets an ID
        return;
      }

      if (drillId) {
        // Skip if we're already loading this drill
        if (isLoadingRef.current && loadedDrillIdRef.current === drillId) {
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
            setError(result.error.message);
            // If drill not found, redirect to home
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
      }
    };

    loadDrill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillId]); // Only depend on drillId to avoid infinite loops

  // Automatically save new drills to cloud storage when created
  useEffect(() => {
    const saveNewDrill = async () => {
      // Only save if:
      // 1. User is authenticated
      // 2. Drill exists
      // 3. We're on the 'new' route (newly created drill)
      // 4. Not already saving
      if (!user || !drill || drillId !== 'new' || saving) {
        return;
      }

      setSaving(true);
      try {
        const result = await cloudAdapter.saveDrillToCloud(drill);
        if (result.error) {
          console.error('Failed to save new drill to cloud:', result.error);
          // Don't show error to user - they can still work on the drill locally
          // The drill will be saved when they explicitly save it
        } else if (result.data) {
          // Drill saved successfully, URL will be updated by the next useEffect
          console.log('New drill saved to cloud with ID:', result.data);
        }
      } catch (err) {
        console.error('Error saving new drill to cloud:', err);
      } finally {
        setSaving(false);
      }
    };

    // Only save if we have all required conditions
    if (user && drill && drillId === 'new' && !saving) {
      saveNewDrill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill?.id, drillId, user]); // Save when drill is created and user is authenticated

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

    if (drill && drill.id && drillId && drillId !== 'new' && drillId !== drill.id) {
      // Update URL if drill ID doesn't match URL (e.g., after saving)
      navigate(`/drill/${drill.id}`, { replace: true });
      loadedDrillIdRef.current = drill.id;
    } else if (drill && drill.id && drillId === 'new') {
      // New drill created, update URL with the ID
      navigate(`/drill/${drill.id}`, { replace: true });
      loadedDrillIdRef.current = drill.id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill?.id, loading]); // Only depend on drill.id to update URL after cloud save

  // Update database drill ID when drill changes (for version history)
  useEffect(() => {
    const updateDatabaseId = async () => {
      if (drill && drill.id && drillId && drillId !== 'new') {
        const dbResult = await drillService.getDrillByShortId(drill.id);
        if (dbResult.data) {
          setDatabaseDrillId(dbResult.data.id);
        }
      }
    };
    updateDatabaseId();
  }, [drill?.id, drillId]);

  const handleRestoreVersion = async (restoredDrill: typeof drill) => {
    if (!restoredDrill) return;
    
    // Set the restored drill
    setDrill(restoredDrill, false, false);
    
    // Save it to update the main drill record
    if (user) {
      setSaving(true);
      try {
        await cloudAdapter.saveDrillToCloud(restoredDrill);
      } catch (err) {
        console.error('Failed to save restored drill:', err);
      } finally {
        setSaving(false);
      }
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
        isSaving={isSaving || hasUnsavedChanges}
      />
      {databaseDrillId && (
        <VersionHistory
          drillId={databaseDrillId}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          onRestore={handleRestoreVersion}
        />
      )}
    </>
  );
}

function App() {
  const theme = useThemeStore((state) => state.theme);
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
    <BrowserRouter>
      <div className="w-full h-full bg-gray-100 dark:bg-gray-900">
        <Routes>
          <Route path="/drill/:id" element={<DrillEditor />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

