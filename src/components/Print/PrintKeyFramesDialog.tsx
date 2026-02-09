import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Frame } from '../../types';
import KeyFramesPrintSheet from './KeyFramesPrintSheet';
import { CARDS_PER_PAGE } from './printLayoutConstants';

export type KeyFramesPrintLayout = '1-up-landscape' | '2-up-portrait' | '4-up-portrait' | '9-up-portrait' | '16-up-portrait';

const LAYOUT_OPTIONS: { value: KeyFramesPrintLayout; label: string }[] = [
  { value: '1-up-landscape', label: '1 per page (landscape)' },
  { value: '2-up-portrait', label: '2 per page (portrait)' },
  { value: '4-up-portrait', label: '4 per page (portrait)' },
  { value: '9-up-portrait', label: '9 per page (portrait)' },
  { value: '16-up-portrait', label: '16 per page (portrait)' },
];

export type FramesMode = 'key' | 'all';

interface PrintKeyFramesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: (layout: KeyFramesPrintLayout, frames: Frame[], framesMode: FramesMode) => void;
  keyFrames: Frame[];
  allFrames: Frame[];
  isExporting?: boolean;
}

export default function PrintKeyFramesDialog({
  isOpen,
  onClose,
  onExportPDF,
  keyFrames,
  allFrames,
  isExporting = false,
}: PrintKeyFramesDialogProps) {
  const [layout, setLayout] = useState<KeyFramesPrintLayout>('2-up-portrait');
  const [framesMode, setFramesMode] = useState<FramesMode>('key');
  const framesToExport = framesMode === 'all' ? allFrames : keyFrames;
  const frameCount = framesToExport.length;

  if (!isOpen) return null;

  const handleExport = () => {
    onExportPDF(layout, framesToExport, framesMode);
  };

  const perPage = CARDS_PER_PAGE[layout];
  const previewPages = (() => {
    const pages: Frame[][] = [];
    for (let i = 0; i < framesToExport.length; i += perPage) {
      pages.push(framesToExport.slice(i, i + perPage));
    }
    return pages;
  })();
  const previewScale = 0.28;
  const MM_TO_PX = 3.78;
  const isLandscape = layout === '1-up-landscape';
  const pageWidthPx = (isLandscape ? 297 : 210) * MM_TO_PX * previewScale;
  const pageHeightPx = (isLandscape ? 210 : 297) * MM_TO_PX * previewScale;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="print-key-frames-title">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl flex max-w-4xl w-[90vw] max-h-[90vh] overflow-hidden">
        <div
          className="flex-shrink-0 w-72 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
          aria-label="Layout preview"
        >
          <div className="p-2 text-sm font-medium text-gray-700 dark:text-gray-300">Preview</div>
          <div
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 flex flex-col items-center gap-4"
            style={{ scrollbarGutter: 'stable' }}
          >
            {frameCount > 0 && previewPages.length > 0 ? (
              previewPages.map((pageFrames, pageIndex) => (
                <div
                  key={pageIndex}
                  className="bg-white rounded shadow-sm flex-shrink-0 overflow-hidden"
                  style={{
                    width: pageWidthPx,
                    height: pageHeightPx,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  }}
                >
                  <div
                    style={{
                      transform: `scale(${previewScale})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <KeyFramesPrintSheet keyFrames={pageFrames} layout={layout} />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-gray-500 dark:text-gray-400">
                {framesMode === 'all' ? 'No frames' : 'No key frames'}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col min-w-[280px]">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="print-key-frames-title" className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileDown className="w-5 h-5" aria-hidden />
            Export key frames to PDF
          </h2>
          {frameCount === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              {framesMode === 'all' ? 'No frames in this drill.' : 'No key frames. Mark frames as key frames (star) in the filmstrip first.'}
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {frameCount} frame{frameCount !== 1 ? 's' : ''} will be exported to PDF.
            </p>
          )}
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frames to export
            </label>
            <select
              value={framesMode}
              onChange={(e) => setFramesMode(e.target.value as FramesMode)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded mb-4"
              aria-label="Frames to export"
            >
              <option value="key">Key frames only</option>
              <option value="all">All frames</option>
            </select>
          </div>
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
            disabled={frameCount === 0 || isExporting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

export { LAYOUT_OPTIONS };
