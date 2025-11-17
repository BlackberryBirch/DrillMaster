import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Store Stage handlers globally for test access
const stageHandlers: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onTouchStart?: (e: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onTouchMove?: (e: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onTouchEnd?: (e: any) => void;
} = {};

// Mock Konva since it requires canvas
vi.mock('react-konva', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Stage: ({ children, onTouchStart, onTouchMove, onTouchEnd }: any) => {
      // Store handlers for test access
      stageHandlers.onTouchStart = onTouchStart;
      stageHandlers.onTouchMove = onTouchMove;
      stageHandlers.onTouchEnd = onTouchEnd;
      return <div data-testid="stage">{children}</div>;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Layer: ({ children }: any) => <div data-testid="layer">{children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Group: ({ children }: any) => <div data-testid="group">{children}</div>,
    Rect: () => <div data-testid="rect" />,
    Circle: () => <div data-testid="circle" />,
    Ellipse: () => <div data-testid="ellipse" />,
    Path: () => <div data-testid="path" />,
    Line: () => <div data-testid="line" />,
    Text: () => <div data-testid="text" />,
    Arrow: () => <div data-testid="arrow" />,
  };
});

// Export handlers for tests
export { stageHandlers };

// Custom render function with providers if needed
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { ...options });
};

// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';
export { customRender as render };

