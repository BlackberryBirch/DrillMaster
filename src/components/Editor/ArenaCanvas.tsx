import React from 'react';
import { Group, Rect, Line } from 'react-konva';
import { useDrillStore } from '../../stores/drillStore';
import { useEditorStore } from '../../stores/editorStore';
import { useThemeStore } from '../../stores/themeStore';
import { useAnimationStore } from '../../stores/animationStore';
import { getGridLines, canvasToPoint, pointToCanvas } from '../../utils/arena';
import { getInterpolatedHorses } from '../../utils/animation';
import { Horse } from '../../types';
import HorseRenderer from './HorseRenderer';

interface ArenaCanvasProps {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  zoom: number;
  pan: { x: number; y: number };
}

export default function ArenaCanvas({
  width,
  height,
  offsetX,
  offsetY,
  zoom,
  pan,
}: ArenaCanvasProps) {
  const drill = useDrillStore((state) => state.drill);
  const currentFrame = useDrillStore((state) => state.getCurrentFrame());
  const selectedHorseIds = useEditorStore((state) => state.selectedHorseIds);
  const showDirectionArrows = useEditorStore((state) => state.showDirectionArrows);
  const updateHorseInFrame = useDrillStore((state) => state.updateHorseInFrame);
  const batchUpdateHorsesInFrame = useDrillStore((state) => state.batchUpdateHorsesInFrame);
  const setSelectedHorses = useEditorStore((state) => state.setSelectedHorses);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const addSelectedHorse = useEditorStore((state) => state.addSelectedHorse);
  const removeSelectedHorse = useEditorStore((state) => state.removeSelectedHorse);
  const theme = useThemeStore((state) => state.theme);
  const animationState = useAnimationStore((state) => state.state);
  const animationTime = useAnimationStore((state) => state.currentTime);

  const gridLines = getGridLines();
  
  // Theme-aware colors
  const arenaBgColor = theme === 'dark' ? '#2D2D2D' : '#F5F5DC';
  const gridLineColor = theme === 'dark' ? '#555555' : '#999999';

  // Track the initial position when drag starts
  const dragStartPositionsRef = React.useRef<Map<string, { x: number; y: number }>>(new Map());
  const isDraggingRef = React.useRef<boolean>(false);

  // Selection rectangle state
  const [selectionRect, setSelectionRect] = React.useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isSelecting, setIsSelecting] = React.useState(false);

  const handleHorseDragStart = (horseId: string) => {
    if (!currentFrame) return;
    
    isDraggingRef.current = true;
    
    // Store initial positions of all selected horses (or just the dragged one if none selected)
    const horsesToMove = selectedHorseIds.length > 1 && selectedHorseIds.includes(horseId)
      ? selectedHorseIds
      : [horseId];
    
    dragStartPositionsRef.current.clear();
    horsesToMove.forEach((id) => {
      const horse = currentFrame.horses.find((h) => h.id === id);
      if (horse) {
        dragStartPositionsRef.current.set(id, { ...horse.position });
      }
    });
  };

  // Handler for drag move - updates positions in real-time without history
  const handleHorseDragMove = (horseId: string, newX: number, newY: number) => {
    // Don't allow dragging during animation
    if (animationState === 'playing') return;
    
    if (!currentFrame) return;
    
    const newNormalizedPoint = canvasToPoint(newX, newY, width, height);
    const isMultiSelect = selectedHorseIds.length > 1 && selectedHorseIds.includes(horseId);
    
    if (isMultiSelect) {
      const initialPos = dragStartPositionsRef.current.get(horseId);
      if (!initialPos) {
        updateHorseInFrame(currentFrame.id, horseId, {
          position: newNormalizedPoint,
        }, true); // Skip history during drag
        return;
      }
      
      const deltaX = newNormalizedPoint.x - initialPos.x;
      const deltaY = newNormalizedPoint.y - initialPos.y;
      
      // Update all horses without recording history (will be recorded on drag end)
      selectedHorseIds.forEach((id) => {
        if (id === horseId) {
          updateHorseInFrame(currentFrame.id, id, {
            position: newNormalizedPoint,
          }, true); // Skip history
        } else {
          const initialHorsePos = dragStartPositionsRef.current.get(id);
          if (initialHorsePos) {
            const newPos = {
              x: initialHorsePos.x + deltaX,
              y: initialHorsePos.y + deltaY,
            };
            updateHorseInFrame(currentFrame.id, id, {
              position: newPos,
            }, true); // Skip history
          }
        }
      });
    } else {
      // Single horse drag - skip history during move
      updateHorseInFrame(currentFrame.id, horseId, {
        position: newNormalizedPoint,
      }, true); // Skip history during drag
    }
  };

  // Handler for arrow drag - updates direction and speed
  const handleArrowDragStart = (_horseId: string) => {
    if (!currentFrame) return;
    // Store initial state for history if needed
  };

  const handleArrowDragMove = (horseId: string, direction: number, speed: string) => {
    // Don't allow dragging during animation
    if (animationState === 'playing') return;
    
    if (!currentFrame) return;
    
    // Update horse direction and speed in real-time (skip history during drag)
    updateHorseInFrame(currentFrame.id, horseId, {
      direction,
      speed: speed as any,
    }, true); // Skip history during drag
  };

  const handleArrowDragEnd = (horseId: string, direction: number, speed: string) => {
    // Don't allow dragging during animation
    if (animationState === 'playing') return;
    
    if (!currentFrame) return;
    
    // First restore to initial state (skip history)
    const horse = currentFrame.horses.find((h) => h.id === horseId);
    if (horse) {
      updateHorseInFrame(currentFrame.id, horseId, {
        direction: horse.direction,
        speed: horse.speed,
      }, true); // Skip history - just restoring for proper history capture
    }
    
    // Get fresh current frame after restoring
    const frameAfterRestore = useDrillStore.getState().getCurrentFrame();
    if (!frameAfterRestore) return;
    
    // Now apply final direction and speed with history
    updateHorseInFrame(frameAfterRestore.id, horseId, {
      direction,
      speed: speed as any,
    }, false); // Record history on drag end
  };

  // Handler for drag end - records history
  const handleHorseDragEnd = (horseId: string, newX: number, newY: number) => {
    isDraggingRef.current = false;
    
    // Don't allow dragging during animation
    if (animationState === 'playing') return;
    
    if (!currentFrame) return;
    
    const newNormalizedPoint = canvasToPoint(newX, newY, width, height);
    const isMultiSelect = selectedHorseIds.length > 1 && selectedHorseIds.includes(horseId);
    
    if (isMultiSelect) {
      const initialPos = dragStartPositionsRef.current.get(horseId);
      if (!initialPos) {
        // Fallback: just record the dragged horse
        // First restore to initial position, then apply final position
        const initialHorse = currentFrame.horses.find(h => h.id === horseId);
        if (initialHorse) {
          const savedInitialPos = dragStartPositionsRef.current.get(horseId);
          if (savedInitialPos) {
            // Restore to initial position first (skip history)
            updateHorseInFrame(currentFrame.id, horseId, {
              position: savedInitialPos,
            }, true);
          }
        }
        // Now apply final position with history
        updateHorseInFrame(currentFrame.id, horseId, {
          position: newNormalizedPoint,
        }, false); // Record history on drag end
        return;
      }
      
      const deltaX = newNormalizedPoint.x - initialPos.x;
      const deltaY = newNormalizedPoint.y - initialPos.y;
      
      // IMPORTANT: First restore all horses to their initial positions (skip history)
      // This ensures that when we record history, the "previous" state is the initial positions
      selectedHorseIds.forEach((id) => {
        const savedInitialPos = dragStartPositionsRef.current.get(id);
        if (savedInitialPos) {
          updateHorseInFrame(currentFrame.id, id, {
            position: savedInitialPos,
          }, true); // Skip history - just restoring for proper history capture
        }
      });
      
      // Get fresh current frame after restoring initial positions
      const frameAfterRestore = useDrillStore.getState().getCurrentFrame();
      if (!frameAfterRestore) return;
      
      // Now batch all updates together for a single history entry
      // The horses are now at their initial positions, so this will correctly capture
      // initial -> final as the history entry
      const updates = new Map<string, Partial<Horse>>();
      
      updates.set(horseId, { position: newNormalizedPoint });
      
      selectedHorseIds.forEach((id) => {
        if (id !== horseId) {
          const initialHorsePos = dragStartPositionsRef.current.get(id);
          if (initialHorsePos) {
            const newPos = {
              x: initialHorsePos.x + deltaX,
              y: initialHorsePos.y + deltaY,
            };
            updates.set(id, { position: newPos });
          }
        }
      });
      
      // Use batch update which records history
      // At this point, horses are at initial positions, so history will be correct
      batchUpdateHorsesInFrame(frameAfterRestore.id, updates);
    } else {
      // Single horse drag
      // First restore to initial position (skip history)
      const savedInitialPos = dragStartPositionsRef.current.get(horseId);
      if (savedInitialPos) {
        updateHorseInFrame(currentFrame.id, horseId, {
          position: savedInitialPos,
        }, true); // Skip history - just restoring for proper history capture
      }
      // Get fresh current frame after restoring initial position
      const frameAfterRestore = useDrillStore.getState().getCurrentFrame();
      if (!frameAfterRestore) return;
      // Now apply final position with history
      updateHorseInFrame(frameAfterRestore.id, horseId, {
        position: newNormalizedPoint,
      }, false); // Record history on drag end
    }
  };

  // Get horses to display - use interpolated positions during animation
  // During playback, interpolate between frames for smooth animation
  // When stopped/paused, show exact frame positions
  const horsesToDisplay = React.useMemo(() => {
    if (animationState === 'playing' && drill && drill.frames.length > 0) {
      // Use interpolated positions during animation
      return getInterpolatedHorses(drill.frames, animationTime);
    } else if (currentFrame) {
      // Use exact frame positions when not playing
      return currentFrame.horses;
    }
    return [];
  }, [animationState, drill, animationTime, currentFrame]);

  // Handle arena background click - deselect all horses
  const handleArenaClick = (e: any) => {
    // Don't allow selection during animation
    if (animationState === 'playing') return;
    
    // Only deselect if clicking directly on the arena (not on a horse)
    // The event will be stopped by horses, so if we get here, it's the arena
    const nativeEvent = e.evt || e;
    if (!nativeEvent.ctrlKey && !nativeEvent.metaKey) {
      clearSelection();
    }
  };

  // Handle arena drag start - begin selection rectangle
  const handleArenaDragStart = (e: any) => {
    // Don't allow selection during animation
    if (animationState === 'playing') return;
    
    // Get the position relative to the arena (accounting for zoom/pan)
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    
    // Convert to arena coordinates (accounting for Group transform)
    const arenaX = (pointerPos.x - (offsetX + pan.x)) / zoom;
    const arenaY = (pointerPos.y - (offsetY + pan.y)) / zoom;
    
    // Clamp to arena bounds
    const startX = Math.max(0, Math.min(width, arenaX));
    const startY = Math.max(0, Math.min(height, arenaY));
    
    setIsSelecting(true);
    setSelectionRect({
      startX,
      startY,
      endX: startX,
      endY: startY,
    });
  };

  // Handle arena drag move and end with window events
  React.useEffect(() => {
    if (!isSelecting || !currentFrame) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!selectionRect) return;
      
      // Find the Stage element to get its position
      const stageElement = document.querySelector('canvas')?.closest('div');
      if (!stageElement) return;
      
      const rect = stageElement.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      
      // Convert to arena coordinates
      const arenaX = (pointerX - (offsetX + pan.x)) / zoom;
      const arenaY = (pointerY - (offsetY + pan.y)) / zoom;
      
      // Clamp to arena bounds
      const endX = Math.max(0, Math.min(width, arenaX));
      const endY = Math.max(0, Math.min(height, arenaY));
      
      setSelectionRect({
        ...selectionRect,
        endX,
        endY,
      });
    };

    const handleMouseUp = () => {
      if (!isSelecting || !selectionRect || !currentFrame) {
        setIsSelecting(false);
        setSelectionRect(null);
        return;
      }
      
      // Calculate rectangle bounds (handle negative width/height from dragging backwards)
      const rectX = Math.min(selectionRect.startX, selectionRect.endX);
      const rectY = Math.min(selectionRect.startY, selectionRect.endY);
      const rectWidth = Math.abs(selectionRect.endX - selectionRect.startX);
      const rectHeight = Math.abs(selectionRect.endY - selectionRect.startY);
      
      // Convert rectangle bounds to normalized coordinates
      const normalizedRect = {
        x: rectX / width,
        y: rectY / height,
        width: rectWidth / width,
        height: rectHeight / height,
      };
      
      // Find all horses whose centers are within the rectangle
      const horsesInRect: string[] = [];
      horsesToDisplay.forEach((horse) => {
        const horseX = horse.position.x;
        const horseY = horse.position.y;
        
        // Check if horse center is within rectangle
        if (
          horseX >= normalizedRect.x &&
          horseX <= normalizedRect.x + normalizedRect.width &&
          horseY >= normalizedRect.y &&
          horseY <= normalizedRect.y + normalizedRect.height
        ) {
          horsesInRect.push(horse.id);
        }
      });
      
      // Select all horses within the rectangle
      if (horsesInRect.length > 0) {
        setSelectedHorses(horsesInRect);
      } else {
        // If no horses selected, clear selection
        clearSelection();
      }
      
      setIsSelecting(false);
      setSelectionRect(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSelecting, selectionRect, offsetX, offsetY, pan, zoom, width, height, currentFrame, horsesToDisplay, setSelectedHorses, clearSelection]);

  if (!currentFrame || !drill) {
    return null;
  }

  return (
    <Group x={offsetX + pan.x} y={offsetY + pan.y} scaleX={zoom} scaleY={zoom}>
      {/* Arena Background */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={arenaBgColor}
        stroke={theme === 'dark' ? '#444444' : '#CCCCCC'}
        strokeWidth={2}
        onClick={handleArenaClick}
      />
      
      {/* Transparent overlay for selection rectangle - handles mouse events */}
      {!isSelecting && (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="transparent"
          listening={true}
          onMouseDown={handleArenaDragStart}
        />
      )}

      {/* Grid Lines - Vertical (4 divisions along length) */}
      {gridLines.vertical.map((ratio, i) => (
        <Line
          key={`v-${i}`}
          points={[width * ratio, 0, width * ratio, height]}
          stroke={gridLineColor}
          strokeWidth={1}
          dash={[5, 5]}
        />
      ))}

      {/* Grid Line - Horizontal (midpoint along width) */}
      {gridLines.horizontal.map((ratio, i) => (
        <Line
          key={`h-${i}`}
          points={[0, height * ratio, width, height * ratio]}
          stroke={gridLineColor}
          strokeWidth={1}
          dash={[5, 5]}
        />
      ))}

      {/* Selection Rectangle */}
      {selectionRect && (
        <Rect
          x={Math.min(selectionRect.startX, selectionRect.endX)}
          y={Math.min(selectionRect.startY, selectionRect.endY)}
          width={Math.abs(selectionRect.endX - selectionRect.startX)}
          height={Math.abs(selectionRect.endY - selectionRect.startY)}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth={1}
          dash={[5, 5]}
          listening={false}
        />
      )}

      {/* Horses */}
      {horsesToDisplay.map((horse) => {
        const canvasPos = pointToCanvas(horse.position, width, height);
        const isSelected = selectedHorseIds.includes(horse.id);

        return (
          <HorseRenderer
            key={horse.id}
            horse={horse}
            x={canvasPos.x}
            y={canvasPos.y}
            isSelected={isSelected}
            showArrow={showDirectionArrows}
            onDrag={(newX, newY) => handleHorseDragEnd(horse.id, newX, newY)}
            onDragStart={() => handleHorseDragStart(horse.id)}
            onDragMove={(newX, newY) => handleHorseDragMove(horse.id, newX, newY)}
            onArrowDrag={(direction, speed) => handleArrowDragEnd(horse.id, direction, speed)}
            onArrowDragStart={() => handleArrowDragStart(horse.id)}
            onArrowDragMove={(direction, speed) => handleArrowDragMove(horse.id, direction, speed)}
            draggable={animationState !== 'playing'}
            canvasWidth={width}
            canvasHeight={height}
            onClick={(e: any) => {
              // Don't allow selection during animation
              if (animationState === 'playing') return;
              
              // Stop event propagation so clicking a horse doesn't trigger arena click
              e.cancelBubble = true;
              if (e.evt) {
                e.evt.stopPropagation();
              }
              
              const nativeEvent = e.evt || e;
              if (nativeEvent.ctrlKey || nativeEvent.metaKey) {
                // Multi-select
                if (isSelected) {
                  removeSelectedHorse(horse.id);
                } else {
                  addSelectedHorse(horse.id);
                }
              } else {
                // Single select
                setSelectedHorses([horse.id]);
              }
            }}
          />
        );
      })}
    </Group>
  );
}

