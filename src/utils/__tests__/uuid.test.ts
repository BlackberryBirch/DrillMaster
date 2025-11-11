import { describe, it, expect } from 'vitest';
import { generateId } from '../uuid';

describe('generateId', () => {
  it('should generate a unique ID string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate different IDs on each call', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should include timestamp in ID', () => {
    const id = generateId();
    // ID format: timestamp-randomstring
    const parts = id.split('-');
    expect(parts.length).toBeGreaterThan(1);
    expect(Number(parts[0])).toBeGreaterThan(0);
  });
});

