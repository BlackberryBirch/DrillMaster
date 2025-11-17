import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { CloudStorageAdapter } from '../../utils/cloudStorage';
import { JSONFileFormatAdapter } from '../../utils/fileIO';
import AuthModal from '../Auth/AuthModal';
import Logo from '../UI/Logo';
import { format } from 'date-fns';

// Cloud storage adapter instance
const cloudAdapter = new CloudStorageAdapter(new JSONFileFormatAdapter());

interface DrillListItem {
  id: string; // Short ID for URLs
  name: string;
  updatedAt: Date;
  databaseId?: string; // Database UUID for deletion (optional, will be looked up if needed)
}

export default function Home() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const signOut = useAuthStore((state) => state.signOut);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [drills, setDrills] = useState<DrillListItem[]>([]);
  const [drillsLoading, setDrillsLoading] = useState(false);
  const [drillsError, setDrillsError] = useState<string | null>(null);

  useEffect(() => {
    const loadDrills = async () => {
      if (!user) {
        setDrills([]);
        return;
      }

      setDrillsLoading(true);
      setDrillsError(null);
      try {
        const result = await cloudAdapter.listUserDrills();
        if (result.error) {
          setDrillsError(result.error.message);
        } else if (result.data) {
          setDrills(result.data);
        }
      } catch (err) {
        setDrillsError(err instanceof Error ? err.message : 'Failed to load drills');
      } finally {
        setDrillsLoading(false);
      }
    };

    loadDrills();
  }, [user]);

  const handleCreateNew = () => {
    navigate('/drill/new');
  };

  const handleDrillClick = (drillId: string) => {
    navigate(`/drill/${drillId}`);
  };

  const handleDeleteDrill = async (e: React.MouseEvent, drillId: string, drillName: string) => {
    e.stopPropagation(); // Prevent triggering the drill click
    
    if (!confirm(`Are you sure you want to delete "${drillName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await cloudAdapter.deleteDrillFromCloud(drillId);
      if (result.error) {
        alert(`Failed to delete drill: ${result.error.message}`);
      } else {
        // Remove the drill from the list
        setDrills(drills.filter(d => d.id !== drillId));
      }
    } catch (error) {
      alert(`Failed to delete drill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRenameDrill = async (e: React.MouseEvent, drillId: string, currentName: string) => {
    e.stopPropagation(); // Prevent triggering the drill click
    
    const newName = prompt(`Enter a new name for "${currentName}":`, currentName);
    if (!newName || newName.trim() === '' || newName === currentName) {
      return;
    }

    try {
      // Load the drill from cloud storage
      const loadResult = await cloudAdapter.loadDrillFromCloud(drillId);
      if (loadResult.error || !loadResult.data) {
        alert(`Failed to load drill: ${loadResult.error?.message || 'Unknown error'}`);
        return;
      }

      // Update the drill name
      const updatedDrill = { ...loadResult.data, name: newName.trim() };
      
      // Save the updated drill back to cloud storage
      const saveResult = await cloudAdapter.saveDrillToCloud(updatedDrill);
      if (saveResult.error) {
        alert(`Failed to rename drill: ${saveResult.error.message}`);
      } else {
        // Update the drill in the list
        setDrills(drills.map(d => 
          d.id === drillId ? { ...d, name: newName.trim() } : d
        ));
      }
    } catch (error) {
      alert(`Failed to rename drill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setDrills([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Logo size={40} />
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        {/* Logo and Title Section */}
        <div className="text-center mb-12">
          <Logo size={120} className="justify-center mb-6" />
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Horse Show Editor
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Create, edit, and animate equestrian drill show routines with precision and ease
          </p>
        </div>

        {/* Content based on auth status */}
        {loading ? (
          <div className="text-center">
            <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
          </div>
        ) : user ? (
          /* Authenticated: Show drill list */
          <div className="w-full max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Drills</h2>
              <button
                onClick={handleCreateNew}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                + Create New Drill
              </button>
            </div>

            {drillsLoading ? (
              <div className="text-center py-12">
                <div className="text-lg text-gray-600 dark:text-gray-400">Loading drills...</div>
              </div>
            ) : drillsError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <p className="text-red-800 dark:text-red-200">{drillsError}</p>
              </div>
            ) : drills.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                  You don't have any drills yet.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Your First Drill
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drills.map((drill) => (
                  <div
                    key={drill.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 text-left border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 relative group cursor-pointer"
                    onClick={() => handleDrillClick(drill.id)}
                  >
                    {/* Action buttons in upper-right corner */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {/* Rename button */}
                      <button
                        onClick={(e) => handleRenameDrill(e, drill.id, drill.name)}
                        className="p-1.5 rounded-md bg-gray-600 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-600 text-white transition-all"
                        title="Rename drill"
                        aria-label="Rename drill"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeleteDrill(e, drill.id, drill.name)}
                        className="p-1.5 rounded-md bg-gray-600 dark:bg-gray-700 hover:bg-red-500 dark:hover:bg-red-600 text-white transition-all"
                        title="Delete drill"
                        aria-label="Delete drill"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 truncate pr-20">
                      {drill.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Updated {format(drill.updatedAt, 'MMM d, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Not authenticated: Show login prompt */
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">
                Get Started
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                Sign in to access your drills and start creating amazing equestrian routines.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In or Sign Up
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

