import { Drill, DrillFile, FileFormatAdapter } from '../types';

/**
 * JSON File Format Adapter
 */
export class JSONFileFormatAdapter implements FileFormatAdapter {
  private readonly version = '1.0.0';
  private readonly format = 'drill-json';

  serialize(drill: Drill): string {
    // Create a copy of the drill, but exclude the signed URL from audioTrack
    // Only save storagePath, not the temporary signed URL
    const drillToSave = {
      ...drill,
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

  deserialize(data: string): Drill {
    const file: DrillFile = JSON.parse(data);

    if (!this.validate(file)) {
      throw new Error('Invalid file format');
    }

    // Convert date strings back to Date objects
    return {
      ...file.drill,
      metadata: {
        ...file.drill.metadata,
        createdAt: new Date(file.drill.metadata.createdAt),
        modifiedAt: new Date(file.drill.metadata.modifiedAt),
      },
    };
  }

  validate(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const file = data as Partial<DrillFile>;
    return (
      file.version === this.version &&
      file.format === this.format &&
      file.drill !== undefined &&
      Array.isArray(file.drill.frames)
    );
  }

  getFileExtension(): string {
    return '.drill.json';
  }
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

  async saveDrill(drill: Drill, filename?: string): Promise<void> {
    const data = this.adapter.serialize(drill);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${drill.name}${this.adapter.getFileExtension()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async loadDrill(file: File): Promise<Drill> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string;
          const drill = this.adapter.deserialize(data);
          resolve(drill);
        } catch (error) {
          reject(new Error(`Failed to load drill: ${error}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

// Default instance
export const fileIO = new FileIO();

