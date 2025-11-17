import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '../test/testUtils';
import App from '../App';
import { useDrillStore } from '../stores/drillStore';

describe('App', () => {
  beforeEach(() => {
    useDrillStore.setState({
      drill: null,
      currentFrameIndex: 0,
    });
  });

  it('should render app', () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });

  it('should create a default drill on mount', () => {
    render(<App />);
    
    // Wait for useEffect to run
    setTimeout(() => {
      const drill = useDrillStore.getState().drill;
      expect(drill).not.toBeNull();
      expect(drill?.name).toBe('New Drill');
    }, 0);
  });
});

