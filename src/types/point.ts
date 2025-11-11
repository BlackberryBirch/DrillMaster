export interface Point {
  x: number; // 0-1 normalized coordinates
  y: number; // 0-1 normalized coordinates
}

export const createPoint = (x: number, y: number): Point => ({ x, y });

export const normalizePoint = (x: number, y: number, width: number, height: number): Point => ({
  x: x / width,
  y: y / height,
});

export const denormalizePoint = (point: Point, width: number, height: number): { x: number; y: number } => ({
  x: point.x * width,
  y: point.y * height,
});

