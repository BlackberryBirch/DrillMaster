import { useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { pdf } from '@react-pdf/renderer';
import { Frame } from '../types';
import KeyFramePrintView from '../components/Print/KeyFramePrintView';
import KeyFramesPDFDocument from '../components/Print/KeyFramesPDFDocument';
import type { KeyFramesPrintLayout } from '../components/Print/PrintKeyFramesDialog';
import { CARD_SIZE, ROTATED_ARENA_LAYOUTS } from '../components/Print/printLayoutConstants';

/** Captures a single key frame to a data URL by rendering it off-screen. */
async function captureFrameToDataUrl(
  frame: Frame,
  layout: KeyFramesPrintLayout
): Promise<string> {
  const { width, height } = CARD_SIZE[layout];
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;';
  document.body.appendChild(container);

  const root = createRoot(container);
  const stageRef = { current: null as { toDataURL: (config?: object) => string } | null };

  const arenaRotated90CCW = ROTATED_ARENA_LAYOUTS.includes(layout);

  return new Promise((resolve, reject) => {
    const CaptureWrapper = () => {
      return (
        <KeyFramePrintView
          ref={(el) => {
            if (el) stageRef.current = el;
          }}
          frame={frame}
          width={width}
          height={height}
          arenaRotated90CCW={arenaRotated90CCW}
        />
      );
    };

    root.render(<CaptureWrapper />);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const stage = stageRef.current;
          if (!stage) {
            reject(new Error('Stage ref not available'));
            return;
          }
          const dataUrl = stage.toDataURL({ pixelRatio: 2 });
          root.unmount();
          document.body.removeChild(container);
          resolve(dataUrl);
        } catch (err) {
          root.unmount();
          if (container.parentNode) document.body.removeChild(container);
          reject(err);
        }
      });
    });
  });
}

export function useExportKeyFramesPDF() {
  const exportToPDF = useCallback(
    async (
      keyFrames: Frame[],
      layout: KeyFramesPrintLayout,
      filename = 'key-frames.pdf'
    ): Promise<void> => {
      if (keyFrames.length === 0) return;

      const imageDataUrls: string[] = [];
      for (const frame of keyFrames) {
        const dataUrl = await captureFrameToDataUrl(frame, layout);
        imageDataUrls.push(dataUrl);
      }

      const doc = <KeyFramesPDFDocument imageDataUrls={imageDataUrls} layout={layout} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    []
  );

  return { exportToPDF };
}
