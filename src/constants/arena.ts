// Standard show arena dimensions
// Typical: 20m x 40m or 20m x 60m
// Using 40m x 80m as default (1:2 aspect ratio)

export const ARENA_WIDTH = 40; // meters
export const ARENA_LENGTH = 80; // meters
export const ARENA_ASPECT_RATIO = ARENA_LENGTH / ARENA_WIDTH; // 2:1 (length:width)

// Arena divisions
export const ARENA_DIVISIONS_LENGTH = 4; // 4 divisions along length
export const ARENA_MIDPOINT_WIDTH = true; // Show midpoint along width

// Coordinate system uses normalized 0-1 range
// x: 0 = left edge, 1 = right edge
// y: 0 = top edge, 1 = bottom edge

