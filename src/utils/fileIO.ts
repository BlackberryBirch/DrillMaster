import { Drill, DrillFile, FileFormatAdapter } from '../types';
import { normalizedToMeters } from '../constants/arena';

/**
 * JSON File Format Adapter
 */
export class JSONFileFormatAdapter implements FileFormatAdapter {
  private readonly version = '1.1.0'; // Updated to reflect coordinate system change
  private readonly format = 'drill-json';
  private readonly legacyVersion = '1.0.0'; // Old version with normalized coordinates

  serialize(drill: Drill): string {
    // Regenerate frame timestamps before saving to ensure consistency
    const framesWithRegeneratedTimestamps = drill.frames && drill.frames.length > 0
      ? this.regenerateFrameTimestamps(drill.frames)
      : drill.frames;
    
    // Create a copy of the drill, but exclude the signed URL from audioTrack
    // Only save storagePath, not the temporary signed URL
    const drillToSave = {
      ...drill,
      frames: framesWithRegeneratedTimestamps,
      metadata: {
        ...drill.metadata,
        createdAt: drill.metadata.createdAt,
        modifiedAt: new Date(),
      },
      audioTrack: drill.audioTrack ? {
        // Exclude url (signed URL) - only save storagePath
        // url will be reconstructed when loading from storagePath
        storagePath: drill.audioTrack.storagePath,
        offset: drill.audioTrack.offset,
        filename: drill.audioTrack.filename,
      } : undefined,
    } as Drill; // Type assertion: url is intentionally omitted and will be reconstructed on load

    const file: DrillFile = {
      version: this.version,
      format: this.format,
      drill: drillToSave,
    };

    return JSON.stringify(file, null, 2);
  }

  /**
   * Regenerates all frame timestamps based on their durations.
   * The first frame always has timestamp 0, and each subsequent frame's
   * timestamp is the sum of all previous frames' durations.
   */
  private regenerateFrameTimestamps(frames: Drill['frames']): Drill['frames'] {
    if (frames.length === 0) return frames;
    
    return frames.map((frame, index) => {
      if (index === 0) {
        // First frame always starts at 0
        return { ...frame, timestamp: 0 };
      } else {
        // Each subsequent frame's timestamp is the sum of all previous durations
        const timestamp = frames
          .slice(0, index)
          .reduce((sum, prevFrame) => sum + prevFrame.duration, 0);
        return { ...frame, timestamp };
      }
    });
  }

  /**
   * Migrate old normalized coordinates (0-1) to meters from center
   * Processes all frames and all horses in each frame
   * This is public so it can be used by cloud storage adapter
   */
  migrateCoordinates(drill: Drill): Drill {
    // Ensure we have frames to process
    if (!drill.frames || drill.frames.length === 0) {
      return drill;
    }

    return {
      ...drill,
      frames: drill.frames.map((frame) => {
        // Ensure frame has horses array
        if (!frame.horses || frame.horses.length === 0) {
          return frame;
        }

        return {
          ...frame,
          horses: frame.horses.map((horse) => {
            // Validate position exists
            if (!horse.position || typeof horse.position.x !== 'number' || typeof horse.position.y !== 'number') {
              // Invalid position, skip conversion
              return horse;
            }

            // Check if coordinates are in old normalized format (0-1 range)
            // Old format: x and y are both in [0, 1] range (with slight tolerance for floating point errors)
            // New format: x in [-20, 20], y in [-40, 40] for 40m x 80m arena
            // We use a small tolerance to handle floating point precision (e.g., 0.99999999)
            const tolerance = 0.001;
            const isOldFormat = 
              (horse.position.x >= 0 - tolerance && horse.position.x <= 1 + tolerance) &&
              (horse.position.y >= 0 - tolerance && horse.position.y <= 1 + tolerance);
            
            if (isOldFormat) {
              // Clamp to valid range before conversion to handle floating point errors
              const clampedX = Math.max(0, Math.min(1, horse.position.x));
              const clampedY = Math.max(0, Math.min(1, horse.position.y));
              
              // Convert from normalized to meters
              const metersPos = normalizedToMeters(clampedX, clampedY);
              
              return {
                ...horse,
                position: metersPos,
              };
            }
            
            // Already in new format (outside 0-1 range), no conversion needed
            return horse;
          }),
        };
      }),
    };
  }

  deserialize(data: string): Drill {
    const file: DrillFile = JSON.parse(data);

    if (!this.validate(file)) {
      throw new Error('Invalid file format');
    }

    // Convert date strings back to Date objects
    let drill: Drill = {
      ...file.drill,
      metadata: {
        ...file.drill.metadata,
        createdAt: new Date(file.drill.metadata.createdAt),
        modifiedAt: new Date(file.drill.metadata.modifiedAt),
      },
    };

    // Migrate old files with normalized coordinates to meters-based coordinates
    if (file.version === this.legacyVersion) {
      drill = this.migrateCoordinates(drill);
    }

    // Regenerate frame timestamps when loading to ensure consistency
    if (drill.frames && drill.frames.length > 0) {
      drill = {
        ...drill,
        frames: this.regenerateFrameTimestamps(drill.frames),
      };
    }

    return drill;
  }

  validate(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const file = data as Partial<DrillFile>;
    // Accept both old and new versions for backward compatibility
    return (
      (file.version === this.version || file.version === this.legacyVersion) &&
      file.format === this.format &&
      file.drill !== undefined &&
      Array.isArray(file.drill.frames)
    );
  }

