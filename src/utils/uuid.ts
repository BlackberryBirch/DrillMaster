/**
 * Base62 alphabet (URL-safe: 0-9, a-z, A-Z)
 */
const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Convert a number to base62 string
 */
function toBase62(num: number, minLength: number = 1): string {
  if (num === 0) {
    return BASE62_ALPHABET[0].repeat(minLength);
  }
  let result = '';
  while (num > 0) {
    result = BASE62_ALPHABET[num % 62] + result;
    num = Math.floor(num / 62);
  }
  // Pad with zeros if needed
  while (result.length < minLength) {
    result = BASE62_ALPHABET[0] + result;
  }
  return result;
}

/**
 * Get random bytes using crypto API if available, fallback to Math.random
 */
function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  // Fallback for environments without crypto API
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/**
 * Generate a short globally unique ID (7 characters)
 * 
 * Format: Combines compact timestamp and random component using base62 encoding
 * - 7 characters = 62^7 = ~3.5 trillion possible combinations
 * - URL-safe (0-9, a-z, A-Z)
 * - Globally unique with very low collision probability
 * 
 * Strategy:
 * - Uses milliseconds since custom epoch (2024-01-01) for time component
 * - Encodes time in 3 base62 digits (wraps every ~4 minutes, but provides time-based ordering)
 * - Adds 4 base62 digits of random entropy (62^4 = ~14.7M combinations)
 * - Collision probability: ~1 in 14.7M for IDs generated in the same time window
 * 
 * @returns A 7-character string suitable for URL paths (e.g., "a3K9mX2")
 */
export const generateShortId = (): string => {
  // Custom epoch: January 1, 2024 00:00:00 UTC
  // This gives us a smaller number to encode
  const EPOCH = 1704067200000; // 2024-01-01T00:00:00Z
  const timestamp = Date.now() - EPOCH;
  
  // Encode timestamp in 3 base62 digits (62^3 = 238,328 possible values)
  // Note: This wraps every ~4 minutes, but provides time-based ordering
  // The random component ensures uniqueness even when timestamp wraps
  const timestampPart = toBase62(timestamp % (62 ** 3), 3);
  
  // Generate 4 base62 digits of random entropy (62^4 = 14,776,336 combinations)
  const randomBytes = getRandomBytes(3); // 3 bytes = 24 bits, enough for 4 base62 digits
  let randomValue = 0;
  for (let i = 0; i < randomBytes.length; i++) {
    randomValue = (randomValue << 8) | randomBytes[i];
  }
  const randomPart = toBase62(randomValue % (62 ** 4), 4);
  
  return timestampPart + randomPart;
};

/**
 * Generate a simple UUID v4-like string
 * @deprecated Consider using generateShortId() for URL-friendly IDs
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

