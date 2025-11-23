import React from 'react';
import { Horse, Point } from '../types';
import { Frame } from '../types';
import { pointToCanvas, canvasToPoint } from '../utils/arena';
import { useDrillStore } from '../stores/drillStore';

// Tracing configuration - set to false to disable all tracing
const ENABLE_TRACING = false;

// Tracing utility
const trace = (category: string, message: string, data?: unknown) => {
  if (ENABLE_TRACING) {
    const timestamp = new Date().toISOString();
    const logData = data ? { ...data, timestamp } : { timestamp };
    console.log(`[useGroupTransformations:${category}] ${message}`, logData);
  }
};

interface GroupTransformationState {
  initialPositions: Map<string, { position: Point; direction?: number }>;
  center: Point;
  totalRotation: number;
}

interface GroupScaleState {
  initialPositions: Map<string, Point>;
  center: Point;
  initialRadius: number;
}

interface UseGroupTransformationsParams {
  currentFrame: Frame | null;
  selectedHorses: Horse[];
  width: number;
  height: number;
  updateHorseInFrame: (frameId: string, horseId: string, updates: Partial<Horse>, skipHistory?: boolean) => void;
  batchUpdateHorsesInFrame: (frameId: string, updates: Map<string, Partial<Horse>>) => void;
}

/**
 * Calculate the center point of a group of horses
 */
export const calculateGroupCenter = (horses: Horse[]): Point => {
  trace('calculateGroupCenter', 'Called', { horseCount: horses.length });
  
  if (horses.length === 0) {
    trace('calculateGroupCenter', 'Empty horses array, returning (0,0)');
    return { x: 0, y: 0 };
  }
  
  let sumX = 0;
  let sumY = 0;
  horses.forEach((horse) => {
    sumX += horse.position.x;
    sumY += horse.position.y;
  });
  
  const center = {
    x: sumX / horses.length,
    y: sumY / horses.length,
  };
  
  trace('calculateGroupCenter', 'Calculated center', { center, sumX, sumY, horseCount: horses.length });
  return center;
};

export interface BoundingCircle {
  center: { x: number; y: number };
  radius: number;
}

/**
 * Calculate the bounding circle for a group of horses
 * Uses the same center calculation as rotation (calculateGroupCenter) for consistency
 */
export const calculateBoundingCircle = (horses: Horse[], width: number, height: number): BoundingCircle => {
  trace('calculateBoundingCircle', 'Called', { horseCount: horses.length, width, height });
  
  if (horses.length === 0) {
    trace('calculateBoundingCircle', 'Empty horses array, returning zero circle');
    return { center: { x: 0, y: 0 }, radius: 0 };
  }

  // Use the same center calculation as rotation (average of positions in world coordinates)
  const centerWorld = calculateGroupCenter(horses);
  
  // Convert center to canvas coordinates
  const centerCanvas = pointToCanvas(centerWorld, width, height);

  // Convert all horse positions to canvas coordinates for radius calculation
  const canvasPositions = horses.map((horse) =>
    pointToCanvas(horse.position, width, height)
  );

  // Calculate radius (distance from center to farthest point)
  let maxDist = 0;
  canvasPositions.forEach((pos) => {
    const dx = pos.x - centerCanvas.x;
    const dy = pos.y - centerCanvas.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    maxDist = Math.max(maxDist, dist);
  });

  // Add some padding
  const padding = 20;
  const radius = maxDist + padding;

  const circle = {
    center: { x: centerCanvas.x, y: centerCanvas.y },
    radius,
  };
  
  trace('calculateBoundingCircle', 'Calculated circle', { 
    circle, 
    centerWorld,
    centerCanvas,
    maxDist,
    padding 
  });
  
  return circle;
};

/**
 * Hook for managing group transformations (rotation, scaling, radial distribution)
 */
