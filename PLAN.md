# Equestrian Drill Show IDE - Project Plan

## Overview
A web-based IDE for creating, editing, and animating equestrian drill show routines. The application allows choreographers to design complex multi-horse formations with precise positioning, movement patterns, and timing.

## Technology Stack

### Frontend Framework
- **React 18+** with **TypeScript** - Component-based architecture with type safety
- **Vite** - Fast build tool and dev server

### UI/Graphics Rendering
- **React Canvas** or **Konva.js** (React wrapper) - High-performance 2D canvas rendering for arena and horses
- **Framer Motion** - Smooth animations and transitions for UI elements

### State Management
- **Zustand** - Lightweight state management for drill data, UI state, and editor state
- **React Context** - For deeply nested component communication (editor settings, theme)

### File I/O
- **File System Access API** (when available) - Native file save/load
- **File API** (fallback) - Download/upload for browsers without File System Access API
- **JSON** - Initial file format (easily swappable via abstraction layer)

### Audio
- **Web Audio API** - Audio playback and synchronization with animation
- **Howler.js** (optional) - Simplified audio management

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **CSS Modules** - Component-scoped styles where needed

### Additional Libraries
- **Zod** - Runtime type validation for file format
- **date-fns** - Time calculations for animation timing

## Architecture

### Project Structure
```
src/
├── components/
│   ├── Filmstrip/
│   │   ├── Filmstrip.tsx
│   │   ├── FrameThumbnail.tsx
│   │   └── FrameControls.tsx
│   ├── Editor/
│   │   ├── ArenaCanvas.tsx
│   │   ├── HorseRenderer.tsx
│   │   ├── MovementArrow.tsx
│   │   ├── SubPatternManager.tsx
│   │   └── EditorToolbar.tsx
│   ├── Animation/
│   │   ├── AnimationPlayer.tsx
│   │   ├── AudioSync.tsx
│   │   └── SpeedIndicator.tsx
│   ├── FileManager/
│   │   ├── FileSaveDialog.tsx
│   │   ├── FileLoadDialog.tsx
│   │   └── FileFormatAdapter.tsx (abstraction layer)
│   └── UI/
│       ├── Layout.tsx
│       ├── Sidebar.tsx
│       └── Toolbar.tsx
├── stores/
│   ├── drillStore.ts (Zustand)
│   ├── editorStore.ts
│   └── animationStore.ts
├── types/
│   ├── drill.ts (core data types)
│   ├── horse.ts
│   ├── frame.ts
│   └── fileFormat.ts
├── utils/
│   ├── arena.ts (arena calculations, grid)
│   ├── fileIO.ts (save/load abstraction)
│   ├── animation.ts (animation calculations)
│   └── audio.ts (audio synchronization)
├── constants/
│   ├── arena.ts (standard dimensions)
│   └── gaits.ts (walk, trot, canter speeds)
└── App.tsx
```

## Core Data Models

### Drill
```typescript
interface Drill {
  id: string;
  name: string;
  metadata: {
    createdAt: Date;
    modifiedAt: Date;
    author?: string;
    description?: string;
  };
  frames: Frame[];
  audioTrack?: {
    url: string;
    offset: number; // seconds offset from start
  };
}
```

### Frame
```typescript
interface Frame {
  id: string;
  index: number;
  timestamp: number; // seconds from start
  horses: Horse[];
  subPatterns: SubPattern[];
  duration: number; // seconds until next frame
}
```

### Horse
```typescript
interface Horse {
  id: string;
  label: string | number;
  position: Point; // { x: number, y: number }
  direction: number; // radians (0 = right, π/2 = up)
  speed: Gait; // 'walk' | 'trot' | 'canter'
  locked: boolean; // part of a sub-pattern?
  subPatternId?: string;
}
```

### SubPattern
```typescript
interface SubPattern {
  id: string;
  name?: string;
  horseIds: string[];
  locked: boolean;
  transform?: {
    rotation?: number;
    scale?: number;
  };
}
```

### Point
```typescript
interface Point {
  x: number; // 0-1 normalized coordinates
  y: number; // 0-1 normalized coordinates
}
```

## Feature Specifications

### 1. Filmstrip Control
- **Location**: Top or bottom of main editor area
- **Features**:
  - Horizontal scrollable list of frame thumbnails
  - Click to select/edit frame
  - Drag to reorder frames
  - Add/duplicate/delete frame buttons
  - Current frame indicator
  - Thumbnail shows:
    - Miniature arena with horse positions
    - Frame number/index
    - Duration indicator

### 2. Main Editor (Frame Editing)
- **Arena Canvas**:
  - Rectangular arena (standard show size: typically 20m x 40m or 20m x 60m)
  - Grid overlay (4 divisions along length, midpoint of width)
  - Coordinate system: normalized (0-1) for device independence
  - Zoom and pan controls
  
- **Horse Positioning**:
  - Click to select horse
  - Drag to reposition
  - Visual representation: colored circles or horse icons
  - Labels (numbers or names) displayed above/below horse
  - Snap to grid option
  
