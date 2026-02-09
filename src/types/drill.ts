import { Frame } from './frame';

export interface DrillMetadata {
  createdAt: Date;
  modifiedAt: Date;
  author?: string;
  description?: string;
}

export interface AudioTrack {
  url: string; // Signed URL for playback (temporary, never saved to DB)
  storagePath?: string; // Cloud storage path (saved to DB, never the signed URL)
  offset: number; // seconds offset from start
  filename?: string;
}

/** Global mapping from horse number (label) to rider name. Applies to all frames. */
export type RiderNamesByLabel = Record<string, string>;

export interface Drill {
  id: string;
  name: string;
  metadata: DrillMetadata;
  frames: Frame[];
  /** Horse number (label) → rider name. Global to the whole drill. */
  riderNames?: RiderNamesByLabel;
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

