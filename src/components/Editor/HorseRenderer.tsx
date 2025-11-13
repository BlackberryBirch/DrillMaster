import React from 'react';
import { Group, Ellipse, Path, Text, Arrow, Circle } from 'react-konva';
import { Horse, GAIT_COLORS, Gait } from '../../types';
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
  onArrowDrag?: (direction: number, speed: Gait) => void;
  onArrowDragStart?: () => void;
  onArrowDragMove?: (direction: number, speed: Gait) => void;
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
  onArrowDrag,
  onArrowDragStart,
  onArrowDragMove,
  draggable = true,
  canvasWidth,
  canvasHeight,
}: HorseRendererProps) {
  // Track if an actual drag occurred (mouse moved after mousedown)
  const hasDraggedRef = React.useRef<boolean>(false);
  const dragStartPosRef = React.useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = (e: any) => {
    hasDraggedRef.current = false;
    // Store the initial position to detect if mouse actually moved
    const node = e.target;
    dragStartPosRef.current = { x: node.x(), y: node.y() };
    
    if (onDragStart) {
      onDragStart();
    }
  };

  const handleDragMove = (e: any) => {
    // During drag, update positions in real-time
    const node = e.target;
    
    // Check if mouse actually moved (not just a click)
    if (dragStartPosRef.current) {
      const dx = node.x() - dragStartPosRef.current.x;
      const dy = node.y() - dragStartPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Only consider it a drag if moved more than 3 pixels
      if (distance > 3) {
        hasDraggedRef.current = true;
      }
    }
    
    if (onDragMove) {
      onDragMove(node.x(), node.y());
    }
  };

  const handleDragEnd = (e: any) => {
    const node = e.target;
    const wasDrag = hasDraggedRef.current;
    const startPos = dragStartPosRef.current;
    
    // Only update position if an actual drag occurred (mouse moved)
    if (wasDrag) {
      // When dragging ends, Konva has already updated the node's position
      // e.target.x() and e.target.y() give the position relative to the parent Group
      // The parent Group's coordinate system IS the arena coordinate system (0 to width/height)
      // The parent's position (offsetX + pan.x, offsetY + pan.y) and scale (zoom) are just
      // visual transforms - they don't affect the coordinate system of child nodes
      // So we can use the position directly
      onDrag(node.x(), node.y());
    } else if (startPos) {
      // Reset node position if it was just a click (no drag)
      node.position(startPos);
    }
    
    // Reset drag state
    hasDraggedRef.current = false;
    dragStartPosRef.current = null;
  };

  // Horse length is approximately 2.3 meters (nose to tail)
  const HORSE_LENGTH_METERS = 2.7;

  // Convert meters to pixels based on canvas dimensions
  // Canvas width represents ARENA_LENGTH (80m), canvas height represents ARENA_WIDTH (40m)
  // Use the average of both dimensions for a more consistent size
  const metersPerPixelX = ARENA_LENGTH / canvasWidth; // meters per pixel in X direction
  const metersPerPixelY = ARENA_WIDTH / canvasHeight; // meters per pixel in Y direction
  const metersPerPixel = (metersPerPixelX + metersPerPixelY) / 2; // average for consistent sizing
  
  const horseLength = HORSE_LENGTH_METERS / metersPerPixel;
  const horseWidth = horseLength * 0.4; // Horse width is about 40% of length
  
  // Calculate arrow length based on speed (gait)
  // Walk: 1.0x, Trot: 1.5x, Canter: 2.0x horse length
  const speedMultipliers: Record<Gait, number> = {
    walk: 1.0,
    trot: 1.5,
    canter: 2.0,
  };
  const baseArrowLength = horseLength * speedMultipliers[horse.speed];
  
  // Convert direction from radians to degrees for rotation
  const rotationDegrees = (horse.direction * 180) / Math.PI;
  
  // Arrow points are relative to the horse's coordinate system (which will be rotated)
  // Since the Group rotates, the arrow should point straight up (0 degrees in local coords)
  // Front of horse is at (horseLength/2, 0) in local coordinates
  const arrowStartX = horseLength / 2; // Front of horse (nose)
  const arrowStartY = 0;
  const arrowEndX = horseLength / 2 + baseArrowLength; // Arrow extends forward
  const arrowEndY = 0;

  // Handle arrow end drag
  const handleArrowDragStart = (e: any) => {
    e.cancelBubble = true;
    if (e.evt) {
      e.evt.stopPropagation();
    }
    if (onArrowDragStart) {
      onArrowDragStart();
    }
  };

  const handleArrowDragMove = (e: any) => {
    e.cancelBubble = true;
    if (e.evt) {
      e.evt.stopPropagation();
    }
    
    if (!onArrowDragMove) return;
    
    // Get the new local position of the circle (in horse's local coordinate system)
    const node = e.target;
    const newLocalX = node.x();
    const newLocalY = node.y();
    
    // Calculate vector from horse center (0, 0 in local coords) to arrow end
    const dx = newLocalX;
    const dy = newLocalY;
    
    // Calculate direction in local coordinate system
    // In local coords: positive X = forward (the arrow points along +X axis)
    // The angle in local coords: atan2(dy, dx) gives angle from positive X axis
    // But in canvas, Y is flipped (positive Y is down), so we need to negate dy
    // The new world direction is the horse's current direction plus the local angle
    const localAngle = Math.atan2(dy, dx);
    const direction = horse.direction + localAngle;
    
    // Normalize to 0-2π range
    let normalizedDirection = direction;
    while (normalizedDirection < 0) normalizedDirection += 2 * Math.PI;
    while (normalizedDirection >= 2 * Math.PI) normalizedDirection -= 2 * Math.PI;
    
    // Calculate distance (arrow length)
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Determine speed based on distance
    // Thresholds based on horse length multipliers
    const walkThreshold = horseLength * 1.25; // Between 1.0x and 1.5x
    const trotThreshold = horseLength * 1.75; // Between 1.5x and 2.0x
    
    let speed: Gait;
    if (distance < walkThreshold) {
      speed = 'walk';
    } else if (distance < trotThreshold) {
      speed = 'trot';
    } else {
      speed = 'canter';
    }
    
    onArrowDragMove(normalizedDirection, speed);
  };

  const handleArrowDragEnd = (e: any) => {
    e.cancelBubble = true;
    if (e.evt) {
      e.evt.stopPropagation();
    }
    
    if (!onArrowDrag) return;
    
    // Get the new local position of the circle (in horse's local coordinate system)
    const node = e.target;
    const newLocalX = node.x();
    const newLocalY = node.y();
    
    // Calculate vector from horse center (0, 0 in local coords) to arrow end
    const dx = newLocalX;
    const dy = newLocalY;
    
    // Calculate direction in local coordinate system
    // In local coords: positive X = forward (the arrow points along +X axis)
    // But in canvas, Y is flipped (positive Y is down), so we need to negate dy
    const localAngle = Math.atan2(dy, dx);
    // The new world direction is the horse's current direction plus the local angle
    const direction = horse.direction + localAngle;
    
    // Normalize to 0-2π range
    let normalizedDirection = direction;
    while (normalizedDirection < 0) normalizedDirection += 2 * Math.PI;
    while (normalizedDirection >= 2 * Math.PI) normalizedDirection -= 2 * Math.PI;
    
    // Calculate distance (arrow length)
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Determine speed based on distance
    const walkThreshold = horseLength * 1.25;
    const trotThreshold = horseLength * 1.75;
    
    let speed: Gait;
    if (distance < walkThreshold) {
      speed = 'walk';
    } else if (distance < trotThreshold) {
      speed = 'trot';
    } else {
      speed = 'canter';
    }
    
    onArrowDrag(normalizedDirection, speed);
    
    // Snap the handle back to the calculated arrow end position
    // The arrow end in local coordinates is always along the +X axis (forward)
    // Calculate the new arrow end position based on the new speed
    const speedMultipliers: Record<Gait, number> = {
      walk: 1.0,
      trot: 1.5,
      canter: 2.0,
    };
    const newArrowLength = horseLength * speedMultipliers[speed];
    const newArrowEndX = horseLength / 2 + newArrowLength;
    const newArrowEndY = 0;
    
    // Reset handle position to the arrow end (in local coordinates)
    // Use setTimeout to ensure this happens after the drag event completes
    setTimeout(() => {
      node.position({ x: newArrowEndX, y: newArrowEndY });
    }, 0);
  };

  return (
          <Group
            x={x}
            y={y}
            rotation={rotationDegrees}
            draggable={draggable}
            dragDistance={3}
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
        <>
          <Arrow
            points={[arrowStartX, arrowStartY, arrowEndX, arrowEndY]}
            stroke="#333333"
            strokeWidth={2}
            fill="#333333"
            pointerLength={8}
            pointerWidth={6}
            listening={false}
          />
          {/* Invisible draggable handle at arrow end - allows dragging the arrow tip */}
          <Circle
            x={arrowEndX}
            y={arrowEndY}
            radius={8}
            fill="transparent"
            stroke="transparent"
            draggable={draggable}
            onDragStart={handleArrowDragStart}
            onDragMove={handleArrowDragMove}
            onDragEnd={handleArrowDragEnd}
            onClick={(e) => {
              e.cancelBubble = true;
              if (e.evt) {
                e.evt.stopPropagation();
              }
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              if (e.evt) {
                e.evt.stopPropagation();
              }
            }}
          />
        </>
      )}
    </Group>
  );
}

