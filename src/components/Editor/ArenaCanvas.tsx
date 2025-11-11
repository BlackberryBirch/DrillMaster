import { Group, Rect, Line, Circle, Arrow } from 'react-konva';
import { useDrillStore } from '../../stores/drillStore';
import { useEditorStore } from '../../stores/editorStore';
import { useThemeStore } from '../../stores/themeStore';
import { useAnimationStore } from '../../stores/animationStore';
import { getGridLines, canvasToPoint, pointToCanvas } from '../../utils/arena';
import { getInterpolatedHorses } from '../../utils/animation';
import { GAIT_COLORS } from '../../types';
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
  const setSelectedHorses = useEditorStore((state) => state.setSelectedHorses);
  const addSelectedHorse = useEditorStore((state) => state.addSelectedHorse);
  const removeSelectedHorse = useEditorStore((state) => state.removeSelectedHorse);
  const currentFrameIndex = useDrillStore((state) => state.currentFrameIndex);
  const theme = useThemeStore((state) => state.theme);
  const animationState = useAnimationStore((state) => state.state);
  const animationTime = useAnimationStore((state) => state.currentTime);

  const gridLines = getGridLines();
  
  // Theme-aware colors
  const arenaBgColor = theme === 'dark' ? '#2D2D2D' : '#F5F5DC';
  const gridLineColor = theme === 'dark' ? '#555555' : '#999999';

  const handleHorseDrag = (horseId: string, newX: number, newY: number) => {
    // Don't allow dragging during animation
    if (animationState === 'playing') return;
    
    if (!currentFrame) return;
    
    // newX and newY are already in arena coordinates (relative to parent Group)
    // The parent Group's coordinate system is the arena (0 to width/height)
    // We just need to convert from canvas coordinates to normalized point
    const normalizedPoint = canvasToPoint(
      newX,
      newY,
      width,
      height
    );
    
    updateHorseInFrame(currentFrame.id, horseId, {
      position: normalizedPoint,
    });
  };

  if (!currentFrame || !drill) {
    return null;
  }

  // Get horses to display - use interpolated positions during animation
  const horsesToDisplay =
    animationState === 'playing' && drill.frames.length > 0
      ? getInterpolatedHorses(drill.frames, animationTime)
      : currentFrame.horses;

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
      />

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
            onDrag={(newX, newY) => handleHorseDrag(horse.id, newX, newY)}
            draggable={animationState !== 'playing'}
            canvasWidth={width}
            canvasHeight={height}
            onClick={(e: any) => {
              // Don't allow selection during animation
              if (animationState === 'playing') return;
              
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

