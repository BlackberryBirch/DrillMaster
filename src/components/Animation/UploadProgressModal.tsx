import { useEffect } from 'react';

interface UploadProgressModalProps {
  isOpen: boolean;
  fileName: string;
  onCancel: () => void;
}

export default function UploadProgressModal({ isOpen, fileName, onCancel }: UploadProgressModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Uploading Audio File
        </h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            File: <span className="font-medium text-gray-900 dark:text-gray-100">{fileName}</span>
          </p>
          
          {/* Indeterminate progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden relative">
            <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full progress-bar-indeterminate" />
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Please wait while your file is being uploaded...
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
      
      <style>{`
        .progress-bar-indeterminate {
          width: 30%;
          animation: indeterminate 1.5s ease-in-out infinite;
        }
        
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}

