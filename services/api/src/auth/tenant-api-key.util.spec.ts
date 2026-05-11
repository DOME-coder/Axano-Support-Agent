import { describe, expect, it } from 'vitest';
import {
  API_KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  looksLikeApiKey,
} from './tenant-api-key.util';

describe('tenant-api-key.util', () => {
  describe('generateApiKey', () => {
    it('produces keys with the ad_ prefix', () => {
      const key = generateApiKey();
      expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
    });

    it('produces unique keys across calls', () => {
      const keys = new Set(Array.from({ length: 100 }, () => generateApiKey()));
      expect(keys.size).toBe(100);
    });

    it('produces keys long enough to be brute-force resistant', () => {
      // ad_ prefix (3) + 48 hex chars = 51 chars total, 192 bits of
      // entropy in the hex portion alone.
      const key = generateApiKey();
      expect(key.length).toBeGreaterThanOrEqual(50);
    });
  });

  describe('hashApiKey', () => {
    it('produces a 64-char hex sha256 digest', () => {
      const hash = hashApiKey('ad_deadbeef');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic for the same input', () => {
      expect(hashApiKey('ad_deadbeef')).toBe(hashApiKey('ad_deadbeef'));
    });

    it('produces different hashes for different inputs', () => {
      expect(hashApiKey('ad_aaaa')).not.toBe(hashApiKey('ad_bbbb'));
    });
  });

  describe('looksLikeApiKey', () => {
    it('accepts well-formed keys', () => {
      expect(looksLikeApiKey(generateApiKey())).toBe(true);
    });

    it('rejects keys without the prefix', () => {
      expect(looksLikeApiKey('sk-1234')).toBe(false);
      expect(looksLikeApiKey('1234')).toBe(false);
      expect(looksLikeApiKey('')).toBe(false);
    });

    it('rejects the bare prefix with no payload', () => {
      expect(looksLikeApiKey(API_KEY_PREFIX)).toBe(false);
    });
  });
});
