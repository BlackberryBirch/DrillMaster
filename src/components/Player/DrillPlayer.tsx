import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stage, Layer } from 'react-konva';
import { drillService } from '../../services/drillService';
import { useDrillStore } from '../../stores/drillStore';
import { useEditorStore } from '../../stores/editorStore';
import { useThemeStore } from '../../stores/themeStore';
import { useAnimation } from '../../hooks/useAnimation';
import { useAudio } from '../../hooks/useAudio';
import { calculateArenaDimensions } from '../../utils/arena';
import ArenaCanvas from '../Editor/ArenaCanvas';
import AnimationControls from '../Animation/AnimationControls';

function getDistance(touch1: Touch, touch2: Touch): number {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

export default function DrillPlayer() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setDrill = useDrillStore((state) => state.setDrill);
  const drill = useDrillStore((state) => state.drill);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightHorseLabel, setHighlightHorseLabel] = useState<string | number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pinchStateRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    initialCenter: { x: number; y: number };
  } | null>(null);

  const zoom = useEditorStore((state) => state.zoom);
  const pan = useEditorStore((state) => state.pan);
  const setZoom = useEditorStore((state) => state.setZoom);
  const setPan = useEditorStore((state) => state.setPan);
  const resetView = useEditorStore((state) => state.resetView);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  useAnimation();
  useAudio();

  useEffect(() => {
    if (!token) {
      setError('Invalid link');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    drillService.getDrillByShareToken(token).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      if (result.data) {
        const drillWithoutAudio = { ...result.data, audioTrack: undefined };
        setDrill(drillWithoutAudio, true, false);
        resetView();
      }
    });
    return () => { cancelled = true; };
  }, [token, setDrill, resetView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return;
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        setDimensions((prev) => (prev.width !== w || prev.height !== h ? { width: w, height: h } : prev));
      });
    };

    updateDimensions();
    const ro = new ResizeObserver(updateDimensions);
    ro.observe(container);
    window.addEventListener('resize', updateDimensions);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [loading, error]); // Re-run when we transition to content so containerRef is set

  const sortedHorseLabels = useMemo(() => {
    if (!drill?.frames.length) return [];
    const labels = Array.from(
      new Set(drill.frames.flatMap((f) => f.horses.map((h) => h.label)))
    );
    return labels.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true })
    );
  }, [drill]);

  const handleWheel = useCallback(
    (e: { evt: WheelEvent }) => {
      const ev = e.evt;
      ev.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mouseX = (ev.clientX || 0) - rect.left;
      const mouseY = (ev.clientY || 0) - rect.top;
      const delta = ev.deltaY || 0;
      const zoomStep = 0.05;
      const zoomFactor = 1 - (delta > 0 ? zoomStep : -zoomStep);
      const newZoom = Math.max(0.5, Math.min(3.0, zoom * zoomFactor));
      if (newZoom === zoom) return;
      const arenaDims = calculateArenaDimensions(dimensions.width, dimensions.height);
      const arenaX = (mouseX - (arenaDims.offsetX + pan.x)) / zoom;
      const arenaY = (mouseY - (arenaDims.offsetY + pan.y)) / zoom;
      setPan({
        x: mouseX - (arenaDims.offsetX + arenaX * newZoom),
        y: mouseY - (arenaDims.offsetY + arenaY * newZoom),
      });
      setZoom(newZoom);
    },
    [zoom, pan, dimensions, setZoom, setPan]
  );

  const handleTouchStart = useCallback(
    (e: { evt: TouchEvent }) => {
      const touches = e.evt.touches;
      if (!touches || touches.length !== 2) {
        pinchStateRef.current = null;
        return;
      }
      e.evt.preventDefault();
      const distance = getDistance(touches[0], touches[1]);
      const center = getCenter(touches[0], touches[1]);
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      pinchStateRef.current = {
        initialDistance: distance,
        initialZoom: zoom,
        initialPan: { ...pan },
        initialCenter: {
          x: center.x - rect.left,
          y: center.y - rect.top,
        },
      };
    },
    [zoom, pan]
  );

  const handleTouchMove = useCallback(
    (e: { evt: TouchEvent }) => {
      const touches = e.evt.touches;
      if (!touches || touches.length !== 2 || !pinchStateRef.current) return;
      e.evt.preventDefault();
      const state = pinchStateRef.current;
      const currentDistance = getDistance(touches[0], touches[1]);
      const currentCenter = getCenter(touches[0], touches[1]);
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const canvasCenter = {
        x: currentCenter.x - rect.left,
        y: currentCenter.y - rect.top,
      };
      const distanceRatio = currentDistance / state.initialDistance;
      const newZoom = Math.max(0.5, Math.min(3.0, state.initialZoom * distanceRatio));
      const arenaDims = calculateArenaDimensions(dimensions.width, dimensions.height);
      const initialArenaX = (state.initialCenter.x - (arenaDims.offsetX + state.initialPan.x)) / state.initialZoom;
      const initialArenaY = (state.initialCenter.y - (arenaDims.offsetY + state.initialPan.y)) / state.initialZoom;
      setPan({
        x: canvasCenter.x - (arenaDims.offsetX + initialArenaX * newZoom),
        y: canvasCenter.y - (arenaDims.offsetY + initialArenaY * newZoom),
      });
      setZoom(newZoom);
    },
    [dimensions, setZoom, setPan]
  );

  const handleTouchEnd = useCallback(() => {
    pinchStateRef.current = null;
  }, []);

  if (loading) {
    return (
      <div className="w-full h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-600 dark:text-gray-400">Loading drill…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to home
          </button>
        </div>
      </div>
    );
  }

  if (!drill) {
    return null;
  }

  const arenaDims = calculateArenaDimensions(dimensions.width, dimensions.height);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-4 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0">
          {drill.name}
        </h1>
        <button
          type="button"
          onClick={toggleTheme}
          className="flex-shrink-0 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      {/* Main: arena + horse list (column on portrait, row on landscape) */}
      <div className="flex-1 flex flex-col min-h-0 md:flex-row">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden relative w-full min-h-0 min-h-[200px]"
            style={{ touchAction: 'none' }}
          >
            <Stage
              width={dimensions.width}
              height={dimensions.height}
              style={{ background: theme === 'dark' ? '#2D2D2D' : '#F5F5DC' }}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Layer>
                <ArenaCanvas
                  width={arenaDims.width}
                  height={arenaDims.height}
                  offsetX={arenaDims.offsetX}
                  offsetY={arenaDims.offsetY}
                  zoom={zoom}
                  pan={pan}
                  playerMode
                  highlightHorseLabel={highlightHorseLabel}
                />
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Horse list: below arena on portrait, right sidebar on landscape */}
        <aside className="flex-shrink-0 w-full max-h-[35vh] md:max-h-none md:w-52 border-t border-gray-200 dark:border-gray-700 md:border-l bg-white dark:bg-gray-800 overflow-y-auto flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Highlight horse</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Click a label to highlight on the arena
            </p>
          </div>
          <ul className="p-2 flex-1 min-h-0">
            {sortedHorseLabels.length === 0 ? (
              <li className="text-sm text-gray-500 dark:text-gray-400 py-2">No horses</li>
            ) : (
              sortedHorseLabels.map((label) => (
                <li key={String(label)}>
                  <button
                    type="button"
                    onClick={() => setHighlightHorseLabel((prev) => (prev === label ? null : label))}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      highlightHorseLabel === label
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>

      {/* Playback controls */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <AnimationControls hideAudio />
      </div>
    </div>
  );
}
