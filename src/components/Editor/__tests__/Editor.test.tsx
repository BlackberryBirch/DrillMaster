import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../../test/testUtils';
import Editor from '../Editor';

// Mock window resize
const mockResize = vi.fn();
window.addEventListener = vi.fn((event, handler) => {
  if (event === 'resize') {
    mockResize.mockImplementation(handler);
  }
});
window.removeEventListener = vi.fn();

describe('Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render editor component', () => {
    const { container } = render(<Editor />);
    expect(container).toBeInTheDocument();
  });

  it('should render stage (mocked Konva)', () => {
    const { getByTestId } = render(<Editor />);
    // Stage is mocked in testUtils
    expect(getByTestId('stage')).toBeInTheDocument();
  });
});

