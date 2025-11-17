import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import Toolbar from '../Toolbar';
import { useDrillStore } from '../../../stores/drillStore';
import { createDrill } from '../../../types';

// Mock fileIO
vi.mock('../../../utils/fileIO', () => ({
  fileIO: {
    saveDrill: vi.fn(),
    loadDrill: vi.fn(),
  },
  JSONFileFormatAdapter: vi.fn().mockImplementation(() => ({
    serialize: vi.fn(),
    deserialize: vi.fn(),
    validate: vi.fn(),
    getFileExtension: vi.fn(() => '.drill.json'),
  })),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('Toolbar', () => {
  beforeEach(() => {
    useDrillStore.setState({
      drill: null,
      currentFrameIndex: 0,
    });
    vi.clearAllMocks();
  });

  it('should render toolbar buttons', () => {
    render(<Toolbar />);
    
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Load')).toBeInTheDocument();
    // Save button text may vary based on auth state, so check for button containing "Save"
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('should disable save when no drill', () => {
    render(<Toolbar />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('should enable save when drill exists', () => {
    const drill = createDrill('test-id', 'Test Drill');
    useDrillStore.setState({ drill });

    render(<Toolbar />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('should show drill name when drill exists', () => {
    const drill = createDrill('test-id', 'Test Drill');
    useDrillStore.setState({ drill });

    render(<Toolbar />);
    
    expect(screen.getByText('Test Drill')).toBeInTheDocument();
  });
});

