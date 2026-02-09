import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import VersionHistory from '../VersionHistory';
import { drillService } from '../../../services/drillService';
import { createDrill, createFrame } from '../../../types';
import { generateId } from '../../../utils/uuid';

vi.mock('../../../services/drillService');

const mockDrill = createDrill('drill-1', 'Test Drill');
mockDrill.frames = [createFrame(generateId(), 0, 0, 5)];

const mockVersionWithLabel = {
  id: 'version-1',
  drill_id: 'drill-db-id',
  user_id: 'user-1',
  version_number: 1,
  drill_data: mockDrill,
  name: 'Test Drill',
  version_label: 'My Named Version',
  audio_url: null,
  audio_filename: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('VersionHistory', () => {
  beforeEach(() => {
    vi.mocked(drillService.getDrillVersions).mockResolvedValue({
      data: [mockVersionWithLabel],
      error: null,
    });
    vi.mocked(drillService.getShareLinkVersionNumbers).mockResolvedValue({
      data: [],
      error: null,
    });
  });

  it('should load and display named versions with Share button', async () => {
    render(
      <VersionHistory
        drillId="drill-db-id"
        isOpen
        onClose={() => {}}
        onRestore={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('My Named Version')).toBeInTheDocument();
    });

    const shareButtons = screen.getAllByRole('button', { name: /share/i });
    expect(shareButtons.length).toBeGreaterThanOrEqual(1);
    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toBeInTheDocument();
  });

  it('should show Share button with emerald style when version has no share link', async () => {
    vi.mocked(drillService.getShareLinkVersionNumbers).mockResolvedValue({
      data: [],
      error: null,
    });

    render(
      <VersionHistory
        drillId="drill-db-id"
        isOpen
        onClose={() => {}}
        onRestore={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('My Named Version')).toBeInTheDocument();
    });

    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toHaveClass('text-emerald-600');
  });

  it('should show Share button with blue style when version has active share link', async () => {
    vi.mocked(drillService.getShareLinkVersionNumbers).mockResolvedValue({
      data: [1],
      error: null,
    });

    render(
      <VersionHistory
        drillId="drill-db-id"
        isOpen
        onClose={() => {}}
        onRestore={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('My Named Version')).toBeInTheDocument();
    });

    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toHaveClass('text-blue-600');
  });
});
