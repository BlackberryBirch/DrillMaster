import { useNavigate } from 'react-router-dom';
import { useDrillStore } from '../../stores/drillStore';
import { useThemeStore } from '../../stores/themeStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useAuthStore } from '../../stores/authStore';
import AuthButton from '../Auth/AuthButton';
import Logo from './Logo';
import { Settings, History, Moon, Sun, Save, FileDown } from 'lucide-react';

interface ToolbarProps {
  onTogglePropertiesPanel?: () => void;
  showPropertiesPanel?: boolean;
  onOpenVersionHistory?: () => void;
  onSaveVersion?: () => void;
  onOpenPrintKeyFrames?: () => void;
  isSaving?: boolean;
}

export default function Toolbar({ onTogglePropertiesPanel, showPropertiesPanel = false, onOpenVersionHistory, onSaveVersion, onOpenPrintKeyFrames, isSaving = false }: ToolbarProps) {
  const navigate = useNavigate();
  const drill = useDrillStore((state) => state.drill);
  const user = useAuthStore((state) => state.user);

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
        title="Redo (Ctrl/Cmd + Y)"
      >
        Redo
      </button>
      <div className="flex-1" />
      {user && isSaving && (
        <span className="text-sm text-gray-400 dark:text-gray-500 italic mr-2">
          Saving to cloud...
        </span>
      )}
      {drill && (
        <span className="text-sm text-gray-600 dark:text-gray-300">{drill.name}</span>
      )}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
      {onTogglePropertiesPanel && (
        <button
          onClick={onTogglePropertiesPanel}
          className={`px-3 py-1 rounded flex items-center gap-2 ${
            showPropertiesPanel
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          title="Toggle Properties Panel"
        >
          <Settings className="w-4 h-4 flex-shrink-0" aria-hidden />
          Properties
        </button>
      )}
      {user && drill && (
        <>
          {onSaveVersion && (
            <button
              onClick={onSaveVersion}
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              title="Save a new named version"
              aria-label="Save a new named version"
            >
              <Save className="w-4 h-4" aria-hidden />
            </button>
          )}
          {onOpenVersionHistory && (
            <button
              onClick={onOpenVersionHistory}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
              title="View Version History"
            >
              <History className="w-4 h-4 flex-shrink-0" aria-hidden />
              History
            </button>
          )}
          {onOpenPrintKeyFrames && (
            <button
              onClick={onOpenPrintKeyFrames}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
              title="Export key frames to PDF"
              aria-label="Export key frames to PDF"
            >
              <FileDown className="w-4 h-4 flex-shrink-0" aria-hidden />
              Export PDF
            </button>
          )}
        </>
      )}
      <AuthButton />
      <button
        onClick={toggleTheme}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center"
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? <Moon className="w-4 h-4" aria-hidden /> : <Sun className="w-4 h-4" aria-hidden />}
      </button>
    </div>
  );
}

