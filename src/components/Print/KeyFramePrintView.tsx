import { forwardRef } from 'react';
import { Stage, Layer, Rect, Line, Text, Circle } from 'react-konva';
import type Konva from 'konva';
import { Frame, Horse } from '../../types';
import { ARENA_LENGTH, ARENA_WIDTH } from '../../constants/arena';
import { getGridLines, pointToCanvas } from '../../utils/arena';
import HorseRenderer from '../Editor/HorseRenderer';

const MANEUVER_LABEL_HEIGHT = 22;
const NOOP = () => {};

/** Convert normalized arena coords to canvas when arena is rotated 90° CCW. */
function pointToCanvasRotated(
  point: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const normalizedX = (point.x / ARENA_LENGTH) + 0.5;
  const normalizedY = (point.y / ARENA_WIDTH) + 0.5;
  return {
    x: Math.max(0, Math.min(canvasWidth, normalizedY * canvasWidth)),
    y: Math.max(0, Math.min(canvasHeight, (1 - normalizedX) * canvasHeight)),
  };
}

/** Horse with direction rotated 90° CCW for rotated arena view. */
function withRotatedDirection(horse: Horse): Horse {
  return { ...horse, direction: horse.direction - Math.PI / 2 };
}

interface KeyFramePrintViewProps {
  frame: Frame;
  width: number;
  height: number;
  /** When true, arena is rotated 90° counter-clockwise (for 4/9/16-up). */
  arenaRotated90CCW?: boolean;
  /** Arena fills width x (height - MANEUVER_LABEL_HEIGHT); label below. */
}

const KeyFramePrintView = forwardRef<Konva.Stage, KeyFramePrintViewProps>(function KeyFramePrintView(
  { frame, width, height, arenaRotated90CCW = false },
  ref
) {
  const arenaHeight = height - MANEUVER_LABEL_HEIGHT;
  const gridLines = getGridLines();
  const arenaBg = '#F5F5DC';
  const gridColor = '#999999';

  const toCanvas = arenaRotated90CCW ? pointToCanvasRotated : pointToCanvas;

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
        {arenaRotated90CCW ? (
          <>
            {gridLines.vertical.map((ratio, i) => (
              <Line
                key={`h-${i}`}
                points={[0, (1 - ratio) * arenaHeight, width, (1 - ratio) * arenaHeight]}
                stroke={gridColor}
                strokeWidth={0.5}
                dash={[4, 4]}
              />
            ))}
            {gridLines.horizontal.map((ratio, i) => (
              <Line
                key={`v-${i}`}
                points={[width * ratio, 0, width * ratio, arenaHeight]}
                stroke={gridColor}
                strokeWidth={0.5}
                dash={[4, 4]}
              />
            ))}
          </>
        ) : (
          <>
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
          </>
        )}
        {/* 5m gate on left - two posts and dashed line */}
        {(() => {
          const gateWidthM = 5;
          const post1 = toCanvas({ x: -40, y: -gateWidthM / 2 }, width, arenaHeight);
          const post2 = toCanvas({ x: -40, y: gateWidthM / 2 }, width, arenaHeight);
          const postRadius = 3;
          return (
            <>
              <Circle
                x={post1.x + postRadius}
                y={post1.y}
                radius={postRadius}
                fill="#8B4513"
                stroke="#654321"
                strokeWidth={0.5}
                listening={false}
              />
              <Circle
                x={post2.x + postRadius}
                y={post2.y}
                radius={postRadius}
                fill="#8B4513"
                stroke="#654321"
                strokeWidth={0.5}
                listening={false}
              />
              <Line
                points={[post1.x + postRadius, post1.y, post2.x + postRadius, post2.y]}
                stroke={gridColor}
                strokeWidth={0.5}
                dash={[4, 4]}
                listening={false}
              />
            </>
          );
        })()}
        {/* Horses */}
        {frame.horses.map((horse) => {
          const pos = toCanvas(horse.position, width, arenaHeight);
          const horseToRender = arenaRotated90CCW ? withRotatedDirection(horse) : horse;
          return (
            <HorseRenderer
              key={horse.id}
              horse={horseToRender}
              x={pos.x}
              y={pos.y}
              isSelected={false}
              showArrow={false}
              scale={3}
              labelScale={3}
              labelColor="#000000"
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
