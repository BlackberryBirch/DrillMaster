import { forwardRef } from 'react';
import { Stage, Layer, Rect, Line, Text } from 'react-konva';
import type Konva from 'konva';
import { Frame } from '../../types';
import { getGridLines, pointToCanvas } from '../../utils/arena';
import HorseRenderer from '../Editor/HorseRenderer';

const MANEUVER_LABEL_HEIGHT = 22;
const NOOP = () => {};

interface KeyFramePrintViewProps {
  frame: Frame;
  width: number;
  height: number;
  /** Arena fills width x (height - MANEUVER_LABEL_HEIGHT); label below. */
}

const KeyFramePrintView = forwardRef<Konva.Stage, KeyFramePrintViewProps>(function KeyFramePrintView(
  { frame, width, height },
  ref
) {
  const arenaHeight = height - MANEUVER_LABEL_HEIGHT;
  const gridLines = getGridLines();
  const arenaBg = '#F5F5DC';
  const gridColor = '#999999';

  return (
    <Stage ref={ref} width={width} height={height} listening={false}>
      <Layer listening={false}>
        {/* Arena */}
        <Rect
          x={0}
          y={0}
          width={width}
          height={arenaHeight}
          fill={arenaBg}
          stroke="#CCCCCC"
          strokeWidth={1}
        />
        {gridLines.vertical.map((ratio, i) => (
          <Line
            key={`v-${i}`}
            points={[width * ratio, 0, width * ratio, arenaHeight]}
            stroke={gridColor}
            strokeWidth={0.5}
            dash={[4, 4]}
          />
        ))}
        {gridLines.horizontal.map((ratio, i) => (
          <Line
            key={`h-${i}`}
            points={[0, arenaHeight * ratio, width, arenaHeight * ratio]}
            stroke={gridColor}
            strokeWidth={0.5}
            dash={[4, 4]}
          />
        ))}
        {/* Horses */}
        {frame.horses.map((horse) => {
          const pos = pointToCanvas(horse.position, width, arenaHeight);
          return (
            <HorseRenderer
              key={horse.id}
              horse={horse}
              x={pos.x}
              y={pos.y}
              isSelected={false}
              showArrow={true}
              onDrag={NOOP}
              onClick={NOOP}
              draggable={false}
              canvasWidth={width}
              canvasHeight={arenaHeight}
            />
          );
        })}
        {/* Maneuver name below arena */}
        {frame.maneuverName && (
          <Text
            x={width / 2}
            y={arenaHeight + 4}
            width={width}
            text={frame.maneuverName}
            fontSize={12}
            fontFamily="sans-serif"
            fill="#374151"
            align="center"
            listening={false}
            offsetX={width / 2}
            offsetY={0}
          />
        )}
      </Layer>
    </Stage>
  );
});

export default KeyFramePrintView;
