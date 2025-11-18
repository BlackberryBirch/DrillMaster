# UI/UX Design Reference

## Design Principles

1. **Editor-First**: Most screen space dedicated to frame editing
2. **Visual Clarity**: Clear distinction between editing and playback modes
3. **Efficient Workflow**: Minimize clicks to common actions
4. **Responsive Feedback**: Immediate visual feedback for all interactions

## Color Scheme

### Arena
- **Background**: Light gray or beige (#F5F5DC or #E8E8E8)
- **Grid Lines**: Light gray (#CCCCCC)
- **Division Lines**: Medium gray (#999999)
- **Midpoint Line**: Dashed medium gray

### Horses
- **Default Horse**: Blue circle (#3B82F6)
- **Selected Horse**: Orange outline (#F97316)
- **Locked Horse**: Purple outline (#A855F7)
- **Sub-Pattern Group**: Colored outline matching pattern

### UI Elements
- **Primary Actions**: Blue (#3B82F6)
- **Danger Actions**: Red (#EF4444)
- **Success/Play**: Green (#10B981)
- **Background**: White/Light gray

## Typography

- **Headings**: Sans-serif (Inter, Roboto, or system default)
- **Body**: Sans-serif, readable
- **Labels**: Small, clear, high contrast
- **Code/Monospace**: For technical displays only

## Component Specifications

### Filmstrip
- **Height**: 120-150px
- **Thumbnail Size**: 100x75px (maintains arena aspect ratio)
- **Spacing**: 8px between thumbnails
- **Current Frame**: Highlighted border (2px, primary color)
- **Scroll**: Horizontal, smooth scrolling
- **Controls**: Add/Delete buttons on hover or toolbar

### Arena Canvas
- **Minimum Size**: 800x600px
- **Aspect Ratio**: Maintain arena proportions
- **Zoom Range**: 0.5x to 3x
- **Grid Snapping**: Visual indicator when enabled
- **Horse Size**: 12-16px radius (scales with zoom)

### Horse Labels
- **Position**: Above horse (or configurable)
- **Size**: 10-12px font
- **Background**: Semi-transparent white/black for contrast
- **Format**: Numbers (1, 2, 3...) or Names (custom)

### Movement Arrows
- **Length**: 20-30px (or proportional to speed)
- **Width**: 2px
- **Color**: Dark gray or horse color
- **Head**: Arrowhead triangle
- **Toggle**: Show/Hide checkbox in toolbar

### Animation Controls
- **Layout**: Horizontal bar at bottom
- **Buttons**: Play, Pause, Stop, Previous Frame, Next Frame
- **Timeline**: Horizontal scrubber with frame markers
- **Speed Control**: Dropdown or slider (0.5x, 1x, 1.5x, 2x)
- **Audio Controls**: Volume, mute, sync offset

### Properties Panel
- **Location**: Right sidebar (collapsible)
- **Sections**:
  - Selected Horse Properties
  - Sub-Patterns List
  - Frame Properties
  - Audio Settings
- **Width**: 250-300px

## Interaction Patterns

### Selecting Horses
- **Single Click**: Select horse
- **Ctrl/Cmd + Click**: Multi-select
- **Drag Box**: Select multiple horses
- **Click Empty**: Deselect all

### Moving Horses
- **Drag**: Move selected horse(s)
- **Arrow Keys**: Nudge selected horse (1px or grid unit)
- **Shift + Arrow**: Larger nudge (5px or 5 grid units)

### Creating Sub-Patterns
1. Select multiple horses
2. Click "Create Pattern" or keyboard shortcut
3. Pattern appears in sidebar
4. Horses visually grouped (colored outline)

### Editing Frames
- **Select Frame**: Click thumbnail in filmstrip
- **Add Frame**: Button in filmstrip or keyboard shortcut
- **Delete Frame**: Delete key or button
- **Duplicate Frame**: Button or keyboard shortcut

### Animation
- **Play**: Spacebar or play button
- **Pause**: Spacebar or pause button
- **Scrub**: Click/drag timeline
- **Frame Navigation**: Left/Right arrow keys

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Play/Pause | Space |
| Next Frame | Right Arrow |
| Previous Frame | Left Arrow |
| Add Frame | Ctrl/Cmd + N |
| Delete Frame | Delete |
| Duplicate Frame | Ctrl/Cmd + D |
| Select All | Ctrl/Cmd + A |
| Deselect | Escape |
| Undo | Ctrl/Cmd + Z |
| Redo | Ctrl/Cmd + Y |
| Save | Ctrl/Cmd + S |
| Open | Ctrl/Cmd + O |
| Toggle Arrows | A |
| Toggle Grid | G |
| Zoom In | Ctrl/Cmd + Plus |
| Zoom Out | Ctrl/Cmd + Minus |

## Responsive Design

### Desktop (Primary)
- Full feature set
- All panels visible
- Optimal for editing

### Tablet
- Collapsible sidebars
- Touch-friendly controls
- Simplified toolbar

### Mobile (Future)
- Single panel at a time
- Touch gestures
- Simplified UI

## Accessibility

### Keyboard Navigation
- All features accessible via keyboard
- Tab order: logical flow
- Focus indicators: visible outlines

### Screen Readers
- ARIA labels on all interactive elements
- Descriptive alt text for visual elements
- Status announcements for state changes

### Visual
- High contrast mode option
- Color-blind friendly (don't rely solely on color)
- Adjustable font sizes

## Loading States

- **File Loading**: Progress indicator
- **Audio Loading**: Loading spinner
- **Thumbnail Generation**: Placeholder or skeleton
- **Animation Rendering**: Smooth, no stutter

## Error Handling

### User-Friendly Messages
- "Unable to load file: Invalid format"
- "Audio file not found: [filename]"
- "Frame data corrupted, using defaults"

### Recovery
- Auto-save drafts (localStorage)
- Undo/redo for mistakes
- Validation before save

## Performance Targets

- **Frame Rate**: 60fps during animation
- **Interaction Latency**: <100ms
- **File Load Time**: <2s for typical drill (24 horses, 50 frames)
- **Thumbnail Generation**: <500ms per frame

