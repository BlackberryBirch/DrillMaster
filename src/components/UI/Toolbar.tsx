import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrillStore } from '../../stores/drillStore';
import { useThemeStore } from '../../stores/themeStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useAuthStore } from '../../stores/authStore';
import { fileIO } from '../../utils/fileIO';
import { CloudStorageAdapter } from '../../utils/cloudStorage';
import { JSONFileFormatAdapter } from '../../utils/fileIO';
import AuthButton from '../Auth/AuthButton';
import Logo from './Logo';

// Cloud storage adapter instance
const cloudAdapter = new CloudStorageAdapter(new JSONFileFormatAdapter());

interface ToolbarProps {
  onTogglePropertiesPanel?: () => void;
  showPropertiesPanel?: boolean;
}

export default function Toolbar({ onTogglePropertiesPanel, showPropertiesPanel = false }: ToolbarProps) {
  const navigate = useNavigate();
  const drill = useDrillStore((state) => state.drill);
  const setDrill = useDrillStore((state) => state.setDrill);
  const createNewDrill = useDrillStore((state) => state.createNewDrill);
  const setAudioTrack = useDrillStore((state) => state.setAudioTrack);
  const removeAudioTrack = useDrillStore((state) => state.removeAudioTrack);
  const user = useAuthStore((state) => state.user);
  const [saving, setSaving] = useState(false);

  const handleNew = () => {
    if (confirm('Create a new drill? Unsaved changes will be lost.')) {
      createNewDrill('New Drill');
    }
  };

  const handleSave = async () => {
    if (!drill) return;

    // If user is authenticated, save to cloud storage
    if (user) {
      setSaving(true);
      try {
        const result = await cloudAdapter.saveDrillToCloud(drill);
        if (result.error) {
          alert(`Failed to save to cloud: ${result.error.message}`);
        } else {
          // Success - optionally show a brief success message
          // The URL will be updated automatically by App.tsx
        }
      } catch (error) {
        alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setSaving(false);
      }
    } else {
      // User not authenticated - save locally as fallback
      try {
        await fileIO.saveDrill(drill);
      } catch (error) {
        alert(`Failed to save: ${error}`);
      }
    }
  };

  const handleLoad = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.drill.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const loadedDrill = await fileIO.loadDrill(file);
        setDrill(loadedDrill);
      } catch (error) {
        alert(`Failed to load: ${error}`);
      }
    };
    input.click();
  };

  const handleLoadAudio = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          setAudioTrack(url, 0, file.name);
        };
        reader.onerror = () => {
          alert('Failed to load audio file');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        alert(`Failed to load audio: ${error}`);
      }
    };
    input.click();
  };

  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);
  const canUndo = useHistoryStore((state) => state.canUndo);
  const canRedo = useHistoryStore((state) => state.canRedo);

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 px-4 py-2 flex flex-wrap items-center gap-2">
      <button
        onClick={handleLogoClick}
        className="mr-2 hover:opacity-80 transition-opacity cursor-pointer"
        title="Go to home"
        aria-label="Go to home"
      >
        <Logo size={32} />
      </button>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
      <button
        onClick={handleNew}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
      >
        New
      </button>
      <button
        onClick={handleLoad}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
      >
        Load
      </button>
      <button
        onClick={handleSave}
        disabled={!drill || saving}
        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        title={user ? 'Save to cloud storage' : 'Save to local file (sign in to save to cloud)'}
      >
        {saving ? 'Saving...' : user ? '💾 Save to Cloud' : '💾 Save'}
      </button>
      <button
        onClick={handleLoadAudio}
        disabled={!drill}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
        title="Load audio file"
      >
        🎵 Load Audio
      </button>
      {drill?.audioTrack && (
        <button
          onClick={removeAudioTrack}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          title="Remove audio track"
        >
          🗑️ Remove Audio
        </button>
      )}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
      <button
        onClick={undo}
        disabled={!canUndo()}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
        title="Undo (Ctrl/Cmd + Z)"
      >
        Undo
      </button>
      <button
        onClick={redo}
        disabled={!canRedo()}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
        title="Redo (Ctrl/Cmd + Shift + Z)"
      >
        Redo
      </button>
      <div className="flex-1" />
      {drill && (
        <span className="text-sm text-gray-600 dark:text-gray-300">{drill.name}</span>
      )}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
      {onTogglePropertiesPanel && (
        <button
          onClick={onTogglePropertiesPanel}
          className={`px-3 py-1 rounded ${
            showPropertiesPanel
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          title="Toggle Properties Panel"
        >
          ⚙️ Properties
        </button>
      )}
      <AuthButton />
      <button
        onClick={toggleTheme}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  );
}

