import { describe, it, expect, vi } from 'vitest';
import { render } from '../../../test/testUtils';
import HorseRenderer from '../HorseRenderer';
import { createHorse } from '../../../types';
import { generateId } from '../../../utils/uuid';

describe('HorseRenderer', () => {
  const mockHorse = createHorse(generateId(), 1, { x: 0.5, y: 0.5 }, 0, 'walk');
  const mockOnDrag = vi.fn();
  const mockOnClick = vi.fn();

  it('should render horse circle', () => {
    const { getByTestId } = render(
      <HorseRenderer
        horse={mockHorse}
        x={100}
        y={100}
        isSelected={false}
        showArrow={false}
        onDrag={mockOnDrag}
        onClick={mockOnClick}
      />
    );
    
    expect(getByTestId('circle')).toBeInTheDocument();
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
      />
    );
    
    expect(queryByTestId('arrow')).not.toBeInTheDocument();
  });
});

