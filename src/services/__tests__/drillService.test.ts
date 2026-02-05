import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DrillService } from '../drillService';
import { createDrill } from '../../types';
import type { User } from '@supabase/supabase-js';

// Mock Supabase - factory function to avoid hoisting issues
vi.mock('../../lib/supabase', () => {
  const mockStorage = {
    from: vi.fn(),
    createSignedUrl: vi.fn(),
  };
  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    storage: mockStorage,
  };
  return {
    supabase: mockSupabaseClient,
  };
});

// Import after mock to get the mocked version
import { supabase } from '../../lib/supabase';

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
} as User;

// Type for mock query builder
interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

describe('DrillService', () => {
  let drillService: DrillService;
  let mockQueryBuilder: MockQueryBuilder;

  beforeEach(() => {
    drillService = new DrillService();
    vi.clearAllMocks();

    // Setup default mock query builder chain
    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
    };

    (supabase.from as ReturnType<typeof vi.fn>) = vi.fn().mockReturnValue(mockQueryBuilder);
  });

  describe('getUserDrills', () => {
    it('should return error when user is not authenticated', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await drillService.getUserDrills();

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('User not authenticated');
      expect(result.data).toBeNull();
    });

    it('should return drills for authenticated user', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockDrills = [
        {
          id: 'drill-1',
          user_id: mockUser.id,
          name: 'Test Drill 1',
          short_id: 'abc123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockQueryBuilder.order.mockResolvedValue({
        data: mockDrills,
        error: null,
      });

      const result = await drillService.getUserDrills();

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockDrills);
      expect(supabase.from).toHaveBeenCalledWith('drills');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    });

    it('should handle database errors', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockQueryBuilder.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await drillService.getUserDrills();

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Failed to fetch drills');
      expect(result.data).toBeNull();
    });
  });

  describe('getDrillById', () => {
    it('should return error when user is not authenticated', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await drillService.getDrillById('drill-id');

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('User not authenticated');
    });

    it('should return drill by id', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockDrill = {
        id: 'drill-id',
        user_id: mockUser.id,
        name: 'Test Drill',
        short_id: 'abc123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockDrill,
        error: null,
      });

      const result = await drillService.getDrillById('drill-id');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockDrill);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'drill-id');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });
  });

  describe('getDrillByShortId', () => {
    it('should return error when short ID is too long', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await drillService.getDrillByShortId('toolongid123');

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('Short ID is too long');
    });

    it('should return drill by short ID', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockDrill = {
        id: 'drill-id',
        user_id: mockUser.id,
        name: 'Test Drill',
        short_id: 'abc123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockDrill,
        error: null,
      });

      const result = await drillService.getDrillByShortId('abc123');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockDrill);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('short_id', 'abc123');
    });
  });

  describe('createDrill', () => {
    it('should return error when user is not authenticated', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await drillService.createDrill({
        name: 'Test Drill',
        short_id: 'abc123',
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('User not authenticated');
    });

    it('should create a new drill', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockDrill = {
        id: 'new-drill-id',
        user_id: mockUser.id,
        name: 'Test Drill',
        short_id: 'abc123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockDrill,
        error: null,
      });

      const result = await drillService.createDrill({
        name: 'Test Drill',
        short_id: 'abc123',
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockDrill);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        user_id: mockUser.id,
        name: 'Test Drill',
        short_id: 'abc123',
      });
    });
  });

  describe('updateDrill', () => {
    it('should return error when drill not found', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // First call for verification
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await drillService.updateDrill('drill-id', {
        name: 'Updated Name',
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('Drill not found or access denied');
    });

    it('should update an existing drill', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // First call for verification
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'drill-id' },
        error: null,
      });

      const updatedDrill = {
        id: 'drill-id',
        user_id: mockUser.id,
        name: 'Updated Name',
        short_id: 'abc123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Second call for update
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: updatedDrill,
        error: null,
      });

      const result = await drillService.updateDrill('drill-id', {
        name: 'Updated Name',
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual(updatedDrill);
    });
  });

  describe('deleteDrill', () => {
    it('should delete a drill', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // delete() returns a chainable query builder
      // Need to chain two eq() calls, the second one returns the result
      const secondEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const firstEq = vi.fn().mockReturnValue({
        eq: secondEq,
      });
      mockQueryBuilder.delete = vi.fn().mockReturnValue({
        eq: firstEq,
      });

      const result = await drillService.deleteDrill('drill-id');

      expect(result.error).toBeNull();
      expect(result.data).toBeUndefined();
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(firstEq).toHaveBeenCalledWith('id', 'drill-id');
      expect(secondEq).toHaveBeenCalledWith('user_id', mockUser.id);
    });
  });

  describe('createDrillVersion', () => {

    it('should return error when user is not authenticated', async () => {
      const testDrill = createDrill('test-id', 'Test Drill');
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await drillService.createDrillVersion('drill-id', testDrill);

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('User not authenticated');
    });

    it('should create a new version when no versions exist', async () => {
      const testDrill = createDrill('test-id', 'Test Drill');
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // getLatestVersion returns null (no versions)
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // getNextVersionNumber returns 1
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const mockVersion = {
        id: 'version-id',
        drill_id: 'drill-id',
        user_id: mockUser.id,
        version_number: 1,
        drill_data: testDrill,
        name: 'Test Drill',
        version_label: null,
        audio_url: null,
        audio_filename: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // insert returns new version
      mockQueryBuilder.single.mockResolvedValue({
        data: mockVersion,
        error: null,
      });

      const result = await drillService.createDrillVersion('drill-id', testDrill);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockVersion);
    });

    it('should update existing version if less than 15 minutes old', async () => {
      const testDrill = createDrill('test-id', 'Test Drill');
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const recentVersion = {
        id: 'version-id',
        version_number: 1,
        created_at: new Date().toISOString(), // Recent
      };

      // getLatestVersion returns recent version
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: recentVersion,
        error: null,
      });

      const updatedVersion = {
        id: 'version-id',
        drill_id: 'drill-id',
        user_id: mockUser.id,
        version_number: 1,
        drill_data: testDrill,
        name: 'Test Drill',
        version_label: null,
        audio_url: null,
        audio_filename: null,
        created_at: recentVersion.created_at,
        updated_at: new Date().toISOString(),
      };

      // updateExistingVersion returns updated version
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: updatedVersion,
        error: null,
      });

      const result = await drillService.createDrillVersion('drill-id', testDrill);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(updatedVersion);
    });

    it('should always create new version when versionLabel is provided (named save)', async () => {
      const testDrill = createDrill('test-id', 'Test Drill');
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // getLatestVersion would return a recent version, but we pass versionLabel so we skip update path
      const mockVersion = {
        id: 'version-id',
        drill_id: 'drill-id',
        user_id: mockUser.id,
        version_number: 1,
        drill_data: testDrill,
        name: 'Test Drill',
        version_label: null,
        audio_url: null,
        audio_filename: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // First maybeSingle: getLatestVersion (for createNewVersion's getNextVersionNumber is not used for first insert)
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: 'version-id', version_number: 1, created_at: new Date().toISOString(), version_label: null },
        error: null,
      });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: { ...mockVersion, version_number: 2 },
        error: null,
      });

      const result = await drillService.createDrillVersion('drill-id', testDrill, null, null, 'My named save');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      // Should have called insert (new version), not update
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });
  });

  describe('getDrillVersions', () => {
    it('should return all versions for a drill', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockVersions = [
        {
          id: 'version-2',
          drill_id: 'drill-id',
          user_id: mockUser.id,
          version_number: 2,
          drill_data: createDrill('test-id', 'Test Drill'),
          name: 'Test Drill',
          version_label: null,
          audio_url: null,
          audio_filename: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'version-1',
          drill_id: 'drill-id',
          user_id: mockUser.id,
          version_number: 1,
          drill_data: createDrill('test-id', 'Test Drill'),
          name: 'Test Drill',
          version_label: null,
          audio_url: null,
          audio_filename: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockQueryBuilder.order.mockResolvedValue({
        data: mockVersions,
        error: null,
      });

      const result = await drillService.getDrillVersions('drill-id');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockVersions);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('version_number', { ascending: false });
    });
  });

  describe('getDrillVersion', () => {
    it('should return a specific version by version number', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockVersion = {
        id: 'version-id',
        drill_id: 'drill-id',
        user_id: mockUser.id,
        version_number: 1,
        drill_data: createDrill('test-id', 'Test Drill'),
        name: 'Test Drill',
        version_label: null,
        audio_url: null,
        audio_filename: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockVersion,
        error: null,
      });

      const result = await drillService.getDrillVersion('drill-id', 1);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockVersion);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('version_number', 1);
    });
  });

  describe('deleteDrillVersion', () => {
    it('should delete a drill version', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // delete() returns a chainable query builder
      // Need to chain two eq() calls, the second one returns the result
      const secondEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const firstEq = vi.fn().mockReturnValue({
        eq: secondEq,
      });
      mockQueryBuilder.delete = vi.fn().mockReturnValue({
        eq: firstEq,
      });

      const result = await drillService.deleteDrillVersion('version-id');

      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(firstEq).toHaveBeenCalledWith('id', 'version-id');
      expect(secondEq).toHaveBeenCalledWith('user_id', mockUser.id);
    });
  });

  describe('getDrillWithLatestVersion', () => {
    it('should return drill with latest version', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const testDrill = createDrill('test-id', 'Test Drill');

      const mockDrillRecord = {
        id: 'drill-id',
        user_id: mockUser.id,
        name: 'Test Drill',
        short_id: 'abc123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // getDrillById call
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockDrillRecord,
        error: null,
      });

      const mockVersion = {
        id: 'version-id',
        drill_id: 'drill-id',
        user_id: mockUser.id,
        version_number: 1,
        drill_data: testDrill,
        name: 'Test Drill',
        version_label: null,
        audio_url: null,
        audio_filename: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // getDrillVersions call
      mockQueryBuilder.order.mockResolvedValue({
        data: [mockVersion],
        error: null,
      });

      const result = await drillService.getDrillWithLatestVersion('drill-id');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.record).toEqual(mockDrillRecord);
      expect(result.data?.drill).not.toBeNull();
    });

    it('should return error when drill not found', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await drillService.getDrillWithLatestVersion('drill-id');

      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    });
  });

  describe('getDrillByShortIdWithVersion', () => {
    it('should return drill with latest version by short ID', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const testDrill = createDrill('test-id', 'Test Drill');

      const mockDrillRecord = {
        id: 'drill-id',
        user_id: mockUser.id,
        name: 'Test Drill',
        short_id: 'abc123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // getDrillByShortId call
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockDrillRecord,
        error: null,
      });

      const mockVersion = {
        id: 'version-id',
        drill_id: 'drill-id',
        user_id: mockUser.id,
        version_number: 1,
        drill_data: testDrill,
        name: 'Test Drill',
        version_label: null,
        audio_url: null,
        audio_filename: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // getDrillVersions call
      mockQueryBuilder.order.mockResolvedValue({
        data: [mockVersion],
        error: null,
      });

      const result = await drillService.getDrillByShortIdWithVersion('abc123');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.record).toEqual(mockDrillRecord);
      expect(result.data?.drill).not.toBeNull();
    });
  });

  describe('recordToDrill', () => {
    it('should convert DrillRecord to Drill', async () => {
      const testDrill = createDrill('test-id', 'Test Drill');

      const record = {
        id: 'drill-id',
        user_id: mockUser.id,
        name: 'Test Drill',
        short_id: 'abc123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const version = {
        id: 'version-id',
        drill_id: 'drill-id',
        user_id: mockUser.id,
        version_number: 1,
        drill_data: testDrill,
        name: 'Test Drill',
        version_label: null,
        audio_url: 'https://example.com/audio.mp3',
        audio_filename: 'audio.mp3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await DrillService.recordToDrill(record, version);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('abc123');
      expect(result?.audioTrack?.url).toBe('https://example.com/audio.mp3');
      expect(result?.audioTrack?.filename).toBe('audio.mp3');
    });

    it('should convert storage path to signed URL', async () => {
      const testDrill = createDrill('test-id', 'Test Drill');

      const record = {
        id: 'drill-id',
        user_id: mockUser.id,
        name: 'Test Drill',
        short_id: 'abc123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const version = {
        id: 'version-id',
        drill_id: 'drill-id',
        user_id: mockUser.id,
        version_number: 1,
        drill_data: testDrill,
        name: 'Test Drill',
        version_label: null,
        audio_url: 'user-id/drill-id/timestamp.mp3',
        audio_filename: 'audio.mp3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockStorageFrom = vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed-url.example.com/audio.mp3' },
          error: null,
        }),
      });

      (supabase.storage.from as ReturnType<typeof vi.fn>) = mockStorageFrom;

      const result = await DrillService.recordToDrill(record, version);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('abc123');
      expect(result?.audioTrack?.url).toBe('https://signed-url.example.com/audio.mp3');
      expect(result?.audioTrack?.filename).toBe('audio.mp3');
      expect(mockStorageFrom).toHaveBeenCalledWith('drill-audio');
      expect(mockStorageFrom().createSignedUrl).toHaveBeenCalledWith('user-id/drill-id/timestamp.mp3', 3600);
    });

    it('should return null when version is null', async () => {
      const record = {
        id: 'drill-id',
        user_id: mockUser.id,
        name: 'Test Drill',
        short_id: 'abc123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = await DrillService.recordToDrill(record, null);

      expect(result).toBeNull();
    });
  });

  describe('getShareLinkVersionNumbers', () => {
    it('should return error when user is not authenticated', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await drillService.getShareLinkVersionNumbers('drill-id');

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('User not authenticated');
      expect(result.data).toBeNull();
    });

    it('should return version numbers that have active share links', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockDrill = {
        id: 'drill-id',
        user_id: mockUser.id,
        name: 'Test Drill',
        short_id: 'abc123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockDrill,
        error: null,
      });

      mockQueryBuilder.or.mockResolvedValue({
        data: [{ version_number: 1 }, { version_number: 3 }],
        error: null,
      });

      const result = await drillService.getShareLinkVersionNumbers('drill-id');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([1, 3]);
      expect(supabase.from).toHaveBeenCalledWith('drills');
      expect(supabase.from).toHaveBeenCalledWith('share_links');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('drill_id', 'drill-id');
    });

    it('should return empty array when no share links exist', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'drill-id', user_id: mockUser.id, name: 'Test', short_id: 'x', created_at: '', updated_at: '' },
        error: null,
      });

      mockQueryBuilder.or.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await drillService.getShareLinkVersionNumbers('drill-id');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });
  });

  describe('getDrillByShareToken', () => {
    it('should return error when token is invalid', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await drillService.getDrillByShareToken('bad-token');

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Share link not found or invalid');
      expect(result.data).toBeNull();
    });

    it('should return error when share link is expired', async () => {
      const expiredLink = {
        id: 'link-id',
        drill_id: 'drill-id',
        version_number: 1,
        share_token: 'token',
        created_by: mockUser.id,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() - 86400000).toISOString(),
        access_count: 0,
        last_accessed_at: null,
      };

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: expiredLink,
        error: null,
      });

      const result = await drillService.getDrillByShareToken('token');

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('expired');
      expect(result.data).toBeNull();
    });
  });

  describe('createShareLink', () => {
    it('should return error when version has no version_label (not named)', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const versionNoLabel = {
        id: 'v-id',
        drill_id: 'drill-id',
        user_id: mockUser.id,
        version_number: 1,
        drill_data: createDrill('x', 'Drill'),
        name: 'Drill',
        version_label: null,
        audio_url: null,
        audio_filename: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'drill-id', user_id: mockUser.id, name: 'Drill', short_id: 'x', created_at: '', updated_at: '' },
        error: null,
      });
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: versionNoLabel,
        error: null,
      });

      const result = await drillService.createShareLink('drill-id', 1);

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Only named versions');
      expect(result.data).toBeNull();
    });

    it('should return existing token when share link already exists and forceNew is false', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const versionWithLabel = {
        id: 'v-id',
        drill_id: 'drill-id',
        user_id: mockUser.id,
        version_number: 1,
        drill_data: createDrill('x', 'Drill'),
        name: 'Drill',
        version_label: 'My Version',
        audio_url: null,
        audio_filename: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // createShareLink calls getDrillVersion first (drill_versions.single), then share_links.maybeSingle
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: versionWithLabel,
        error: null,
      });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: 'link-id', share_token: 'existing-token-123' },
        error: null,
      });

      const result = await drillService.createShareLink('drill-id', 1);

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ shareToken: 'existing-token-123' });
      expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
    });
  });
});

