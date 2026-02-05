import { useState, useRef, useEffect } from 'react';

interface SaveVersionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (versionName: string) => void;
  isSaving?: boolean;
}

export default function SaveVersionDialog({ isOpen, onClose, onSave, isSaving = false }: SaveVersionDialogProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      // Focus input when dialog opens
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSave(trimmed);
      // Dialog stays open until parent closes it after save completes
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Save version</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Give this version a name. Named versions are never overwritten by auto-save.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <label htmlFor="version-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Version name
          </label>
          <input
            ref={inputRef}
            id="version-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Before competition"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSaving}
            maxLength={200}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
