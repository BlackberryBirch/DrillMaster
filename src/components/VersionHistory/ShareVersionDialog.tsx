import { useState, useEffect, useCallback } from 'react';
import { drillService } from '../../services/drillService';
import { DrillVersionRecord } from '../../types/database';

interface ShareVersionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  drillId: string;
  version: DrillVersionRecord | null;
}

export default function ShareVersionDialog({
  isOpen,
  onClose,
  drillId,
  version,
}: ShareVersionDialogProps) {
  const [createNewToken, setCreateNewToken] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadExistingLink = useCallback(async () => {
    if (!drillId || !version) return;
    setLoading(true);
    setError(null);
    const result = await drillService.getShareLinkForVersion(drillId, version.version_number);
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      setShareUrl(null);
      return;
    }
    if (result.data) {
      setShareUrl(`${window.location.origin}/play/${result.data.shareToken}`);
    } else {
      setShareUrl(null);
    }
  }, [drillId, version]);

  useEffect(() => {
    if (isOpen && drillId && version) {
      setShareUrl(null);
      setError(null);
      setCreateNewToken(false);
      setCopied(false);
      loadExistingLink();
    }
  }, [isOpen, drillId, version, loadExistingLink]);

  const handleGenerateLink = async () => {
    if (!version) return;
    setGenerating(true);
    setError(null);
    const result = await drillService.createShareLink(drillId, version.version_number, {
      forceNew: createNewToken,
    });
    setGenerating(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (result.data) {
      setShareUrl(`${window.location.origin}/play/${result.data.shareToken}`);
      setCreateNewToken(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Share this version</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Anyone with this link can view the drill in player mode (no sign-in required).
          </p>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={createNewToken}
              onChange={(e) => setCreateNewToken(e.target.checked)}
              className="rounded border-gray-400 dark:border-gray-500 text-blue-600 focus:ring-blue-500"
              aria-label="Create new share token"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Create new share token (invalidates the previous link)
            </span>
          </label>

          {loading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          ) : shareUrl ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Player link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating…' : shareUrl ? 'Generate new link' : 'Generate link'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
