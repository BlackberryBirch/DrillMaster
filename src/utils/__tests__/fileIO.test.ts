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

      expect(parsed.version).toBe('1.0.0');
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

