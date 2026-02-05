import { useState } from 'react';

const buildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '';
const gitCommit = typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : '';
const changelog = typeof __CHANGELOG__ !== 'undefined' ? __CHANGELOG__ : 'No changelog available.';

export default function BuildInfo() {
  const [showChangelog, setShowChangelog] = useState(false);

  if (!buildDate && !gitCommit) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowChangelog(true)}
        className="fixed bottom-2 right-2 z-40 flex items-center gap-1 font-mono text-[9px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        title="Build info — click for changelog"
      >
        <span>{buildDate}</span>
        {gitCommit && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="text-gray-600 dark:text-gray-300">{gitCommit}</span>
          </>
        )}
      </button>

      {showChangelog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-title"
          onClick={() => setShowChangelog(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <h2 id="changelog-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Changelog (git history)
              </h2>
              <button
                type="button"
                onClick={() => setShowChangelog(false)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-4 text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900">
              {changelog}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}
