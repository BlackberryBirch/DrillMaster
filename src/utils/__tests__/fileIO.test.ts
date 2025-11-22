import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSONFileFormatAdapter, FileIO } from '../fileIO';
import { createDrill, createFrame } from '../../types';
import { generateId } from '../uuid';

describe('JSONFileFormatAdapter', () => {
  let adapter: JSONFileFormatAdapter;

  beforeEach(() => {
    adapter = new JSONFileFormatAdapter();
  });

  describe('serialize', () => {
    it('should serialize drill to JSON string', () => {
      const drill = createDrill('test-id', 'Test Drill');
      const frame = createFrame(generateId(), 0, 0, 5.0);
      drill.frames = [frame];

      const result = adapter.serialize(drill);
      const parsed = JSON.parse(result);

      expect(parsed.version).toBe('1.1.0');
      expect(parsed.format).toBe('drill-json');
      expect(parsed.drill.id).toBe('test-id');
      expect(parsed.drill.name).toBe('Test Drill');
      expect(parsed.drill.frames).toHaveLength(1);
    });

    it('should update modifiedAt timestamp', () => {
      const drill = createDrill('test-id', 'Test Drill');
      const oldModified = drill.metadata.modifiedAt;

      // Wait a bit to ensure different timestamp
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      const result = adapter.serialize(drill);
      const parsed = JSON.parse(result);
      const newModified = new Date(parsed.drill.metadata.modifiedAt);

      expect(newModified.getTime()).toBeGreaterThan(oldModified.getTime());
      vi.useRealTimers();
    });
  });

  describe('deserialize', () => {
    it('should deserialize JSON string to drill', () => {
      const drill = createDrill('test-id', 'Test Drill');
      const frame = createFrame(generateId(), 0, 0, 5.0);
      drill.frames = [frame];

      const serialized = adapter.serialize(drill);
      const result = adapter.deserialize(serialized);

      expect(result.id).toBe('test-id');
      expect(result.name).toBe('Test Drill');
      expect(result.frames).toHaveLength(1);
      expect(result.metadata.createdAt).toBeInstanceOf(Date);
      expect(result.metadata.modifiedAt).toBeInstanceOf(Date);
    });

    it('should throw error for invalid format', () => {
      expect(() => {
        adapter.deserialize('invalid json');
      }).toThrow();
    });

    it('should migrate old version files with normalized coordinates to meters', () => {
      // Create old format file (version 1.0.0) with normalized coordinates
      const oldFormatFile = {
        version: '1.0.0',
        format: 'drill-json',
        drill: {
          id: 'test-id',
          name: 'Test Drill',
          metadata: {
            createdAt: '2024-01-01T00:00:00Z',
            modifiedAt: '2024-01-01T00:00:00Z',
          },
          frames: [
            {
              id: 'frame-1',
              index: 0,
              timestamp: 0,
              duration: 5.0,
              horses: [
                {
                  id: 'horse-1',
                  label: 1,
                  position: { x: 0.0, y: 0.0 }, // Top-left (old format)
                  direction: 0,
                  speed: 'walk',
                },
                {
                  id: 'horse-2',
                  label: 2,
                  position: { x: 0.5, y: 0.5 }, // Center (old format)
                  direction: Math.PI / 2,
                  speed: 'trot',
                },
                {
                  id: 'horse-3',
                  label: 3,
                  position: { x: 1.0, y: 1.0 }, // Bottom-right (old format)
                  direction: Math.PI,
                  speed: 'canter',
                },
              ],
              subPatterns: [],
            },
            {
              id: 'frame-2',
              index: 1,
              timestamp: 5.0,
              duration: 5.0,
              horses: [
                {
                  id: 'horse-4',
                  label: 4,
                  position: { x: 0.25, y: 0.75 }, // Old format
                  direction: 0,
                  speed: 'walk',
                },
              ],
              subPatterns: [],
            },
          ],
        },
      };

      const serialized = JSON.stringify(oldFormatFile);
      const result = adapter.deserialize(serialized);

      // Verify all frames were processed
      expect(result.frames).toHaveLength(2);

      // Verify first frame horses were migrated
      const frame1Horses = result.frames[0].horses;
      expect(frame1Horses).toHaveLength(3);
      
      // Horse 1: (0.0, 0.0) normalized -> (-40, -20) meters (X uses LENGTH, Y uses WIDTH)
      expect(frame1Horses[0].position.x).toBe(-40);
      expect(frame1Horses[0].position.y).toBe(-20);
      
      // Horse 2: (0.5, 0.5) normalized -> (0, 0) meters
      expect(frame1Horses[1].position.x).toBe(0);
      expect(frame1Horses[1].position.y).toBe(0);
      
      // Horse 3: (1.0, 1.0) normalized -> (40, 20) meters (X uses LENGTH, Y uses WIDTH)
      expect(frame1Horses[2].position.x).toBe(40);
      expect(frame1Horses[2].position.y).toBe(20);

      // Verify second frame horses were migrated
      const frame2Horses = result.frames[1].horses;
      expect(frame2Horses).toHaveLength(1);
      
      // Horse 4: (0.25, 0.75) normalized -> (-20, 10) meters (X uses LENGTH, Y uses WIDTH)
      expect(frame2Horses[0].position.x).toBe(-20);
      expect(frame2Horses[0].position.y).toBe(10);

      // Verify other properties are preserved
      expect(frame1Horses[0].id).toBe('horse-1');
      expect(frame1Horses[0].label).toBe(1);
      expect(frame1Horses[0].direction).toBe(0);
      expect(frame1Horses[0].speed).toBe('walk');
    });

    it('should not migrate new version files (already in meters)', () => {
      // Create new format file (version 1.1.0) with meters
      const newFormatFile = {
        version: '1.1.0',
        format: 'drill-json',
        drill: {
          id: 'test-id',
          name: 'Test Drill',
          metadata: {
            createdAt: '2024-01-01T00:00:00Z',
            modifiedAt: '2024-01-01T00:00:00Z',
          },
          frames: [
            {
              id: 'frame-1',
              index: 0,
              timestamp: 0,
              duration: 5.0,
              horses: [
                {
                  id: 'horse-1',
                  label: 1,
                  position: { x: -20, y: -40 }, // Already in meters
                  direction: 0,
                  speed: 'walk',
                },
                {
                  id: 'horse-2',
                  label: 2,
                  position: { x: 0, y: 0 }, // Already in meters (center)
                  direction: Math.PI / 2,
                  speed: 'trot',
                },
              ],
              subPatterns: [],
            },
          ],
        },
      };

      const serialized = JSON.stringify(newFormatFile);
      const result = adapter.deserialize(serialized);

      // Verify positions were NOT changed (already in meters)
      const horses = result.frames[0].horses;
      expect(horses[0].position.x).toBe(-20);
      expect(horses[0].position.y).toBe(-40);
      expect(horses[1].position.x).toBe(0);
      expect(horses[1].position.y).toBe(0);
    });

    it('should handle empty frames and frames with no horses', () => {
      const oldFormatFile = {
        version: '1.0.0',
        format: 'drill-json',
        drill: {
          id: 'test-id',
          name: 'Test Drill',
          metadata: {
            createdAt: '2024-01-01T00:00:00Z',
            modifiedAt: '2024-01-01T00:00:00Z',
          },
          frames: [
            {
              id: 'frame-1',
              index: 0,
              timestamp: 0,
              duration: 5.0,
              horses: [], // Empty frame
              subPatterns: [],
            },
            {
              id: 'frame-2',
              index: 1,
              timestamp: 5.0,
              duration: 5.0,
              horses: [
                {
                  id: 'horse-1',
                  label: 1,
                  position: { x: 0.5, y: 0.5 },
                  direction: 0,
                  speed: 'walk',
                },
              ],
              subPatterns: [],
            },
          ],
        },
      };

      const serialized = JSON.stringify(oldFormatFile);
      const result = adapter.deserialize(serialized);

      // Verify both frames exist
      expect(result.frames).toHaveLength(2);
      
      // First frame should be empty
      expect(result.frames[0].horses).toHaveLength(0);
      
      // Second frame should have migrated horse
      expect(result.frames[1].horses).toHaveLength(1);
      expect(result.frames[1].horses[0].position.x).toBe(0);
      expect(result.frames[1].horses[0].position.y).toBe(0);
    });
  });

  describe('validate', () => {
    it('should validate correct file format', () => {
      const drill = createDrill('test-id', 'Test Drill');
      const serialized = adapter.serialize(drill);
      const parsed = JSON.parse(serialized);

      expect(adapter.validate(parsed)).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(adapter.validate(null)).toBe(false);
      expect(adapter.validate({})).toBe(false);
      expect(adapter.validate({ version: '1.0.0' })).toBe(false);
      expect(adapter.validate({ version: '1.0.0', format: 'wrong' })).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should return correct file extension', () => {
      expect(adapter.getFileExtension()).toBe('.drill.json');
    });
  });
});

