import React, { useRef, useEffect, useState } from 'react';
import { useDrillStore } from '../../stores/drillStore';
import { useAnimationStore } from '../../stores/animationStore';
import FrameThumbnail, { DRAG_DATA_KEY } from './FrameThumbnail';
import FrameControls from './FrameControls';

export default function Filmstrip() {
  const drill = useDrillStore((state) => state.drill);
  const currentFrameIndex = useDrillStore((state) => state.currentFrameIndex);
  const setCurrentFrame = useDrillStore((state) => state.setCurrentFrame);
  const reorderFrames = useDrillStore((state) => state.reorderFrames);
  const setCurrentTime = useAnimationStore((state) => state.setCurrentTime);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null);
  const [justDropped, setJustDropped] = useState(false);

  const THUMBNAIL_WIDTH = 120;
  const DROP_ZONE_WIDTH = 16; // insertion point between frames
  const PADDING = 16; // px-4 = 1rem = 16px

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;

    setCanScrollLeft(hasHorizontalScroll && scrollLeft > 0);
    setCanScrollRight(hasHorizontalScroll && scrollLeft < maxScrollLeft - 1);
  };

  const scrollToFrame = (frameIndex: number) => {
    if (!scrollContainerRef.current || !drill || frameIndex < 0 || frameIndex >= drill.frames.length) return;
    
    const container = scrollContainerRef.current;
    const framePosition = PADDING + frameIndex * (THUMBNAIL_WIDTH + DROP_ZONE_WIDTH);
    const containerWidth = container.clientWidth;
    const currentScrollLeft = container.scrollLeft;
    
    // Calculate the visible area
    const visibleStart = currentScrollLeft;
    const visibleEnd = currentScrollLeft + containerWidth;
    
    // Calculate frame boundaries
    const frameStart = framePosition;
    const frameEnd = framePosition + THUMBNAIL_WIDTH;
    
    // Check if frame is already visible (with some padding)
    const padding = 20;
    if (frameStart >= visibleStart + padding && frameEnd <= visibleEnd - padding) {
      // Frame is already visible, no need to scroll
      return;
    }
    
    // Calculate target scroll position to center the frame
    const targetScrollLeft = framePosition - (containerWidth / 2) + (THUMBNAIL_WIDTH / 2);
    
    // Use scrollTo if available (with smooth behavior), otherwise fall back to scrollLeft
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth'
      });
      // Update scrollability after a short delay to account for smooth scrolling
      setTimeout(() => {
        checkScrollability();
      }, 300);
    } else {
      // Fallback for test environments (jsdom) that don't support scrollTo
      container.scrollLeft = Math.max(0, targetScrollLeft);
      checkScrollability();
    }
  };

  useEffect(() => {
    checkScrollability();
    
    const container = scrollContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      checkScrollability();
    });
    resizeObserver.observe(container);

    container.addEventListener('scroll', checkScrollability);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', checkScrollability);
    };
  }, [drill?.frames.length]);

  // Scroll to current frame when it changes
  useEffect(() => {
    if (drill && currentFrameIndex >= 0 && currentFrameIndex < drill.frames.length) {
      scrollToFrame(currentFrameIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFrameIndex, drill?.frames.length]);

  const handleScrollLeft = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (!drill || drill.frames.length === 0) {
    return (
      <div className="h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
        No frames yet. Add a frame to get started.
      </div>
    );
  }

  return (
    <div className="h-32 bg-gray-100 dark:bg-gray-800 flex flex-col relative">
      <FrameControls />
      <div className="flex-1 flex items-center relative">
        {canScrollLeft && (
          <button
            onClick={handleScrollLeft}
            className="absolute left-0 z-10 h-full w-8 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-colors"
            aria-label="Scroll left"
          >
            <span className="text-lg font-semibold">&lt;</span>
          </button>
        )}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-2 hide-scrollbar"
        >
          <div className="flex h-full items-center">
            {drill.frames.map((frame, index) => (
              <React.Fragment key={frame.id}>
                <div
                  className="flex-shrink-0 self-stretch flex items-center justify-center min-w-4 cursor-default"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverPosition(index);
                  }}
                  onDragLeave={() => setDragOverPosition(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(e.dataTransfer.getData(DRAG_DATA_KEY), 10);
                    setDragOverPosition(null);
                    setDraggedIndex(null);
                    if (Number.isNaN(fromIndex)) return;
                    if (fromIndex === index) return;
                    reorderFrames(fromIndex, index);
                    setJustDropped(true);
                    setTimeout(() => setJustDropped(false), 100);
                  }}
                >
                  {dragOverPosition === index && (
                    <div className="w-1 h-full min-h-[60px] bg-blue-500 rounded-full shadow-sm pointer-events-none" />
                  )}
                </div>
                <FrameThumbnail
                  frame={frame}
                  index={index}
                  isSelected={index === currentFrameIndex}
                  onClick={() => {
                    if (justDropped) return;
                    setCurrentFrame(index);
                    setCurrentTime(frame.timestamp);
                  }}
                  draggable={drill.frames.length > 1}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_DATA_KEY, String(index));
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggedIndex(index);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverPosition(null);
                  }}
                  isDragging={draggedIndex === index}
                />
              </React.Fragment>
            ))}
          </div>
        </div>
        {canScrollRight && (
          <button
            onClick={handleScrollRight}
            className="absolute right-0 z-10 h-full w-8 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-colors"
            aria-label="Scroll right"
          >
            <span className="text-lg font-semibold">&gt;</span>
          </button>
        )}
      </div>
    </div>
  );
}

