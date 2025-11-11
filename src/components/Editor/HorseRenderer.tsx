import { Group, Circle, Text, Arrow } from 'react-konva';
import { Horse, GAIT_COLORS } from '../../types';

interface HorseRendererProps {
  horse: Horse;
  x: number;
  y: number;
  isSelected: boolean;
  showArrow: boolean;
  onDrag: (x: number, y: number) => void;
  onClick: (e: any) => void;
  draggable?: boolean;
}

export default function HorseRenderer({
  horse,
  x,
  y,
  isSelected,
  showArrow,
  onDrag,
  onClick,
  draggable = true,
}: HorseRendererProps) {
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

  const arrowLength = 30;
  const arrowEndX = x + Math.cos(horse.direction) * arrowLength;
  const arrowEndY = y - Math.sin(horse.direction) * arrowLength; // Negative because canvas Y is top-down

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      onTap={onClick}
    >
      {/* Horse Circle */}
      <Circle
        radius={12}
        fill={GAIT_COLORS[horse.speed]}
        stroke={isSelected ? '#F97316' : horse.locked ? '#A855F7' : '#000000'}
        strokeWidth={isSelected ? 3 : horse.locked ? 2 : 1}
        opacity={0.8}
      />

      {/* Horse Label */}
      <Text
        text={String(horse.label)}
        fontSize={10}
        fontStyle="bold"
        fill="#FFFFFF"
        align="center"
        verticalAlign="middle"
        x={-6}
        y={-6}
        width={12}
        height={12}
      />

      {/* Direction Arrow */}
      {showArrow && (
        <Arrow
          points={[0, 0, arrowEndX - x, arrowEndY - y]}
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

