import { Frame } from '../../types';
import KeyFramePrintView from './KeyFramePrintView';
import type { KeyFramesPrintLayout } from './PrintKeyFramesDialog';

const CARDS_PER_PAGE: Record<KeyFramesPrintLayout, number> = {
  '1-up-landscape': 1,
  '2-up-portrait': 2,
  '4-up-portrait': 4,
  '9-up-portrait': 9,
};

/** Card size in pixels (width, height) per layout for print. */
const CARD_SIZE: Record<KeyFramesPrintLayout, { width: number; height: number }> = {
  '1-up-landscape': { width: 700, height: 400 },
  '2-up-portrait': { width: 400, height: 420 },
  '4-up-portrait': { width: 320, height: 280 },
  '9-up-portrait': { width: 240, height: 220 },
};

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

interface KeyFramesPrintSheetProps {
  keyFrames: Frame[];
  layout: KeyFramesPrintLayout;
}

export default function KeyFramesPrintSheet({ keyFrames, layout }: KeyFramesPrintSheetProps) {
  const perPage = CARDS_PER_PAGE[layout];
  const { width: cardWidth, height: cardHeight } = CARD_SIZE[layout];
  const pages = chunk(keyFrames, perPage);

  return (
    <div
      className={`print-key-frames-container print-layout-${layout}`}
      data-layout={layout}
      role="document"
      aria-label="Key frames for printing"
    >
      {pages.map((pageFrames, pageIndex) => (
        <div
          key={pageIndex}
          className="print-page"
          style={{
            display: 'grid',
            gridTemplateColumns: layout === '1-up-landscape' ? '1fr' : layout === '2-up-portrait' ? '1fr' : layout === '4-up-portrait' ? '1fr 1fr' : '1fr 1fr 1fr',
            gridTemplateRows: layout === '1-up-landscape' ? '1fr' : layout === '2-up-portrait' ? '1fr 1fr' : layout === '4-up-portrait' ? '1fr 1fr' : '1fr 1fr 1fr',
            gap: 8,
            padding: 12,
            boxSizing: 'border-box',
            width: layout === '1-up-landscape' ? '100%' : '210mm',
            height: layout === '1-up-landscape' ? '100%' : '297mm',
            minHeight: layout === '2-up-portrait' ? '297mm' : layout === '4-up-portrait' || layout === '9-up-portrait' ? '297mm' : undefined,
          }}
        >
          {pageFrames.map((frame) => (
            <div
              key={frame.id}
              className="print-card"
              style={{
                width: '100%',
                height: '100%',
                minHeight: layout === '2-up-portrait' ? '140mm' : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <KeyFramePrintView frame={frame} width={cardWidth} height={cardHeight} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
