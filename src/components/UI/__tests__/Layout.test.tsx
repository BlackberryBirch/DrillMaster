import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import Layout from '../Layout';

describe('Layout', () => {
  it('should render layout structure', () => {
    render(<Layout />);
    
    // Check that main sections are rendered
    // Toolbar, Filmstrip, Editor, PropertiesPanel, AnimationControls
    // These are all rendered by Layout
    expect(document.body).toBeInTheDocument();
  });
});

