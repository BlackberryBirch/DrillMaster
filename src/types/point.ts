export interface Point {
  x: number; // meters from center (e.g., -20 to +20 for 40m wide arena)
  y: number; // meters from center (e.g., -40 to +40 for 80m long arena)
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

