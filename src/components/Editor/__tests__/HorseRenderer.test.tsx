import { describe, it, expect, vi } from 'vitest';
import { render } from '../../../test/testUtils';
import HorseRenderer from '../HorseRenderer';
import { createHorse } from '../../../types';
import { generateId } from '../../../utils/uuid';

describe('HorseRenderer', () => {
  const mockHorse = createHorse(generateId(), 1, { x: 0.5, y: 0.5 }, 0, 'walk');
  const mockOnDrag = vi.fn();
  const mockOnClick = vi.fn();

  it('should render horse shape', () => {
    const { getAllByTestId } = render(
      <HorseRenderer
        horse={mockHorse}
        x={100}
        y={100}
        isSelected={false}
        showArrow={false}
        onDrag={mockOnDrag}
        onClick={mockOnClick}
        canvasWidth={800}
        canvasHeight={400}
      />
    );
    
    // Should render ellipses (body and head) and path (tail)
    const ellipses = getAllByTestId('ellipse');
    expect(ellipses.length).toBeGreaterThan(0);
    expect(getAllByTestId('path').length).toBeGreaterThan(0);
  });

  it('should render horse label', () => {
    const { getByTestId } = render(
      <HorseRenderer
        horse={mockHorse}
        x={100}
        y={100}
        isSelected={false}
        showArrow={false}
        onDrag={mockOnDrag}
        onClick={mockOnClick}
        canvasWidth={800}
        canvasHeight={400}
      />
    );
    
    expect(getByTestId('text')).toBeInTheDocument();
  });

  it('should render arrow when showArrow is true', () => {
    const { getByTestId } = render(
      <HorseRenderer
        horse={mockHorse}
        x={100}
        y={100}
        isSelected={false}
        showArrow={true}
        onDrag={mockOnDrag}
        onClick={mockOnClick}
        canvasWidth={800}
        canvasHeight={400}
      />
    );
    
    expect(getByTestId('arrow')).toBeInTheDocument();
  });

  it('should not render arrow when showArrow is false', () => {
    const { queryByTestId } = render(
      <HorseRenderer
        horse={mockHorse}
        x={100}
        y={100}
        isSelected={false}
        showArrow={false}
        onDrag={mockOnDrag}
        onClick={mockOnClick}
        canvasWidth={800}
        canvasHeight={400}
      />
    );
    
    expect(queryByTestId('arrow')).not.toBeInTheDocument();
  });
});

