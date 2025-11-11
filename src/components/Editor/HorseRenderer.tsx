import { Group, Ellipse, Path, Text, Arrow } from 'react-konva';
import { Horse, GAIT_COLORS } from '../../types';
import { ARENA_LENGTH, ARENA_WIDTH } from '../../constants/arena';

interface HorseRendererProps {
  horse: Horse;
  x: number;
  y: number;
  isSelected: boolean;
  showArrow: boolean;
  onDrag: (x: number, y: number) => void;
  onDragStart?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onClick: (e: any) => void;
  draggable?: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export default function HorseRenderer({
  horse,
  x,
  y,
  isSelected,
  showArrow,
  onDrag,
  onDragStart,
  onDragMove,
  onClick,
  draggable = true,
  canvasWidth,
  canvasHeight,
}: HorseRendererProps) {
  const handleDragStart = () => {
    if (onDragStart) {
      onDragStart();
    }
  };

  const handleDragMove = (e: any) => {
    // During drag, update positions in real-time
    const node = e.target;
    if (onDragMove) {
      onDragMove(node.x(), node.y());
    }
  };

  const handleDragEnd = (e: any) => {
    // When dragging ends, Konva has already updated the node's position
    // e.target.x() and e.target.y() give the position relative to the parent Group
    // The parent Group's coordinate system IS the arena coordinate system (0 to width/height)
    // The parent's position (offsetX + pan.x, offsetY + pan.y) and scale (zoom) are just
    // visual transforms - they don't affect the coordinate system of child nodes
    // So we can use the position directly
    const node = e.target;
    onDrag(node.x(), node.y());
  };

  // Horse length is approximately 2.3 meters (nose to tail)
  const HORSE_LENGTH_METERS = 2.3;

  // Convert meters to pixels based on canvas dimensions
  // Canvas width represents ARENA_LENGTH (80m), canvas height represents ARENA_WIDTH (40m)
  // Use the average of both dimensions for a more consistent size
  const metersPerPixelX = ARENA_LENGTH / canvasWidth; // meters per pixel in X direction
  const metersPerPixelY = ARENA_WIDTH / canvasHeight; // meters per pixel in Y direction
  const metersPerPixel = (metersPerPixelX + metersPerPixelY) / 2; // average for consistent sizing
  
  const horseLength = HORSE_LENGTH_METERS / metersPerPixel;
  const horseWidth = horseLength * 0.4; // Horse width is about 40% of length
  const arrowLength = horseLength * 1.5; // Arrow length is 1.5x the horse length
  
  // Convert direction from radians to degrees for rotation
  const rotationDegrees = (horse.direction * 180) / Math.PI;
  
  // Arrow points are relative to the horse's coordinate system (which will be rotated)
  // Since the Group rotates, the arrow should point straight up (0 degrees in local coords)
  // Front of horse is at (horseLength/2, 0) in local coordinates
  const arrowStartX = horseLength / 2; // Front of horse (nose)
  const arrowStartY = 0;
  const arrowEndX = horseLength / 2 + arrowLength; // Arrow extends forward
  const arrowEndY = 0;

  return (
          <Group
            x={x}
            y={y}
            rotation={rotationDegrees}
            draggable={draggable}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onClick={onClick}
            onTap={onClick}
          >
      {/* Horse Body - Main ellipse */}
      <Ellipse
        x={0}
        y={0}
        radiusX={horseLength / 2}
        radiusY={horseWidth / 2}
        fill={GAIT_COLORS[horse.speed]}
        stroke={isSelected ? '#F97316' : '#000000'}
        strokeWidth={isSelected ? 3 : 1}
        opacity={0.8}
      />

      {/* Horse Head - Smaller ellipse at front */}
      <Ellipse
        x={horseLength / 2 - horseLength * 0.1}
        y={0}
        radiusX={horseLength * 0.15}
        radiusY={horseWidth * 0.25}
        fill={GAIT_COLORS[horse.speed]}
        stroke={isSelected ? '#F97316' : '#000000'}
        strokeWidth={isSelected ? 3 : 1}
        opacity={0.8}
      />

      {/* Horse Tail - Small triangle at back */}
      <Path
        data={`M ${-horseLength / 2},0 L ${-horseLength / 2 - horseLength * 0.1},${-horseWidth * 0.15} L ${-horseLength / 2 - horseLength * 0.1},${horseWidth * 0.15} Z`}
        fill={GAIT_COLORS[horse.speed]}
        stroke={isSelected ? '#F97316' : '#000000'}
        strokeWidth={isSelected ? 3 : 1}
        opacity={0.8}
      />

      {/* Horse Label - centered on the horse body */}
      <Text
        text={String(horse.label)}
        fontSize={Math.max(8, Math.min(14, horseWidth * 0.6))}
        fontStyle="bold"
        fill="#FFFFFF"
        align="center"
        verticalAlign="middle"
        x={0}
        y={0}
        width={horseWidth * 0.6}
        height={horseWidth * 0.6}
        rotation={-rotationDegrees}
        offsetX={horseWidth * 0.3}
        offsetY={horseWidth * 0.3}
      />

      {/* Direction Arrow */}
      {showArrow && (
        <Arrow
          points={[arrowStartX, arrowStartY, arrowEndX, arrowEndY]}
          stroke="#333333"
          strokeWidth={2}
          fill="#333333"
          pointerLength={8}
          pointerWidth={6}
        />
      )}
    </Group>
  );
}