describe('FileIO', () => {
  let fileIO: FileIO;
  let mockLink: HTMLAnchorElement;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fileIO = new FileIO();
    mockClick = vi.fn();
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();
    mockCreateObjectURL = vi.fn(() => 'blob:url');
    mockRevokeObjectURL = vi.fn();

    mockLink = {
      click: mockClick,
      href: '',
      download: '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveDrill', () => {
    it('should create download link and trigger download', async () => {
      const drill = createDrill('test-id', 'Test Drill');

      await fileIO.saveDrill(drill);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('Test Drill.drill.json');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should use custom filename when provided', async () => {
      const drill = createDrill('test-id', 'Test Drill');

      await fileIO.saveDrill(drill, 'custom-name.drill.json');

      expect(mockLink.download).toBe('custom-name.drill.json');
    });
  });

  describe('loadDrill', () => {
    it('should load drill from file', async () => {
      const drill = createDrill('test-id', 'Test Drill');
      const serialized = JSON.stringify({
        version: '1.0.0',
        format: 'drill-json',
        drill: {
          ...drill,
          metadata: {
            ...drill.metadata,
            createdAt: drill.metadata.createdAt.toISOString(),
            modifiedAt: drill.metadata.modifiedAt.toISOString(),
          },
        },
      });

      const file = new File([serialized], 'test.drill.json', { type: 'application/json' });
      const result = await fileIO.loadDrill(file);

      expect(result.id).toBe('test-id');
      expect(result.name).toBe('Test Drill');
    });

    it('should throw error for invalid file', async () => {
      const file = new File(['invalid json'], 'test.drill.json', { type: 'application/json' });

      await expect(fileIO.loadDrill(file)).rejects.toThrow();
    });
  });

  describe('setAdapter', () => {
    it('should allow changing the adapter', () => {
      const newAdapter = new JSONFileFormatAdapter();
      fileIO.setAdapter(newAdapter);
      // If no error, adapter was set successfully
      expect(true).toBe(true);
    });
  });
});

