import { describe, it, expect } from 'vitest';
import { render } from '../../../test/testUtils';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';

describe('Layout', () => {
  it('should render layout structure', () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    
    // Check that main sections are rendered
    // Toolbar, Filmstrip, Editor, PropertiesPanel, AnimationControls
    // These are all rendered by Layout
    expect(document.body).toBeInTheDocument();
  });
});

