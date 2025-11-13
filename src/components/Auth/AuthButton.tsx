import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import AuthModal from './AuthModal';
import UserMenu from './UserMenu';

export default function AuthButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return (
      <button
        disabled
        className="px-3 py-1 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (user) {
    return (
      <>
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
          >
            <span className="text-sm">{user.email}</span>
            <span className="text-xs">▼</span>
          </button>
          {showUserMenu && (
            <UserMenu
              user={user}
              onClose={() => setShowUserMenu(false)}
            />
          )}
        </div>
        {showUserMenu && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowUserMenu(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Sign In
      </button>
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