- **Sub-Pattern Management**:
  - Multi-select horses (Ctrl/Cmd + click, or drag selection box)
  - "Lock into Pattern" button creates sub-pattern
  - Locked horses move/rotate together
  - Visual indicator (colored outline) for sub-patterns
  - Unlock individual horses or entire pattern
  
- **Movement Direction**:
  - Toggle to show/hide direction arrows
  - Arrow points in movement direction
  - Click and drag arrow to adjust direction
  - Arrow length could indicate speed (optional)

### 3. Animation System
- **Playback Controls**:
  - Play/Pause
  - Stop
  - Speed control (0.5x, 1x, 2x)
  - Frame-by-frame navigation
  - Timeline scrubber
  
- **Visualization**:
  - Smooth interpolation between frames
  - Horses move along calculated paths
  - Real-time position updates
  
- **Audio Synchronization**:
  - Load audio file (MP3, WAV, etc.)
  - Set offset/start time
  - Sync animation to audio track
  - Audio waveform visualization (optional)
  
- **Speed Indicators**:
  - Color coding: Walk (green), Trot (yellow), Canter (red)
  - Visual indicator on horse or in sidebar
  - Speed affects animation interpolation rate

### 4. File Management
- **Save**:
  - "Save As" dialog (native or custom)
  - Export to JSON format
  - Filename: `[drill-name].drill.json`
  - Include all drill data, metadata, and audio reference
  
- **Load**:
  - "Open File" dialog
  - Validate file format
  - Import drill data
  - Load associated audio if referenced
  
- **File Format Abstraction**:
  - `FileFormatAdapter` interface
  - JSON implementation as default
  - Easy to swap for XML, binary, or custom format later
  - Versioning support for format evolution

### 5. Arena Specifications
- **Standard Dimensions**:
  - Typical show arena: 20m x 40m (or 20m x 60m)
  - Configurable in constants
  - Display with aspect ratio maintained
  
- **Markings**:
  - 4 equal divisions along length (vertical lines)
  - Midpoint line along width (horizontal line)
  - Optional: letter markers (A, B, C, D, E, F, etc.)
  - Optional: center marker

## User Interface Layout

```
┌─────────────────────────────────────────────────────────┐
│  [File] [Edit] [View] [Animation]  [Save] [Load]       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [◄] [Frame 1] [Frame 2] [Frame 3] ... [►]     │   │
│  │  Filmstrip with thumbnails                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [Tools]  [Show Arrows] [Snap to Grid]          │   │
│  ├──────────────────────────────────────────────────┤   │
│  │                                                   │   │
│  │              ARENA CANVAS                        │   │
│  │         (Main editing area)                      │   │
│  │                                                   │   │
│  │                                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [▶ Play] [⏸ Pause] [⏹ Stop] [Timeline]       │   │
│  │  Animation Controls                              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Horses: [List]  Sub-Patterns: [List]          │   │
│  │  Properties Panel                                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Core Infrastructure
1. Set up React + TypeScript + Vite project
2. Install and configure dependencies
3. Create basic project structure
4. Set up state management (Zustand stores)
5. Define TypeScript types/interfaces

### Phase 2: Arena & Basic Rendering
1. Create arena canvas component
2. Implement coordinate system (normalized 0-1)
3. Draw arena with grid markings
4. Render basic horse positions (circles)
5. Implement zoom/pan

### Phase 3: Frame Editing
1. Horse selection and dragging
2. Horse labels (numbers/names)
3. Movement direction arrows
4. Basic frame data structure

### Phase 4: Filmstrip
1. Frame thumbnails generation
2. Filmstrip UI component
3. Frame selection and navigation
4. Add/delete/duplicate frames

### Phase 5: Sub-Patterns
1. Multi-select horses
2. Create/delete sub-patterns
3. Lock/unlock functionality
4. Group movement/transformation

### Phase 6: Animation
1. Frame interpolation
2. Playback controls
3. Timeline scrubber
4. Speed indicators (gait visualization)

### Phase 7: Audio Integration
1. Audio file loading
2. Audio playback controls
3. Synchronization with animation
4. Offset/start time configuration

### Phase 8: File I/O
1. File format abstraction layer
2. JSON serialization/deserialization
3. Save functionality
4. Load functionality
5. File validation

### Phase 9: Polish & UX
1. Keyboard shortcuts
2. Undo/redo functionality
3. Tooltips and help text
4. Responsive design
5. Performance optimization

## Technical Considerations

### Performance
- Canvas rendering for 24 horses should be smooth (60fps)
- Thumbnail generation: cache or lazy load
- Large drill files: consider pagination or virtualization for filmstrip

### Browser Compatibility
- File System Access API: Chrome/Edge only
- Fallback to download/upload for other browsers
- Canvas API: widely supported
- Web Audio API: widely supported

### Data Persistence
- Consider localStorage for auto-save drafts
- IndexedDB for larger drill libraries (future feature)

### Accessibility
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

## Future Enhancements (Post-MVP)
- Export to video
- Multiple drill templates
- Collaboration features (real-time editing)
- 3D visualization
- Mobile/tablet support
- Drill library/cloud storage
- Print/PDF export of drill diagrams
- Music library integration

