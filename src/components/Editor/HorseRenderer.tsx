import React from 'react';
import { Group, Path, Text, Arrow, Circle } from 'react-konva';
import { Horse, GAIT_COLORS, Gait } from '../../types';
import { ARENA_LENGTH, ARENA_WIDTH } from '../../constants/arena';
import {
  HORSE_LENGTH_METERS,
  HORSE_WIDTH_RATIO,
  ARROW_LENGTH_MULTIPLIERS,
  ARROW_HANDLE_RADIUS,
  HORSE_RENDERING,
  HORSE_LABEL,
} from '../../constants/horse';

// Horse silhouette path from Horse.svg (viewBox -212.542 110.522 1065.969 365.187)
const HORSE_PATH_DATA =
  'M 537.951 216.807 C 585.024 226.56 761.181 257.962 761.181 257.962 L 822.974 254.781 L 804.582 274.782 C 821.156 290.366 810.048 341.702 802.224 332.451 L 816.372 355.108 L 763.78 345.13 C 631.285 354.036 543.305 376.883 536.417 383.699 C 495.712 423.974 428.589 422.705 371.408 412.258 C 324.677 430.605 256.642 429.395 193.429 433.026 C 138.091 436.204 94.694 427.276 49.836 423.107 C -5.129 433.835 -85.561 451.053 -134.944 401.671 C -190.914 345.702 -188.299 254.981 -136.579 203.27 C -91.151 157.837 -15.489 173.535 49.17 183.844 C 91.351 170.019 136.987 168.292 190.235 170.198 C 257.083 172.59 315.173 184.09 367.006 192.198 C 442.701 158.264 514.048 191.292 537.951 216.807 Z';
const HORSE_PATH_VIEWBOX_WIDTH = 1065.969;
const HORSE_PATH_VIEWBOX_HEIGHT = 365.187;
const HORSE_PATH_VIEWBOX_CX = -212.542 + HORSE_PATH_VIEWBOX_WIDTH / 2;
const HORSE_PATH_VIEWBOX_CY = 110.522 + HORSE_PATH_VIEWBOX_HEIGHT / 2;

/** Horse fill color in dark mode (palomino) */
const DARK_MODE_HORSE_COLOR = '#D4A84B';

import {
  calculateDirectionAndSpeedFromDrag,
  calculateArrowEndPosition,
  stopEventPropagation,
} from '../../utils/horseRendering';
import { useThemeStore } from '../../stores/themeStore';

