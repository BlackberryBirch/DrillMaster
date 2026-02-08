# File Format Specification

## Overview

The drill file format is designed to be:
- Versioned for future compatibility (persistence version inside payload)
- Extensible for new features
- Easily swappable via abstraction layer

**Supported file format**: `.drill` (or `.drill.gz`) only. Plain `.drill.json` is no longer supported.

## .drill file layout

- **Extension**: `.drill` or `.drill.gz`
- **Layout**: 4-byte **magic header** (`EQDR` = 0x45 0x51 0x44 0x52) followed by **gzip-compressed** JSON.
- **Payload**: After decompression, the content is JSON with the structure below. The `version` field is the **persistence version** (e.g. `1.1.0`) for migration and validation.

### Payload structure (JSON inside .drill)

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
            "position": { "x": -10, "y": 0 },
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
  - Current version: "1.1.0"
  - Legacy version: "1.0.0" (uses normalized 0-1 coordinates, automatically migrated)
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
  - **x**: Number (meters from center, e.g., -40 to +40 for 80m long arena)
  - **y**: Number (meters from center, e.g., -20 to +20 for 40m wide arena)

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

- **Meters from Center**: All positions use meters from the arena center point
  - x: -ARENA_WIDTH/2 = left edge, 0 = center, +ARENA_WIDTH/2 = right edge
  - y: -ARENA_LENGTH/2 = top edge, 0 = center, +ARENA_LENGTH/2 = bottom edge
  - Example: For a 40m x 80m arena, x ranges from -20 to +20, y ranges from -40 to +40
- **Arena Dimensions**: Stored in application constants, not in file (default: 40m x 80m)
- **Benefits**: 
  - Portable across different arena sizes
  - Square coordinate space (no aspect ratio distortion)
  - Real-world units (meters) for intuitive positioning
- **Migration**: Files saved in version 1.0.0 (normalized 0-1 coordinates) are automatically migrated to meters from center when loaded

## Compressed format (.drill)

- **Extension**: `.drill` or `.drill.gz`
- **Content**: Gzip-compressed JSON. The inner structure is the same as the JSON format (includes `version`, `format`, and `drill`). The `version` field is the **persistence version** (e.g. `1.1.0`) for migration and validation.
- **Use**: Download from version history or upload from the home page. Supports smaller file sizes than `.drill.json`.

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

See `examples/sample-drill.drill` (to be created during development)

