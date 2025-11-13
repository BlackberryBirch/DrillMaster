import { useEffect } from 'react';
import { useDrillStore } from './stores/drillStore';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import Layout from './components/UI/Layout';

function App() {
  const createNewDrill = useDrillStore((state) => state.createNewDrill);
  const theme = useThemeStore((state) => state.theme);
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Initialize authentication
    initializeAuth();
    // Create a default drill on mount
    createNewDrill('New Drill');
  }, [createNewDrill, initializeAuth]);

  useEffect(() => {
    // Apply theme class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900">
      <Layout />
    </div>
  );
}

export default App;

