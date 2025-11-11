import { useDrillStore } from '../../stores/drillStore';
import { useThemeStore } from '../../stores/themeStore';
import { fileIO } from '../../utils/fileIO';

export default function Toolbar() {
  const drill = useDrillStore((state) => state.drill);
  const setDrill = useDrillStore((state) => state.setDrill);
  const createNewDrill = useDrillStore((state) => state.createNewDrill);

  const handleNew = () => {
    if (confirm('Create a new drill? Unsaved changes will be lost.')) {
      createNewDrill('New Drill');
    }
  };

  const handleSave = async () => {
    if (!drill) return;
    try {
      await fileIO.saveDrill(drill);
    } catch (error) {
      alert(`Failed to save: ${error}`);
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

  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 px-4 py-2 flex items-center gap-2">
      <button
        onClick={handleNew}
        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        New
      </button>
      <button
        onClick={handleLoad}
        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Load
      </button>
      <button
        onClick={handleSave}
        disabled={!drill}
        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Save
      </button>
      <div className="flex-1" />
      {drill && (
        <span className="text-sm text-gray-600 dark:text-gray-300">{drill.name}</span>
      )}
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

