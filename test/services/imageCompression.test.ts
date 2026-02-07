import { describe, it, expect } from 'vitest';
import { formatBytes } from '../../services/imageCompression';

describe('imageCompression', () => {
  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(5.5 * 1024 * 1024)).toBe('5.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should round to one decimal place', () => {
      expect(formatBytes(1234567)).toBe('1.2 MB');
    });
  });

  // Note: compressImage tests require browser canvas API
  // and are tested in E2E tests instead
  describe('compressImage', () => {
    it.skip('requires browser canvas - tested in E2E', () => {});
  });
});
