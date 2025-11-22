// Standard show arena dimensions
// Typical: 20m x 40m or 20m x 60m
// Using 40m x 80m as default (1:2 aspect ratio)

export const ARENA_WIDTH = 40; // meters
export const ARENA_LENGTH = 80; // meters
export const ARENA_ASPECT_RATIO = ARENA_LENGTH / ARENA_WIDTH; // 2:1 (length:width)

// Arena divisions
export const ARENA_DIVISIONS_LENGTH = 4; // 4 divisions along length
export const ARENA_MIDPOINT_WIDTH = true; // Show midpoint along width

// Coordinate system uses meters from center
// x: -ARENA_LENGTH/2 = left edge, 0 = center, +ARENA_LENGTH/2 = right edge (along length, 80m)
// y: -ARENA_WIDTH/2 = top edge, 0 = center, +ARENA_WIDTH/2 = bottom edge (along width, 40m)
// This ensures portability when arena dimensions change and creates a square coordinate space

/**
 * Convert normalized coordinates (0-1) to meters from center
 * Used for migrating old files
 * X coordinate uses ARENA_LENGTH (80m), Y coordinate uses ARENA_WIDTH (40m)
 */
export const normalizedToMeters = (normalizedX: number, normalizedY: number): { x: number; y: number } => {
  return {
    x: (normalizedX - 0.5) * ARENA_LENGTH,
    y: (normalizedY - 0.5) * ARENA_WIDTH,
  };
};

/**
 * Convert meters from center to normalized coordinates (0-1)
 * Used for backward compatibility during migration
 * X coordinate uses ARENA_LENGTH (80m), Y coordinate uses ARENA_WIDTH (40m)
 */
export const metersToNormalized = (metersX: number, metersY: number): { x: number; y: number } => {
  return {
    x: (metersX / ARENA_LENGTH) + 0.5,
    y: (metersY / ARENA_WIDTH) + 0.5,
  };
};