export function useGroupTransformations({
  currentFrame,
  selectedHorses,
  width,
  height,
  updateHorseInFrame,
  batchUpdateHorsesInFrame,
}: UseGroupTransformationsParams) {
  // Group transformation state
  const groupRotationStateRef = React.useRef<GroupTransformationState>({
    initialPositions: new Map(),
    center: { x: 0, y: 0 },
    totalRotation: 0,
  });

  const groupScaleStateRef = React.useRef<GroupScaleState>({
    initialPositions: new Map(),
    center: { x: 0, y: 0 },
    initialRadius: 0,
  });

  // Rotation handle state
  const rotationStartAngleRef = React.useRef<number | null>(null);
  const rotationCenterRef = React.useRef<{ x: number; y: number } | null>(null);

  // Scale handle state
  const scaleInitialRadiusRef = React.useRef<number | null>(null);
  const scaleCenterRef = React.useRef<{ x: number; y: number } | null>(null);

  // Circle state (for GroupSelectionControls)
  const stableCircleRef = React.useRef<BoundingCircle | null>(null);
  const isDraggingRef = React.useRef<boolean>(false);

  // Handle group rotation
  const handleGroupRotate = React.useCallback((deltaAngle: number) => {
    trace('handleGroupRotate', 'Called', { 
      deltaAngle, 
      hasFrame: !!currentFrame, 
      horseCount: selectedHorses.length,
      frameId: currentFrame?.id 
    });
    
    if (!currentFrame || selectedHorses.length === 0) {
      trace('handleGroupRotate', 'Early return - no frame or horses', { 
        hasFrame: !!currentFrame, 
        horseCount: selectedHorses.length 
      });
      return;
    }

    // Initialize state if needed (check if we have initial positions)
    if (groupRotationStateRef.current.initialPositions.size === 0) {
      trace('handleGroupRotate', 'Initializing rotation state');
      const center = calculateGroupCenter(selectedHorses);
      groupRotationStateRef.current.initialPositions.clear();
      selectedHorses.forEach((horse) => {
        groupRotationStateRef.current.initialPositions.set(horse.id, { 
          position: { ...horse.position },
          direction: horse.direction,
        });
      });
      groupRotationStateRef.current.center = { ...center };
      groupRotationStateRef.current.totalRotation = 0;
      trace('handleGroupRotate', 'State initialized', {
        center,
        horseCount: selectedHorses.length,
        initialPositionsCount: groupRotationStateRef.current.initialPositions.size
      });
    }

    // Use stored center (don't recalculate as horses move)
    const center = groupRotationStateRef.current.center;
    const centerCanvas = pointToCanvas(center, width, height);

    // Accumulate total rotation
    const previousRotation = groupRotationStateRef.current.totalRotation;
    groupRotationStateRef.current.totalRotation += deltaAngle;
    const totalRotation = groupRotationStateRef.current.totalRotation;
    
    trace('handleGroupRotate', 'Rotation accumulated', {
      deltaAngle,
      previousRotation,
      totalRotation,
      center,
      centerCanvas
    });

    const updates = new Map<string, Partial<Horse>>();
    
    selectedHorses.forEach((horse) => {
      const initialData = groupRotationStateRef.current.initialPositions.get(horse.id);
      if (!initialData) return;

      const initialPos = initialData.position;
      const initialDirection = initialData.direction || 0;

      // Convert to canvas coordinates
      const initialCanvas = pointToCanvas(initialPos, width, height);
      
      // Translate to origin
      const dx = initialCanvas.x - centerCanvas.x;
      const dy = initialCanvas.y - centerCanvas.y;

      // Rotate by total rotation
      const cos = Math.cos(totalRotation);
      const sin = Math.sin(totalRotation);
      const rotatedX = dx * cos - dy * sin;
      const rotatedY = dx * sin + dy * cos;

      // Translate back
      const newCanvasX = rotatedX + centerCanvas.x;
      const newCanvasY = rotatedY + centerCanvas.y;

      // Convert back to meters from center
      const newPos = canvasToPoint(newCanvasX, newCanvasY, width, height);
      
      // Also rotate the horse's direction
      const newDirection = initialDirection + totalRotation;
      
      updates.set(horse.id, {
        position: newPos,
        direction: newDirection,
      });
      
      trace('handleGroupRotate', 'Calculated horse update', {
        horseId: horse.id,
        initialPos,
        initialDirection,
        newPos,
        newDirection,
        totalRotation,
        dx,
        dy
      });
    });

    // Apply updates (skip history during drag)
    if (updates.size > 0) {
      trace('handleGroupRotate', 'Applying updates', { updateCount: updates.size, frameId: currentFrame.id });
      updates.forEach((updates, horseId) => {
        updateHorseInFrame(currentFrame.id, horseId, updates, true);
      });
    } else {
      trace('handleGroupRotate', 'No updates to apply');
    }
  }, [currentFrame, selectedHorses, width, height, updateHorseInFrame]);

  // Reset rotation handle state
  const resetRotationHandle = React.useCallback(() => {
    trace('resetRotationHandle', 'Called', {
      previousAngle: rotationStartAngleRef.current,
      previousCenter: rotationCenterRef.current
    });
    rotationStartAngleRef.current = null;
    rotationCenterRef.current = null;
    trace('resetRotationHandle', 'State reset');
  }, []);

  // Set dragging state (for circle stability)
  const setDragging = React.useCallback((dragging: boolean) => {
    trace('setDragging', 'Called', {
      dragging,
      previousDragging: isDraggingRef.current,
      horseCount: selectedHorses.length
    });
    
    isDraggingRef.current = dragging;
    if (dragging) {
      // Lock the circle when drag starts
      stableCircleRef.current = calculateBoundingCircle(selectedHorses, width, height);
      trace('setDragging', 'Circle locked', { circle: stableCircleRef.current });
    } else {
      // Clear stable circle when drag ends
      stableCircleRef.current = null;
      trace('setDragging', 'Circle unlocked');
    }
  }, [selectedHorses, width, height]);

  // Get current bounding circle (stable during drag, otherwise current)
  const getBoundingCircle = React.useCallback((): BoundingCircle => {
    if (isDraggingRef.current && stableCircleRef.current) {
      trace('getBoundingCircle', 'Returning stable circle', { circle: stableCircleRef.current });
      return stableCircleRef.current;
    }
    const circle = calculateBoundingCircle(selectedHorses, width, height);
    trace('getBoundingCircle', 'Returning current circle', { circle });
    return circle;
  }, [selectedHorses, width, height]);

  // Handle rotation from pointer position (calculates angle internally)
  const handleGroupRotateFromPointer = React.useCallback((pointerX: number, pointerY: number, centerX: number, centerY: number) => {
    trace('handleGroupRotateFromPointer', 'Called', {
      pointerX,
      pointerY,
      centerX,
      centerY,
      hasFrame: !!currentFrame,
      horseCount: selectedHorses.length,
      currentStartAngle: rotationStartAngleRef.current
    });
    
    if (!currentFrame || selectedHorses.length === 0) {
      trace('handleGroupRotateFromPointer', 'Early return - no frame or horses');
      return;
    }

    // Calculate angle from center to pointer
    const dx = pointerX - centerX;
    const dy = pointerY - centerY;
    const currentAngle = Math.atan2(dy, dx);

    // Initialize start angle on first move
    if (rotationStartAngleRef.current === null) {
      trace('handleGroupRotateFromPointer', 'Initializing start angle', {
        currentAngle,
        center: { x: centerX, y: centerY }
      });
      rotationStartAngleRef.current = currentAngle;
      rotationCenterRef.current = { x: centerX, y: centerY };
      // Initialize rotation state by calling with 0 delta
      handleGroupRotate(0);
      return;
    }
    
    // If center has changed significantly, reset (might be a new drag)
    if (rotationCenterRef.current) {
      const centerDx = Math.abs(rotationCenterRef.current.x - centerX);
      const centerDy = Math.abs(rotationCenterRef.current.y - centerY);
      if (centerDx > 1 || centerDy > 1) {
        trace('handleGroupRotateFromPointer', 'Center changed significantly, resetting', {
          oldCenter: rotationCenterRef.current,
          newCenter: { x: centerX, y: centerY }
        });
        rotationStartAngleRef.current = currentAngle;
        rotationCenterRef.current = { x: centerX, y: centerY };
        handleGroupRotate(0);
        return;
      }
    }

    // Calculate rotation delta
    const deltaAngle = currentAngle - rotationStartAngleRef.current;
    trace('handleGroupRotateFromPointer', 'Calculated delta angle', {
      currentAngle,
      startAngle: rotationStartAngleRef.current,
      deltaAngle
    });
    
    handleGroupRotate(deltaAngle);
    
    // Update start angle for next calculation
    rotationStartAngleRef.current = currentAngle;
  }, [currentFrame, selectedHorses, handleGroupRotate]);

  // Handle group rotation end - record history
  const handleGroupRotateEnd = React.useCallback(() => {
    trace('handleGroupRotateEnd', 'Called', {
      hasFrame: !!currentFrame,
      horseCount: selectedHorses.length,
      totalRotation: groupRotationStateRef.current.totalRotation
    });
    
    resetRotationHandle();
    if (!currentFrame || selectedHorses.length === 0) {
      trace('handleGroupRotateEnd', 'Early return - no frame or horses');
      return;
    }

    // Restore all horses to initial positions (skip history)
    const updates = new Map<string, Partial<Horse>>();
    groupRotationStateRef.current.initialPositions.forEach((initialData, horseId) => {
      updates.set(horseId, {
        position: initialData.position,
        direction: initialData.direction || 0,
      });
    });

    updates.forEach((updates, horseId) => {
      updateHorseInFrame(currentFrame.id, horseId, updates, true);
    });

    // Get fresh current frame after restoring
    const frameAfterRestore = useDrillStore.getState().getCurrentFrame();
    if (!frameAfterRestore) return;

    // Now apply final positions with history
    const finalUpdates = new Map<string, Partial<Horse>>();
    const totalRotation = groupRotationStateRef.current.totalRotation;
    const center = groupRotationStateRef.current.center;
    const centerCanvas = pointToCanvas(center, width, height);

    selectedHorses.forEach((horse) => {
      const initialData = groupRotationStateRef.current.initialPositions.get(horse.id);
      if (!initialData) return;

      const initialPos = initialData.position;
      const initialDirection = initialData.direction || 0;

      // Convert to canvas coordinates
      const initialCanvas = pointToCanvas(initialPos, width, height);
      
      // Translate to origin
      const dx = initialCanvas.x - centerCanvas.x;
      const dy = initialCanvas.y - centerCanvas.y;

      // Rotate by total rotation
      const cos = Math.cos(totalRotation);
      const sin = Math.sin(totalRotation);
      const rotatedX = dx * cos - dy * sin;
      const rotatedY = dx * sin + dy * cos;

      // Translate back
      const newCanvasX = rotatedX + centerCanvas.x;
      const newCanvasY = rotatedY + centerCanvas.y;

      // Convert back to meters from center
      const newPos = canvasToPoint(newCanvasX, newCanvasY, width, height);
      
      // Also rotate the horse's direction
      const newDirection = initialDirection + totalRotation;
      
      finalUpdates.set(horse.id, {
        position: newPos,
        direction: newDirection,
      });
    });

    // Batch update with history
    trace('handleGroupRotateEnd', 'Applying final batch update', {
      frameId: frameAfterRestore.id,
      updateCount: finalUpdates.size,
      totalRotation
    });
    
    batchUpdateHorsesInFrame(frameAfterRestore.id, finalUpdates);

    // Reset rotation state
    groupRotationStateRef.current.totalRotation = 0;
    groupRotationStateRef.current.initialPositions.clear();
    
    trace('handleGroupRotateEnd', 'Rotation state reset');
  }, [currentFrame, selectedHorses, width, height, updateHorseInFrame, batchUpdateHorsesInFrame, resetRotationHandle]);


  // Handle group scale (spacing)
  const handleGroupScale = React.useCallback((scale: number) => {
    trace('handleGroupScale', 'Called', {
      scale,
      hasFrame: !!currentFrame,
      horseCount: selectedHorses.length,
      frameId: currentFrame?.id
    });
    
    if (!currentFrame || selectedHorses.length === 0) {
      trace('handleGroupScale', 'Early return - no frame or horses');
      return;
    }

    // Initialize state if needed
    if (groupScaleStateRef.current.initialRadius === 0 || groupScaleStateRef.current.initialPositions.size === 0) {
      trace('handleGroupScale', 'Initializing scale state');
      const center = calculateGroupCenter(selectedHorses);
      const centerCanvas = pointToCanvas(center, width, height);
      
      groupScaleStateRef.current.initialPositions.clear();
      selectedHorses.forEach((horse) => {
        groupScaleStateRef.current.initialPositions.set(horse.id, { ...horse.position });
      });
      groupScaleStateRef.current.center = { ...center };
      
      // Calculate initial radius
      let maxDist = 0;
      selectedHorses.forEach((horse) => {
        const horseCanvas = pointToCanvas(horse.position, width, height);
        const dx = horseCanvas.x - centerCanvas.x;
        const dy = horseCanvas.y - centerCanvas.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        maxDist = Math.max(maxDist, dist);
      });
      groupScaleStateRef.current.initialRadius = maxDist || 1; // Avoid division by zero
      
      trace('handleGroupScale', 'State initialized', {
        center,
        centerCanvas,
        initialRadius: groupScaleStateRef.current.initialRadius,
        maxDist,
        horseCount: selectedHorses.length
      });
    }

    // Use stored center (don't recalculate as horses move)
    const center = groupScaleStateRef.current.center;
    const centerCanvas = pointToCanvas(center, width, height);
    
    trace('handleGroupScale', 'Applying scale', {
      scale,
      center,
      centerCanvas,
      initialRadius: groupScaleStateRef.current.initialRadius
    });

    const updates = new Map<string, Partial<Horse>>();
    
    selectedHorses.forEach((horse) => {
      const initialPos = groupScaleStateRef.current.initialPositions.get(horse.id);
      if (!initialPos) {
        trace('handleGroupScale', 'Missing initial position for horse', { horseId: horse.id });
        return;
      }

      // Convert to canvas coordinates
      const initialCanvas = pointToCanvas(initialPos, width, height);
      
      // Translate to origin
      const dx = initialCanvas.x - centerCanvas.x;
      const dy = initialCanvas.y - centerCanvas.y;

      // Scale
      const scaledX = dx * scale;
      const scaledY = dy * scale;

      // Translate back
      const newCanvasX = scaledX + centerCanvas.x;
      const newCanvasY = scaledY + centerCanvas.y;

      // Convert back to meters from center
      const newPos = canvasToPoint(newCanvasX, newCanvasY, width, height);
      
      updates.set(horse.id, {
        position: newPos,
      });
      
      trace('handleGroupScale', 'Calculated horse update', {
        horseId: horse.id,
        initialPos,
        newPos,
        scale,
        dx,
        dy
      });
    });

    // Apply updates (skip history during drag)
    if (updates.size > 0) {
      trace('handleGroupScale', 'Applying updates', { updateCount: updates.size, frameId: currentFrame.id });
      updates.forEach((updates, horseId) => {
        updateHorseInFrame(currentFrame.id, horseId, updates, true);
      });
    } else {
      trace('handleGroupScale', 'No updates to apply');
    }
  }, [currentFrame, selectedHorses, width, height, updateHorseInFrame]);

  // Reset scale handle state
  const resetScaleHandle = React.useCallback(() => {
    trace('resetScaleHandle', 'Called', {
      previousRadius: scaleInitialRadiusRef.current,
      previousCenter: scaleCenterRef.current
    });
    scaleInitialRadiusRef.current = null;
    scaleCenterRef.current = null;
    trace('resetScaleHandle', 'State reset');
  }, []);

  // Handle scale from pointer position (calculates scale internally)
  const handleGroupScaleFromPointer = React.useCallback((pointerX: number, pointerY: number, centerX: number, centerY: number) => {
    trace('handleGroupScaleFromPointer', 'Called', {
      pointerX,
      pointerY,
      centerX,
      centerY,
      hasFrame: !!currentFrame,
      horseCount: selectedHorses.length,
      currentInitialRadius: scaleInitialRadiusRef.current
    });
    
    if (!currentFrame || selectedHorses.length === 0) {
      trace('handleGroupScaleFromPointer', 'Early return - no frame or horses');
      return;
    }

    // Calculate distance from center to pointer
    const dx = pointerX - centerX;
    const dy = pointerY - centerY;
    const currentDist = Math.sqrt(dx * dx + dy * dy);

    // Initialize radius on first move
    if (scaleInitialRadiusRef.current === null) {
      trace('handleGroupScaleFromPointer', 'Initializing scale radius', {
        currentDist,
        center: { x: centerX, y: centerY }
      });
      scaleInitialRadiusRef.current = currentDist;
      scaleCenterRef.current = { x: centerX, y: centerY };
      // Initialize scale state by calling with scale 1.0
      handleGroupScale(1.0);
      return;
    }
    
    // If center has changed significantly, reset (might be a new drag)
    if (scaleCenterRef.current) {
      const centerDx = Math.abs(scaleCenterRef.current.x - centerX);
      const centerDy = Math.abs(scaleCenterRef.current.y - centerY);
      if (centerDx > 1 || centerDy > 1) {
        trace('handleGroupScaleFromPointer', 'Center changed significantly, resetting', {
          oldCenter: scaleCenterRef.current,
          newCenter: { x: centerX, y: centerY }
        });
        scaleInitialRadiusRef.current = currentDist;
        scaleCenterRef.current = { x: centerX, y: centerY };
        handleGroupScale(1.0);
        return;
      }
    }

    // Calculate scale factor
    const scale = currentDist / scaleInitialRadiusRef.current;
    trace('handleGroupScaleFromPointer', 'Calculated scale', {
      currentDist,
      initialRadius: scaleInitialRadiusRef.current,
      scale
    });
    
    handleGroupScale(scale);
  }, [currentFrame, selectedHorses, handleGroupScale]);

  // Handle group scale end - record history
  const handleGroupScaleEnd = React.useCallback(() => {
    trace('handleGroupScaleEnd', 'Called', {
      hasFrame: !!currentFrame,
      horseCount: selectedHorses.length,
      initialRadius: groupScaleStateRef.current.initialRadius
    });
    
    resetScaleHandle();
    if (!currentFrame || selectedHorses.length === 0) {
      trace('handleGroupScaleEnd', 'Early return - no frame or horses');
      return;
    }

    // Restore all horses to initial positions (skip history)
    const updates = new Map<string, Partial<Horse>>();
    groupScaleStateRef.current.initialPositions.forEach((initialPos, horseId) => {
      updates.set(horseId, {
        position: initialPos,
      });
    });

    updates.forEach((updates, horseId) => {
      updateHorseInFrame(currentFrame.id, horseId, updates, true);
    });

    // Get fresh current frame after restoring
    const frameAfterRestore = useDrillStore.getState().getCurrentFrame();
    if (!frameAfterRestore) return;

    // Calculate final scale from current positions
    const center = groupScaleStateRef.current.center;
    const centerCanvas = pointToCanvas(center, width, height);
    const initialRadius = groupScaleStateRef.current.initialRadius;

    // Get current positions and calculate scale
    let maxCurrentDist = 0;
    selectedHorses.forEach((horse) => {
      const horseCanvas = pointToCanvas(horse.position, width, height);
      const dx = horseCanvas.x - centerCanvas.x;
      const dy = horseCanvas.y - centerCanvas.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      maxCurrentDist = Math.max(maxCurrentDist, dist);
    });

    const finalScale = initialRadius > 0 ? maxCurrentDist / initialRadius : 1;

    // Now apply final positions with history
    const finalUpdates = new Map<string, Partial<Horse>>();

    selectedHorses.forEach((horse) => {
      const initialPos = groupScaleStateRef.current.initialPositions.get(horse.id);
      if (!initialPos) return;

      // Convert to canvas coordinates
      const initialCanvas = pointToCanvas(initialPos, width, height);
      
      // Translate to origin
      const dx = initialCanvas.x - centerCanvas.x;
      const dy = initialCanvas.y - centerCanvas.y;

      // Scale
      const scaledX = dx * finalScale;
      const scaledY = dy * finalScale;

      // Translate back
      const newCanvasX = scaledX + centerCanvas.x;
      const newCanvasY = scaledY + centerCanvas.y;

      // Convert back to meters from center
      const newPos = canvasToPoint(newCanvasX, newCanvasY, width, height);
      
      finalUpdates.set(horse.id, {
        position: newPos,
      });
    });

    // Batch update with history
    trace('handleGroupScaleEnd', 'Applying final batch update', {
      frameId: frameAfterRestore.id,
      updateCount: finalUpdates.size,
      finalScale
    });
    
    batchUpdateHorsesInFrame(frameAfterRestore.id, finalUpdates);

    // Reset scale state
    groupScaleStateRef.current.initialRadius = 0;
    groupScaleStateRef.current.initialPositions.clear();
    
    trace('handleGroupScaleEnd', 'Scale state reset');
  }, [currentFrame, selectedHorses, width, height, updateHorseInFrame, batchUpdateHorsesInFrame, resetScaleHandle]);

  // Handle radial distribution
  const handleRadialDistribute = React.useCallback(() => {
    trace('handleRadialDistribute', 'Called', {
      hasFrame: !!currentFrame,
      horseCount: selectedHorses.length,
      frameId: currentFrame?.id
    });
    
    if (!currentFrame || selectedHorses.length === 0) {
      trace('handleRadialDistribute', 'Early return - no frame or horses');
      return;
    }

    const center = calculateGroupCenter(selectedHorses);
    const centerCanvas = pointToCanvas(center, width, height);

    // Calculate radius (distance from center to farthest horse)
    let maxDist = 0;
    selectedHorses.forEach((horse) => {
      const horseCanvas = pointToCanvas(horse.position, width, height);
      const dx = horseCanvas.x - centerCanvas.x;
      const dy = horseCanvas.y - centerCanvas.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      maxDist = Math.max(maxDist, dist);
    });

    // Add padding
    const targetRadius = maxDist;

    // First restore all horses to their initial positions (skip history)
    const initialPositions = new Map<string, Point>();
    selectedHorses.forEach((horse) => {
      initialPositions.set(horse.id, { ...horse.position });
      updateHorseInFrame(currentFrame.id, horse.id, {
        position: horse.position,
      }, true);
    });

    // Get fresh current frame after restoring
    const frameAfterRestore = useDrillStore.getState().getCurrentFrame();
    if (!frameAfterRestore) return;

    // Distribute horses to edge while preserving their polar angles
    const updates = new Map<string, Partial<Horse>>();
    
    selectedHorses.forEach((horse) => {
      const initialPos = initialPositions.get(horse.id);
      if (!initialPos) return;

      // Convert initial position to canvas coordinates
      const initialCanvas = pointToCanvas(initialPos, width, height);
      
      // Calculate polar coordinates (angle and distance from center)
      const dx = initialCanvas.x - centerCanvas.x;
      const dy = initialCanvas.y - centerCanvas.y;
      const polarAngle = Math.atan2(dy, dx);
      
      // Calculate position on circle edge using preserved polar angle
      const newCanvasX = centerCanvas.x + targetRadius * Math.cos(polarAngle);
      const newCanvasY = centerCanvas.y + targetRadius * Math.sin(polarAngle);
      
      // Convert to normalized
      const newPos = canvasToPoint(newCanvasX, newCanvasY, width, height);
      
      // Calculate both tangential directions (perpendicular to radius)
      const clockwiseDirection = polarAngle + Math.PI / 2;  // Clockwise
      const counterclockwiseDirection = polarAngle - Math.PI / 2;  // Counterclockwise
      
      // Get the horse's current direction
      const currentDirection = horse.direction || 0;
      
      // Normalize angles to [0, 2π] for comparison
      const normalizeAngle = (angle: number): number => {
        let normalized = angle;
        while (normalized < 0) normalized += 2 * Math.PI;
        while (normalized >= 2 * Math.PI) normalized -= 2 * Math.PI;
        return normalized;
      };
      
      const currentNorm = normalizeAngle(currentDirection);
      const clockwiseNorm = normalizeAngle(clockwiseDirection);
      const counterclockwiseNorm = normalizeAngle(counterclockwiseDirection);
      
      // Calculate angular distances (handling wraparound)
      const distToClockwise = Math.min(
        Math.abs(currentNorm - clockwiseNorm),
        2 * Math.PI - Math.abs(currentNorm - clockwiseNorm)
      );
      const distToCounterclockwise = Math.min(
        Math.abs(currentNorm - counterclockwiseNorm),
        2 * Math.PI - Math.abs(currentNorm - counterclockwiseNorm)
      );
      
      // Choose the direction that's closer to the current orientation
      const tangentialDirection = distToClockwise < distToCounterclockwise
        ? clockwiseDirection
        : counterclockwiseDirection;
      
      updates.set(horse.id, {
        position: newPos,
        direction: tangentialDirection,
      });
    });

    // Batch update with history
    trace('handleRadialDistribute', 'Applying batch update', {
      frameId: frameAfterRestore.id,
      updateCount: updates.size,
      targetRadius
    });
    
    batchUpdateHorsesInFrame(frameAfterRestore.id, updates);

    // Reset scale state
    groupScaleStateRef.current.initialRadius = 0;
    
    trace('handleRadialDistribute', 'Radial distribution complete');
  }, [currentFrame, selectedHorses, width, height, updateHorseInFrame, batchUpdateHorsesInFrame]);

  // Track previous horse IDs to detect actual selection changes (separate refs for rotation and scale)
  const previousRotationHorseIdsRef = React.useRef<string>('');
  const previousScaleHorseIdsRef = React.useRef<string>('');
  
  // Reset rotation state when selection changes (but not during drag)
  React.useEffect(() => {
    // Don't reset if we're currently dragging
    if (isDraggingRef.current) {
      trace('useEffect:selectedHorses', 'Skipping rotation reset - drag in progress');
      return;
    }
    
    // Create stable ID string for comparison
    const currentHorseIds = selectedHorses.map(h => h.id).sort().join(',');
    
    // Only reset if the actual selection changed (not just array reference)
    if (previousRotationHorseIdsRef.current === currentHorseIds) {
      trace('useEffect:selectedHorses', 'Skipping rotation reset - same horses', {
        horseIds: currentHorseIds
      });
      return;
    }
    
    const previousHorseIds = previousRotationHorseIdsRef.current;
    previousRotationHorseIdsRef.current = currentHorseIds;
    
    trace('useEffect:selectedHorses', 'Resetting rotation state', {
      previousHorseIds,
      currentHorseIds,
      previousRotation: groupRotationStateRef.current.totalRotation
    });
    
    groupRotationStateRef.current.totalRotation = 0;
    groupRotationStateRef.current.initialPositions.clear();
    resetRotationHandle();
  }, [selectedHorses, resetRotationHandle]);

  // Reset scale state when selection changes (but not during drag)
  React.useEffect(() => {
    // Don't reset if we're currently dragging
    if (isDraggingRef.current) {
      trace('useEffect:selectedHorses', 'Skipping scale reset - drag in progress');
      return;
    }
    
    // Create stable ID string for comparison
    const currentHorseIds = selectedHorses.map(h => h.id).sort().join(',');
    
    // Only reset if the actual selection changed (not just array reference)
    if (previousScaleHorseIdsRef.current === currentHorseIds) {
      trace('useEffect:selectedHorses', 'Skipping scale reset - same horses', {
        horseIds: currentHorseIds
      });
      return;
    }
    
    const previousHorseIds = previousScaleHorseIdsRef.current;
    previousScaleHorseIdsRef.current = currentHorseIds;
    
    trace('useEffect:selectedHorses', 'Resetting scale state', {
      previousHorseIds,
      currentHorseIds,
      previousRadius: groupScaleStateRef.current.initialRadius
    });
    
    groupScaleStateRef.current.initialRadius = 0;
    groupScaleStateRef.current.initialPositions.clear();
    resetScaleHandle();
  }, [selectedHorses, resetScaleHandle]);

  return {
    handleGroupRotate,
    handleGroupRotateFromPointer,
    handleGroupRotateEnd,
    resetRotationHandle,
    handleGroupScale,
    handleGroupScaleFromPointer,
    handleGroupScaleEnd,
    resetScaleHandle,
    handleRadialDistribute,
    getBoundingCircle,
    setDragging,
  };
}

