import { Frame } from '../../types';
import KeyFramePrintView from './KeyFramePrintView';
import type { KeyFramesPrintLayout } from './PrintKeyFramesDialog';
import { CARDS_PER_PAGE, CARD_SIZE } from './printLayoutConstants';

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
            width: layout === '1-up-landscape' ? '297mm' : '210mm',
            height: layout === '1-up-landscape' ? '210mm' : '297mm',
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
