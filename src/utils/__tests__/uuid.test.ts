import { describe, it, expect } from 'vitest';
import { generateId, generateShortId } from '../uuid';

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

describe('generateShortId', () => {
  it('should generate a 7-character ID', () => {
    const id = generateShortId();
    expect(id).toHaveLength(7);
  });

  it('should generate different IDs on each call', () => {
    const id1 = generateShortId();
    const id2 = generateShortId();
    expect(id1).not.toBe(id2);
  });

  it('should only contain URL-safe base62 characters', () => {
    const id = generateShortId();
    // Should only contain: 0-9, a-z, A-Z
    expect(id).toMatch(/^[0-9a-zA-Z]{7}$/);
  });

  it('should generate unique IDs in rapid succession', () => {
    const ids = new Set<string>();
    const count = 1000;
    
    for (let i = 0; i < count; i++) {
      ids.add(generateShortId());
    }
    
    // All IDs should be unique
    expect(ids.size).toBe(count);
  });

  it('should generate IDs suitable for URL paths', () => {
    const id = generateShortId();
    // Should not contain URL-unsafe characters like /, ?, #, etc.
    expect(id).not.toMatch(/[/?#&=+]/);
    // Should be valid in URL path
    const testUrl = `https://example.com/drill/${id}`;
    expect(() => new URL(testUrl)).not.toThrow();
  });
});

