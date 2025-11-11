# Setup Instructions

## Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown (typically http://localhost:5173)

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

- `src/types/` - TypeScript type definitions
- `src/stores/` - Zustand state management stores
- `src/components/` - React components
- `src/utils/` - Utility functions
- `src/constants/` - Constants and configuration

## Features Implemented

✅ Filmstrip control with frame previews
✅ Frame editing with horse positioning
✅ Horse labels (numbers)
✅ Movement direction arrows
✅ Save/Load functionality (JSON format)
✅ Basic animation controls
✅ Arena with grid divisions
✅ Zoom and pan controls

## Next Steps (Future Enhancements)

- Sub-pattern creation and management
- Audio synchronization
- Full animation playback
- Horse speed visualization
- Undo/redo functionality
- Keyboard shortcuts
- Horse name editing
- More advanced sub-pattern transformations