interface HorseRendererProps {
  horse: Horse;
  x: number;
  y: number;
  isSelected: boolean;
  /** When true, show highlight style (e.g. player mode focus) */
  isHighlighted?: boolean;
  /** When false, use a single color for all horses (e.g. in player view). Default true = color by gait */
  useGaitColor?: boolean;
  /** Scale factor for horse and label size (e.g. 1.5 = 50% larger). Default 1 */
  scale?: number;
  showArrow: boolean;
  onDrag: (x: number, y: number) => void;
  onDragStart?: () => void;
  onDragMove?: (x: number, y: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick: (e: any) => void; // Konva event, not React.MouseEvent
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
  isHighlighted = false,
  useGaitColor = true,
  scale = 1,
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
  const theme = useThemeStore((state) => state.theme);
  const horseFillColor =
    theme === 'dark'
      ? DARK_MODE_HORSE_COLOR
      : useGaitColor
        ? GAIT_COLORS[horse.speed]
        : '#6B7280';

  // Track if an actual drag occurred (mouse moved after mousedown)
  const hasDraggedRef = React.useRef<boolean>(false);
  const dragStartPosRef = React.useRef<{ x: number; y: number } | null>(null);
  
  // Track CTRL key state for snapping during arrow drag
  const ctrlKeyPressedRef = React.useRef<boolean>(false);
  
  // Track keyboard state for CTRL key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        ctrlKeyPressedRef.current = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        ctrlKeyPressedRef.current = false;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragStart = (e: any) => {
    hasDraggedRef.current = false;
    // Store the initial position to detect if mouse actually moved
    const node = e.target;
    dragStartPosRef.current = { x: node.x(), y: node.y() };
    
    if (onDragStart) {
      onDragStart();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragMove = (e: any) => {
    const node = e.target;
    const nativeEvent = e.evt || e;
    
    // Check if mouse button is actually pressed by checking the event
    // For mousemove events, use 'buttons' (plural) which is a bitmask
    // 0 = no buttons, 1 = left button, 2 = right button, 4 = middle button, etc.
    const buttons = nativeEvent.buttons !== undefined ? nativeEvent.buttons : 
                    (nativeEvent.which !== undefined && nativeEvent.which > 0 ? 1 : 0);
    
    // If mouse button is not pressed (buttons === 0), stop the drag
    // This prevents the horse from moving when you release the mouse and then move the cursor
    if (buttons === 0) {
      node.stopDrag();
      if (dragStartPosRef.current) {
        node.position(dragStartPosRef.current);
      }
      hasDraggedRef.current = false;
      return;
    }
    
    // Mark as dragged and update position
    hasDraggedRef.current = true;
    if (onDragMove) {
      onDragMove(node.x(), node.y());
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Convert meters to pixels based on canvas dimensions
  // Canvas width represents ARENA_LENGTH (80m), canvas height represents ARENA_WIDTH (40m)
  // Use the average of both dimensions for a more consistent size
  const metersPerPixelX = ARENA_LENGTH / canvasWidth; // meters per pixel in X direction
  const metersPerPixelY = ARENA_WIDTH / canvasHeight; // meters per pixel in Y direction
  const metersPerPixel = (metersPerPixelX + metersPerPixelY) / 2; // average for consistent sizing
  
  const horseLength = HORSE_LENGTH_METERS / metersPerPixel;
  const horseWidth = horseLength * HORSE_WIDTH_RATIO;
  const effectiveHorseLength = horseLength * scale;
  const effectiveHorseWidth = horseWidth * scale;

  // Calculate arrow length based on speed (gait)
  const baseArrowLength = horseLength * ARROW_LENGTH_MULTIPLIERS[horse.speed];
  
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleArrowDragStart = (e: any) => {
    stopEventPropagation(e);
    if (onArrowDragStart) {
      onArrowDragStart();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleArrowDragMove = (e: any) => {
    stopEventPropagation(e);
    
    if (!onArrowDragMove) return;
    
    // Check if CTRL key is pressed (use tracked state as fallback)
    const nativeEvent = e.evt || e;
    const shouldSnap = nativeEvent.ctrlKey || nativeEvent.metaKey || ctrlKeyPressedRef.current;
    
    // Get the new local position of the circle (in horse's local coordinate system)
    const node = e.target;
    const { direction, speed } = calculateDirectionAndSpeedFromDrag(
      node.x(),
      node.y(),
      horse.direction,
      horseLength,
      shouldSnap
    );
    
    onArrowDragMove(direction, speed);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleArrowDragEnd = (e: any) => {
    stopEventPropagation(e);
    
    if (!onArrowDrag) return;
    
    // Check if CTRL key is pressed (use tracked state as fallback)
    const nativeEvent = e.evt || e;
    const shouldSnap = nativeEvent.ctrlKey || nativeEvent.metaKey || ctrlKeyPressedRef.current;
    
    // Get the new local position of the circle (in horse's local coordinate system)
    const node = e.target;
    const { direction, speed } = calculateDirectionAndSpeedFromDrag(
      node.x(),
      node.y(),
      horse.direction,
      horseLength,
      shouldSnap
    );
    
    onArrowDrag(direction, speed);
    
    // Snap the handle back to the calculated arrow end position
    const arrowEndPos = calculateArrowEndPosition(horseLength, speed);
    
    // Reset handle position to the arrow end (in local coordinates)
    // Use setTimeout to ensure this happens after the drag event completes
    setTimeout(() => {
      node.position(arrowEndPos);
    }, 0);
  };

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
      {/* Horse silhouette from Horse.svg */}
      <Path
        data={HORSE_PATH_DATA}
        x={0}
        y={0}
        offsetX={HORSE_PATH_VIEWBOX_CX}
        offsetY={HORSE_PATH_VIEWBOX_CY}
        scaleX={effectiveHorseLength / HORSE_PATH_VIEWBOX_WIDTH}
        scaleY={effectiveHorseWidth / HORSE_PATH_VIEWBOX_HEIGHT}
        fill={horseFillColor}
        stroke={isHighlighted ? '#F59E0B' : isSelected ? HORSE_RENDERING.SELECTED_STROKE_COLOR : HORSE_RENDERING.DEFAULT_STROKE_COLOR}
        strokeWidth={isHighlighted ? 4 : isSelected ? HORSE_RENDERING.SELECTED_STROKE_WIDTH : HORSE_RENDERING.DEFAULT_STROKE_WIDTH}
        opacity={HORSE_RENDERING.OPACITY}
      />

      {/* Horse Label - centered on the horse body */}
      <Text
        text={String(horse.label)}
        fontSize={Math.max(HORSE_LABEL.MIN_FONT_SIZE, Math.min(HORSE_LABEL.MAX_FONT_SIZE, effectiveHorseWidth * HORSE_LABEL.WIDTH_RATIO))}
        fontStyle="bold"
        fill={HORSE_LABEL.TEXT_COLOR}
        align="center"
        verticalAlign="middle"
        x={0}
        y={0}
        width={effectiveHorseWidth * HORSE_LABEL.WIDTH_RATIO}
        height={effectiveHorseWidth * HORSE_LABEL.HEIGHT_RATIO}
        rotation={-rotationDegrees}
        offsetX={effectiveHorseWidth * (HORSE_LABEL.WIDTH_RATIO / 2)}
        offsetY={effectiveHorseWidth * (HORSE_LABEL.HEIGHT_RATIO / 2)}
      />

      {/* Direction Arrow */}
      {showArrow && (
        <>
          <Arrow
            points={[arrowStartX, arrowStartY, arrowEndX, arrowEndY]}
            stroke={theme === 'dark' ? '#FFFFFF' : HORSE_RENDERING.ARROW_COLOR}
            strokeWidth={HORSE_RENDERING.ARROW_STROKE_WIDTH}
            fill={theme === 'dark' ? '#FFFFFF' : HORSE_RENDERING.ARROW_COLOR}
            pointerLength={HORSE_RENDERING.ARROW_POINTER_LENGTH}
            pointerWidth={HORSE_RENDERING.ARROW_POINTER_WIDTH}
            listening={false}
          />
          {/* Invisible draggable handle at arrow end - allows dragging the arrow tip */}
          <Circle
            x={arrowEndX}
            y={arrowEndY}
            radius={ARROW_HANDLE_RADIUS}
            fill="transparent"
            stroke="transparent"
            draggable={draggable}
            onDragStart={handleArrowDragStart}
            onDragMove={handleArrowDragMove}
            onDragEnd={handleArrowDragEnd}
            onClick={stopEventPropagation}
            onTap={stopEventPropagation}
          />
        </>
      )}
    </Group>
  );
}

