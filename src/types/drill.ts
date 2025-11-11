import { Frame } from './frame';

export interface DrillMetadata {
  createdAt: Date;
  modifiedAt: Date;
  author?: string;
  description?: string;
}

export interface AudioTrack {
  url: string;
  offset: number; // seconds offset from start
  filename?: string;
}

export interface Drill {
  id: string;
  name: string;
  metadata: DrillMetadata;
  frames: Frame[];
  audioTrack?: AudioTrack;
}

export const createDrill = (id: string, name: string): Drill => ({
  id,
  name,
  metadata: {
    createdAt: new Date(),
    modifiedAt: new Date(),
  },
  frames: [],
});

