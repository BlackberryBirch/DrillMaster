import {
  Document,
  Page,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { KeyFramesPrintLayout } from './PrintKeyFramesDialog';
import { CARDS_PER_PAGE } from './printLayoutConstants';

const styles = StyleSheet.create({
  page: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  frameWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
});

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

interface KeyFramesPDFDocumentProps {
  imageDataUrls: string[];
  layout: KeyFramesPrintLayout;
}

export default function KeyFramesPDFDocument({
  imageDataUrls,
  layout,
}: KeyFramesPDFDocumentProps) {
  const perPage = CARDS_PER_PAGE[layout];
  const pages = chunk(imageDataUrls, perPage);
  const isLandscape = layout === '1-up-landscape';
  const cols = layout === '1-up-landscape' ? 1 : layout === '2-up-portrait' ? 1 : layout === '4-up-portrait' ? 2 : layout === '9-up-portrait' ? 3 : 4;
  const rows = layout === '1-up-landscape' ? 1 : layout === '2-up-portrait' ? 2 : layout === '4-up-portrait' ? 2 : layout === '9-up-portrait' ? 3 : 4;
  const cellWidthPercent = 100 / cols;

  return (
    <Document>
      {pages.map((pageImages, pageIndex) => (
        <Page
          key={pageIndex}
          size="A4"
          orientation={isLandscape ? 'landscape' : 'portrait'}
          style={styles.page}
        >
          <View style={{ flex: 1, gap: 8 }}>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {Array.from({ length: cols }).map((_, colIndex) => {
                  const i = rowIndex * cols + colIndex;
                  const dataUrl = pageImages[i];
                  return (
                    <View
                      key={i}
                      style={[
                        styles.frameWrapper,
                        {
                          width: `${cellWidthPercent}%`,
                          flexGrow: 0,
                          flexShrink: 0,
                        },
                      ]}
                    >
                      {dataUrl && <Image src={dataUrl} style={styles.frameImage} />}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}
