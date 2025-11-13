import { User } from '@supabase/supabase-js';
import { useAuthStore } from '../../stores/authStore';

interface UserMenuProps {
  user: User;
  onClose: () => void;
}

export default function UserMenu({ user, onClose }: UserMenuProps) {
  const signOut = useAuthStore((state) => state.signOut);

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700">
      <div className="py-1">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {user.email}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Signed in
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

