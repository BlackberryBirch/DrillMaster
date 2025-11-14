import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Line, Circle } from 'react-konva';
import { Frame } from '../../types';
import { getGridLines, pointToCanvas } from '../../utils/arena';
import { GAIT_COLORS } from '../../types';
import { useThemeStore } from '../../stores/themeStore';

interface FrameThumbnailProps {
  frame: Frame;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

const THUMBNAIL_WIDTH = 120;
const THUMBNAIL_HEIGHT = 90;

export default function FrameThumbnail({
  frame,
  index,
  isSelected,
  onClick,
}: FrameThumbnailProps) {
  const [canvasSize, setCanvasSize] = useState({ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT });
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    }
  }, []);

  const gridLines = getGridLines();
  const arenaBgColor = theme === 'dark' ? '#2D2D2D' : '#F5F5DC';
  const gridLineColor = theme === 'dark' ? '#555555' : '#999999';

  return (
    <div
      ref={containerRef}
      className={`flex-shrink-0 cursor-pointer border-2 rounded relative ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-white hover:border-gray-400'
      }`}
      onClick={onClick}
      style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
    >
      <Stage width={canvasSize.width} height={canvasSize.height}>
        <Layer>
          {/* Arena Background */}
          <Rect
            x={0}
            y={0}
            width={canvasSize.width}
            height={canvasSize.height}
            fill={arenaBgColor}
            stroke={theme === 'dark' ? '#444444' : '#CCCCCC'}
            strokeWidth={1}
          />

          {/* Grid Lines */}
          {gridLines.vertical.map((ratio, i) => (
            <Line
              key={`v-${i}`}
              points={[
                canvasSize.width * ratio,
                0,
                canvasSize.width * ratio,
                canvasSize.height,
              ]}
              stroke={gridLineColor}
              strokeWidth={0.5}
            />
          ))}
          {gridLines.horizontal.map((ratio, i) => (
            <Line
              key={`h-${i}`}
              points={[
                0,
                canvasSize.height * ratio,
                canvasSize.width,
                canvasSize.height * ratio,
              ]}
              stroke={gridLineColor}
              strokeWidth={0.5}
            />
          ))}

          {/* Horses */}
          {frame.horses.map((horse) => {
            const pos = pointToCanvas(
              horse.position,
              canvasSize.width,
              canvasSize.height
            );
            return (
              <Circle
                key={horse.id}
                x={pos.x}
                y={pos.y}
                radius={4}
                fill={GAIT_COLORS[horse.speed]}
                stroke="#000000"
                strokeWidth={0.5}
              />
            );
          })}
        </Layer>
      </Stage>
      <div className="absolute bottom-0 left-0 right-0 bg-black dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-70 text-white text-xs text-center py-1">
        {index + 1}
      </div>
    </div>
  );
}

