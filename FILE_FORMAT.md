# File Format Specification

## Overview

The drill file format is designed to be:
- Human-readable (JSON)
- Versioned for future compatibility
- Extensible for new features
- Easily swappable via abstraction layer

## Format: JSON (Default)

### File Extension
`.drill.json`

### Structure

```json
{
  "version": "1.0.0",
  "format": "drill-json",
  "drill": {
    "id": "uuid-string",
    "name": "My Drill Routine",
    "metadata": {
      "createdAt": "2024-01-01T00:00:00Z",
      "modifiedAt": "2024-01-01T00:00:00Z",
      "author": "John Doe",
      "description": "Optional description"
    },
    "frames": [
      {
        "id": "frame-uuid",
        "index": 0,
        "timestamp": 0.0,
        "duration": 5.0,
        "horses": [
          {
            "id": "horse-uuid",
            "label": "1",
            "position": { "x": 0.25, "y": 0.5 },
            "direction": 0.0,
            "speed": "walk",
            "locked": false,
            "subPatternId": null
          }
        ],
        "subPatterns": [
          {
            "id": "pattern-uuid",
            "name": "Diamond Formation",
            "horseIds": ["horse-uuid-1", "horse-uuid-2"],
            "locked": true,
            "transform": {
              "rotation": 0.0,
              "scale": 1.0
            }
          }
        ]
      }
    ],
    "audioTrack": {
      "url": "path/to/audio.mp3",
      "offset": 0.0,
      "filename": "audio.mp3"
    }
  }
}
```

## Field Definitions

### Version
- **version**: String (semver format)
  - Current version: "1.0.0"
  - Used for format migration/validation

### Format
- **format**: String
  - Identifies the file format type
  - Default: "drill-json"

### Drill
- **id**: String (UUID)
  - Unique identifier for the drill

- **name**: String
  - Display name of the drill

- **metadata**: Object
  - **createdAt**: ISO 8601 timestamp
  - **modifiedAt**: ISO 8601 timestamp
  - **author**: String (optional)
  - **description**: String (optional)

### Frame
- **id**: String (UUID)
  - Unique identifier for the frame

- **index**: Number
  - Sequential frame number (0-based)

- **timestamp**: Number
  - Time in seconds from drill start

- **duration**: Number
  - Duration in seconds until next frame

- **horses**: Array of Horse objects
- **subPatterns**: Array of SubPattern objects

### Horse
- **id**: String (UUID)
  - Unique identifier for the horse

- **label**: String | Number
  - Display label (number or name)

- **position**: Object
  - **x**: Number (0.0 - 1.0, normalized)
  - **y**: Number (0.0 - 1.0, normalized)

- **direction**: Number
  - Direction in radians (0 = right, π/2 = up, π = left, 3π/2 = down)

- **speed**: String
  - Gait: "walk" | "trot" | "canter"

- **locked**: Boolean
  - Whether horse is part of a locked sub-pattern

- **subPatternId**: String | null
  - ID of sub-pattern this horse belongs to (if any)

### SubPattern
- **id**: String (UUID)
  - Unique identifier for the sub-pattern

- **name**: String (optional)
  - Display name for the pattern

- **horseIds**: Array of Strings
  - UUIDs of horses in this pattern

- **locked**: Boolean
  - Whether the pattern is locked (horses move together)

- **transform**: Object (optional)
  - **rotation**: Number (radians)
  - **scale**: Number (1.0 = normal size)

### AudioTrack
- **url**: String
  - Path or URL to audio file (relative or absolute)

- **offset**: Number
  - Start time offset in seconds

- **filename**: String
  - Original filename for reference

## Coordinate System

- **Normalized Coordinates**: All positions use 0.0-1.0 range
  - x: 0.0 = left edge, 1.0 = right edge
  - y: 0.0 = top edge, 1.0 = bottom edge
- **Arena Dimensions**: Stored in application constants, not in file
- **Benefits**: Device-independent, resolution-independent

## Future Format Support

The abstraction layer (`FileFormatAdapter`) allows for:
- XML format
- Binary format (for smaller file sizes)
- Custom proprietary formats
- Version migration/upgrading

## Validation

Files should be validated using:
- JSON schema validation
- Zod runtime validation
- Version compatibility checks

## Example File

See `examples/sample-drill.drill.json` (to be created during development)

