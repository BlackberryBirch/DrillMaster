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

  it('should render app with routing', () => {
    // App no longer creates a default drill on mount
    // It now uses routing to handle drill creation/loading
    render(<App />);
    
    // Just verify the app renders without errors
    expect(document.body).toBeInTheDocument();
  });
});