  getFileExtension(): string {
    return '.drill';
  }
}

/** Magic bytes at the start of every .drill file (ASCII "EQDR" = Equimotion Drill) */
export const DRILL_FILE_MAGIC = new Uint8Array([0x45, 0x51, 0x44, 0x52]);

/** Footer magic at the end of every .drill file. */
const DRILL_FILE_FOOTER_MAGIC = new Uint8Array([0x52, 0x44, 0x51, 0x45]); // "RDQE"

/** Key for XOR obfuscation of the gzip payload so 7-Zip and other tools don't detect gzip. */
const DRILL_OBFUSCATION_KEY = new Uint8Array([0xa5, 0x51, 0x44, 0x52]);

const GZIP_MAGIC_FIRST = 0x1f;
const GZIP_MAGIC_SECOND = 0x8b;

function xorBytes(buffer: ArrayBuffer, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(buffer.byteLength);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < view.length; i++) {
    out[i] = view[i] ^ key[i % key.length];
  }
  return out;
}

function isDrillFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.drill') || file.name.toLowerCase().endsWith('.drill.gz');
}

/**
 * Compress a string with gzip using the Compression Streams API.
 * .drill files are always gzip-compressed; requires a supporting browser.
 */
async function gzipCompress(data: string): Promise<Blob> {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('Saving .drill files requires a browser that supports CompressionStream');
  }
  const blob = new Blob([data], { type: 'application/json' });
  const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
  return await new Response(stream).blob();
}

/**
 * Decompress gzip bytes to a string using the Decompression Streams API.
 */
async function gzipDecompress(buffer: ArrayBuffer): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Compressed drill files require a browser that supports DecompressionStream');
  }
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  const blob = await new Response(stream).blob();
  return await blob.text();
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * File I/O operations
 */
export class FileIO {
  private adapter: FileFormatAdapter;

  constructor(adapter: FileFormatAdapter = new JSONFileFormatAdapter()) {
    this.adapter = adapter;
  }

  setAdapter(adapter: FileFormatAdapter): void {
    this.adapter = adapter;
  }

  /** Default extension for .drill files (MAGIC + gzip, persistence version inside JSON) */
  getCompressedExtension(): string {
    return '.drill';
  }

  /**
   * Save drill as a compressed file. Layout: [header magic][XOR-obfuscated gzip][footer magic].
   * The obfuscation prevents 7-Zip and other decompressors from recognizing the payload as gzip.
   */
  async saveDrillCompressed(drill: Drill, filename?: string): Promise<void> {
    const data = this.adapter.serialize(drill);
    const gzipBlob = await gzipCompress(data);
    const gzipBuf = await new Response(gzipBlob).arrayBuffer();
    const obfuscated = xorBytes(gzipBuf, DRILL_OBFUSCATION_KEY);
    const full = new Blob([
      DRILL_FILE_MAGIC,
      obfuscated,
      DRILL_FILE_FOOTER_MAGIC,
    ]);
    const url = URL.createObjectURL(full);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${drill.name}${this.getCompressedExtension()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async loadDrill(file: File): Promise<Drill> {
    if (!isDrillFile(file)) {
      throw new Error('Only .drill files are supported. Use a file with extension .drill or .drill.gz');
    }
    const buffer = await readFileAsArrayBuffer(file);
    const minLength = DRILL_FILE_MAGIC.length + DRILL_FILE_FOOTER_MAGIC.length;
    if (buffer.byteLength < DRILL_FILE_MAGIC.length) {
      throw new Error('Invalid .drill file: too short');
    }
    const bytes = new Uint8Array(buffer, 0, DRILL_FILE_MAGIC.length);
    for (let i = 0; i < DRILL_FILE_MAGIC.length; i++) {
      if (bytes[i] !== DRILL_FILE_MAGIC[i]) {
        throw new Error('Invalid .drill file: missing or incorrect magic header');
      }
    }
    let gzipPayload: ArrayBuffer;
    if (buffer.byteLength >= minLength) {
      const view = new Uint8Array(buffer);
      const footerStart = buffer.byteLength - DRILL_FILE_FOOTER_MAGIC.length;
      let hasFooter = true;
      for (let i = 0; i < DRILL_FILE_FOOTER_MAGIC.length; i++) {
        if (view[footerStart + i] !== DRILL_FILE_FOOTER_MAGIC[i]) {
          hasFooter = false;
          break;
        }
      }
      if (hasFooter) {
        gzipPayload = buffer.slice(DRILL_FILE_MAGIC.length, footerStart);
      } else {
        gzipPayload = buffer.slice(DRILL_FILE_MAGIC.length);
      }
    } else {
      gzipPayload = buffer.slice(DRILL_FILE_MAGIC.length);
    }
    const view = new Uint8Array(gzipPayload);
    const isPlainGzip =
      view.length >= 2 && view[0] === GZIP_MAGIC_FIRST && view[1] === GZIP_MAGIC_SECOND;
    const toDecompress = isPlainGzip ? gzipPayload : xorBytes(gzipPayload, DRILL_OBFUSCATION_KEY).buffer;
    const data = await gzipDecompress(toDecompress);
    return this.adapter.deserialize(data);
  }
}

// Default instance
export const fileIO = new FileIO();

