import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Mock Konva since it requires canvas
vi.mock('react-konva', () => ({
  Stage: ({ children }: any) => <div data-testid="stage">{children}</div>,
  Layer: ({ children }: any) => <div data-testid="layer">{children}</div>,
  Group: ({ children }: any) => <div data-testid="group">{children}</div>,
  Rect: () => <div data-testid="rect" />,
  Circle: () => <div data-testid="circle" />,
  Ellipse: () => <div data-testid="ellipse" />,
  Path: () => <div data-testid="path" />,
  Line: () => <div data-testid="line" />,
  Text: () => <div data-testid="text" />,
  Arrow: () => <div data-testid="arrow" />,
}));

// Custom render function with providers if needed
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { ...options });
};

export * from '@testing-library/react';
export { customRender as render };

