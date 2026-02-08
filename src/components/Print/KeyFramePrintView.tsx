import { Stage, Layer, Rect, Line, Circle, Text } from 'react-konva';
import { Frame } from '../../types';
import { getGridLines, pointToCanvas } from '../../utils/arena';
import { GAIT_COLORS } from '../../types/gait';

const MANEUVER_LABEL_HEIGHT = 22;

interface KeyFramePrintViewProps {
  frame: Frame;
  width: number;
  height: number;
  /** Arena fills width x (height - MANEUVER_LABEL_HEIGHT); label below. */
}

export default function KeyFramePrintView({ frame, width, height }: KeyFramePrintViewProps) {
  const arenaHeight = height - MANEUVER_LABEL_HEIGHT;
  const gridLines = getGridLines();
  const arenaBg = '#F5F5DC';
  const gridColor = '#999999';

  return (
    <Stage width={width} height={height} listening={false}>
      <Layer>
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
            <Circle
              key={horse.id}
              x={pos.x}
              y={pos.y}
              radius={Math.max(3, Math.min(width, arenaHeight) / 80)}
              fill={GAIT_COLORS[horse.speed]}
              stroke="#333"
              strokeWidth={0.5}
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
}
