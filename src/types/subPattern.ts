export interface SubPattern {
  id: string;
  name?: string;
  horseIds: string[];
  locked: boolean;
  transform?: {
    rotation?: number;
    scale?: number;
  };
}

export const createSubPattern = (
  id: string,
  horseIds: string[],
  name?: string
): SubPattern => ({
  id,
  name,
  horseIds,
  locked: true,
  transform: {
    rotation: 0,
    scale: 1.0,
  },
});

