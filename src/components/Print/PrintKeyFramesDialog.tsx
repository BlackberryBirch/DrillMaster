import { useState } from 'react';
import { FileDown } from 'lucide-react';

export type KeyFramesPrintLayout = '1-up-landscape' | '2-up-portrait' | '4-up-portrait' | '9-up-portrait';

const LAYOUT_OPTIONS: { value: KeyFramesPrintLayout; label: string }[] = [
  { value: '1-up-landscape', label: '1 per page (landscape)' },
  { value: '2-up-portrait', label: '2 per page (portrait)' },
  { value: '4-up-portrait', label: '4 per page (portrait)' },
  { value: '9-up-portrait', label: '9 per page (portrait)' },
];

interface PrintKeyFramesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: (layout: KeyFramesPrintLayout) => void;
  keyFrameCount: number;
  isExporting?: boolean;
}

export default function PrintKeyFramesDialog({
  isOpen,
  onClose,
  onExportPDF,
  keyFrameCount,
  isExporting = false,
}: PrintKeyFramesDialogProps) {
  const [layout, setLayout] = useState<KeyFramesPrintLayout>('2-up-portrait');

  if (!isOpen) return null;

  const handleExport = () => {
    onExportPDF(layout);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="print-key-frames-title">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="print-key-frames-title" className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileDown className="w-5 h-5" aria-hidden />
            Export key frames to PDF
          </h2>
          {keyFrameCount === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              No key frames. Mark frames as key frames (star) in the filmstrip first.
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {keyFrameCount} key frame{keyFrameCount !== 1 ? 's' : ''} will be exported to PDF.
            </p>
          )}
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Page layout
            </label>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value as KeyFramesPrintLayout)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded"
              aria-label="Print layout"
            >
              {LAYOUT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={keyFrameCount === 0 || isExporting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

export { LAYOUT_OPTIONS };
