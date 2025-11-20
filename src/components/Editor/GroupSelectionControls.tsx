import React from 'react';
import { Group, Circle, Line } from 'react-konva';
import { BoundingCircle } from '../../hooks/useGroupTransformations';

// Tracing utility (matches the one in useGroupTransformations)
const ENABLE_TRACING = false;
const trace = (category: string, message: string, data?: any) => {
  if (ENABLE_TRACING) {
    const timestamp = new Date().toISOString();
    const logData = data ? { ...data, timestamp } : { timestamp };
    console.log(`[GroupSelectionControls:${category}] ${message}`, logData);
  }
};

interface GroupSelectionControlsProps {
  onRotate: (pointerX: number, pointerY: number, centerX: number, centerY: number) => void;
  onRotateStart: () => void;
  onRotateEnd: () => void;
  onScale: (pointerX: number, pointerY: number, centerX: number, centerY: number) => void;
  onScaleStart: () => void;
  onScaleEnd: () => void;
  onRadialDistribute: () => void;
  getBoundingCircle: () => BoundingCircle;
  setDragging: (dragging: boolean) => void;
  theme: 'light' | 'dark';
}

export default function GroupSelectionControls({
  onRotate,
  onRotateStart,
  onRotateEnd,
  onScale,
  onScaleStart,
  onScaleEnd,
  onRadialDistribute,
  getBoundingCircle,
  setDragging,
  theme,
}: GroupSelectionControlsProps) {
  // Get bounding circle from hook (source of truth)
  const { center, radius } = getBoundingCircle();

  // Rotation handle position
  const rotationHandlePositionRef = React.useRef<{ x: number; y: number } | null>(null);

  // Scale handle position
  const scaleHandlePositionRef = React.useRef<{ x: number; y: number } | null>(null);

  // Handle rotation drag start
  const handleRotationDragStart = (e: any) => {
    trace('handleRotationDragStart', 'Called');
    setDragging(true);
    // Store initial handle position
    const node = e.target;
    rotationHandlePositionRef.current = { x: node.x(), y: node.y() };
    // Note: onRotateStart is a no-op now - initialization happens on first move
    onRotateStart();
  };

  // Handle rotation drag move
  const handleRotationDragMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    // Find the ArenaCanvas Group (the one with zoom/pan transform)
    // The hierarchy is: Stage -> Layer -> ArenaCanvas Group (zoom/pan) -> GroupSelectionControls Group -> Handle Group -> Handle
    // We need to get the transform from the ArenaCanvas Group
    const node = e.target;
    let current = node.getParent(); // Start at Handle Group
    
    // Walk up the parent chain to find the ArenaCanvas Group
    // It's the Group that is a direct child of the Layer
    while (current) {
      const parent = current.getParent();
      if (parent && parent.getClassName() === 'Layer') {
        // Found it! current is the ArenaCanvas Group
        break;
      }
      current = parent;
      if (!current) break;
    }
    
    if (!current) {
      trace('handleRotationDragMove', 'ERROR: Could not find ArenaCanvas Group');
      return;
    }
    
    // Get the transform from the ArenaCanvas Group to convert stage coordinates to canvas coordinates
    const transform = current.getAbsoluteTransform();
    const pointerInCanvas = transform.copy().invert().point(pointerPos);

    trace('handleRotationDragMove', 'Pointer transform', {
      pointerPos,
      pointerInCanvas,
      handleLocalPos: { x: node.x(), y: node.y() }
    });

    // Get current circle (stable during drag)
    const currentCircle = getBoundingCircle();

    // Pass pointer position and center to hook for angle calculation
    onRotate(pointerInCanvas.x, pointerInCanvas.y, currentCircle.center.x, currentCircle.center.y);
    
    // Reset handle position to keep it visually in place
    if (rotationHandlePositionRef.current) {
      node.position(rotationHandlePositionRef.current);
    }
  };

  // Handle rotation drag end
  const handleRotationDragEnd = () => {
    rotationHandlePositionRef.current = null;
    setDragging(false);
    onRotateEnd();
  };

  // Handle scale drag start
  const handleScaleDragStart = (e: any) => {
    trace('handleScaleDragStart', 'Called');
    setDragging(true);
    // Store initial handle position
    const node = e.target;
    scaleHandlePositionRef.current = { x: node.x(), y: node.y() };
    // Note: onScaleStart is a no-op now - initialization happens on first move
    onScaleStart();
  };

  // Handle scale drag move
  const handleScaleDragMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    // Find the ArenaCanvas Group (the one with zoom/pan transform)
    // The hierarchy is: Stage -> Layer -> ArenaCanvas Group (zoom/pan) -> GroupSelectionControls Group -> Handle Group -> Handle
    // We need to get the transform from the ArenaCanvas Group
    const node = e.target;
    let current = node.getParent(); // Start at Handle Group
    
    // Walk up the parent chain to find the ArenaCanvas Group
    // It's the Group that is a direct child of the Layer
    while (current) {
      const parent = current.getParent();
      if (parent && parent.getClassName() === 'Layer') {
        // Found it! current is the ArenaCanvas Group
        break;
      }
      current = parent;
      if (!current) break;
    }
    
    if (!current) {
      trace('handleScaleDragMove', 'ERROR: Could not find ArenaCanvas Group');
      return;
    }
    
    // Get the transform from the ArenaCanvas Group to convert stage coordinates to canvas coordinates
    const transform = current.getAbsoluteTransform();
    const pointerInCanvas = transform.copy().invert().point(pointerPos);

    trace('handleScaleDragMove', 'Pointer transform', {
      pointerPos,
      pointerInCanvas,
      handleLocalPos: { x: node.x(), y: node.y() }
    });

    // Get current circle (stable during drag)
    const currentCircle = getBoundingCircle();

    // Pass pointer position and center to hook for scale calculation
    onScale(pointerInCanvas.x, pointerInCanvas.y, currentCircle.center.x, currentCircle.center.y);
    
    // Reset handle position to keep it visually in place
    if (scaleHandlePositionRef.current) {
      node.position(scaleHandlePositionRef.current);
    }
  };

  // Handle scale drag end
  const handleScaleDragEnd = () => {
    scaleHandlePositionRef.current = null;
    setDragging(false);
    onScaleEnd();
  };

  // Handle radial distribute click
  const handleRadialDistributeClick = () => {
    onRadialDistribute();
  };

  const strokeColor = theme === 'dark' ? '#60A5FA' : '#3B82F6';
  const handleColor = theme === 'dark' ? '#93C5FD' : '#60A5FA';
  const handleRadius = 8;
  const arrowSize = 12;

  // Top rotation handle position
  const topHandleX = center.x;
  const topHandleY = center.y - radius - 15;

  // Right scale handle position
  const rightHandleX = center.x + radius + 15;
  const rightHandleY = center.y;

  // Bottom radial distribute button position
  const bottomHandleX = center.x;
  const bottomHandleY = center.y + radius + 15;

  return (
    <Group>
      {/* Dashed circle */}
      <Circle
        x={center.x}
        y={center.y}
        radius={radius}
        stroke={strokeColor}
        strokeWidth={2}
        dash={[5, 5]}
        listening={false}
      />

      {/* Top rotation handle - left/right arrow */}
      <Group
        x={topHandleX}
        y={topHandleY}
        draggable={true}
        onDragStart={handleRotationDragStart}
        onDragMove={handleRotationDragMove}
        onDragEnd={handleRotationDragEnd}
      >
        <Circle
          x={0}
          y={0}
          radius={handleRadius}
          fill={handleColor}
          stroke={strokeColor}
          strokeWidth={2}
        />
        {/* Left arrow */}
        <Line
          points={[-arrowSize, 0, -arrowSize / 2, -arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        <Line
          points={[-arrowSize, 0, -arrowSize / 2, arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        {/* Right arrow */}
        <Line
          points={[arrowSize, 0, arrowSize / 2, -arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        <Line
          points={[arrowSize, 0, arrowSize / 2, arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
      </Group>

      {/* Right scale handle - left/right arrow */}
      <Group
        x={rightHandleX}
        y={rightHandleY}
        draggable={true}
        onDragStart={handleScaleDragStart}
        onDragMove={handleScaleDragMove}
        onDragEnd={handleScaleDragEnd}
      >
        <Circle
          x={0}
          y={0}
          radius={handleRadius}
          fill={handleColor}
          stroke={strokeColor}
          strokeWidth={2}
        />
        {/* Left arrow */}
        <Line
          points={[-arrowSize, 0, -arrowSize / 2, -arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        <Line
          points={[-arrowSize, 0, -arrowSize / 2, arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        {/* Right arrow */}
        <Line
          points={[arrowSize, 0, arrowSize / 2, -arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        <Line
          points={[arrowSize, 0, arrowSize / 2, arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
      </Group>

      {/* Bottom radial distribute button - 4-directional arrows */}
      <Group
        x={bottomHandleX}
        y={bottomHandleY}
        onClick={handleRadialDistributeClick}
        onTap={handleRadialDistributeClick}
      >
        <Circle
          x={0}
          y={0}
          radius={handleRadius}
          fill={handleColor}
          stroke={strokeColor}
          strokeWidth={2}
        />
        {/* Up arrow */}
        <Line
          points={[0, -arrowSize, -arrowSize / 2, -arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        <Line
          points={[0, -arrowSize, arrowSize / 2, -arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        {/* Down arrow */}
        <Line
          points={[0, arrowSize, -arrowSize / 2, arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        <Line
          points={[0, arrowSize, arrowSize / 2, arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        {/* Left arrow */}
        <Line
          points={[-arrowSize, 0, -arrowSize / 2, -arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        <Line
          points={[-arrowSize, 0, -arrowSize / 2, arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        {/* Right arrow */}
        <Line
          points={[arrowSize, 0, arrowSize / 2, -arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
        <Line
          points={[arrowSize, 0, arrowSize / 2, arrowSize / 2]}
          stroke={theme === 'dark' ? '#1E3A8A' : '#1E40AF'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
      </Group>
    </Group>
  );
}

