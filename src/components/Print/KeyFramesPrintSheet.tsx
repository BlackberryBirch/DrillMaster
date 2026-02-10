import { Frame } from '../../types';
import KeyFramePrintView from './KeyFramePrintView';
import type { KeyFramesPrintLayout } from './PrintKeyFramesDialog';
import { CARDS_PER_PAGE, CARD_SIZE, ROTATED_ARENA_LAYOUTS } from './printLayoutConstants';

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

function getGridConfig(layout: KeyFramesPrintLayout) {
  if (layout === '1-up-landscape') return { cols: '1fr', rows: '1fr' };
  if (layout === '2-up-portrait') return { cols: '1fr', rows: '1fr 1fr' };
  if (layout === '4-up-portrait') return { cols: '1fr 1fr', rows: '1fr 1fr' };
  if (layout === '9-up-portrait') return { cols: '1fr 1fr 1fr 1fr', rows: '1fr 1fr 1fr' };
  return { cols: '1fr 1fr 1fr 1fr', rows: '1fr 1fr 1fr 1fr' };
}

export default function KeyFramesPrintSheet({ keyFrames, layout }: KeyFramesPrintSheetProps) {
  const perPage = CARDS_PER_PAGE[layout];
  const { width: cardWidth, height: cardHeight } = CARD_SIZE[layout];
  const pages = chunk(keyFrames, perPage);
  const grid = getGridConfig(layout);
  const arenaRotated90CCW = ROTATED_ARENA_LAYOUTS.includes(layout);

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
            gridTemplateColumns: grid.cols,
            gridTemplateRows: grid.rows,
            gap: 8,
            padding: 12,
            boxSizing: 'border-box',
            width: layout === '1-up-landscape' ? '297mm' : '210mm',
            height: layout === '1-up-landscape' ? '210mm' : '297mm',
            minHeight: layout !== '1-up-landscape' ? '297mm' : undefined,
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
              <KeyFramePrintView frame={frame} width={cardWidth} height={cardHeight} arenaRotated90CCW={arenaRotated90CCW} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
