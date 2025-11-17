# Equestrian Drill Show IDE

A web-based Integrated Development Environment for creating, editing, and animating equestrian drill show routines.

## Features

- **Filmstrip Control**: Navigate through drill frames with visual previews
- **Frame Editor**: Precise horse positioning, sub-pattern management, and movement direction editing
- **Animation System**: Playback with audio synchronization and gait speed visualization
- **File Management**: Save and load drills to/from your PC
- **Flexible Architecture**: File format abstraction allows for future format changes

## Technology Stack

- **React 18+** with **TypeScript**
- **Vite** for build tooling
- **Zustand** for state management
- **Konva.js** or **React Canvas** for arena rendering
- **Web Audio API** for audio synchronization
- **Tailwind CSS** for styling

## Project Status

This project is in the planning phase. See `PLAN.md` for detailed specifications and implementation roadmap.

## Getting Started

Once development begins, setup will include:

```bash
npm install
npm run dev
```

## Arena Specifications

- Standard show arena dimensions (typically 20m x 40m or 20m x 60m)
- Supports 4-24 horses per drill
- Arena subdivided into 4 sections along length
- Midpoint line along width

## License

MIT License - see [LICENSE](LICENSE) file for details.

