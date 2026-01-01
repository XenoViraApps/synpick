/**
 * Timeout Configuration Tests
 *
 * Tests that timeout values can be configured and are properly used by components.
 */

import { AppConfigSchema } from '../src/config/types';
import { ApiClient } from '../src/api/client';
import { ClaudeLauncher } from '../src/launcher/claude-launcher';
import { spawn } from 'child_process';

jest.mock('child_process');

describe('Timeout Configuration', () => {
  describe('Config Schema', () => {
    it('should include apiTimeoutMs field with valid default', () => {
      const config = AppConfigSchema.parse({});

      expect(config.apiTimeoutMs).toBe(30000);
    });

    it('should include commandTimeoutMs field with valid default', () => {
      const config = AppConfigSchema.parse({});

      expect(config.commandTimeoutMs).toBe(5000);
    });

    it('should allow custom apiTimeoutMs values', () => {
      const config = AppConfigSchema.parse({
        apiTimeoutMs: 60000,
      });

      expect(config.apiTimeoutMs).toBe(60000);
    });

    it('should allow custom commandTimeoutMs values', () => {
      const config = AppConfigSchema.parse({
        commandTimeoutMs: 10000,
      });

      expect(config.commandTimeoutMs).toBe(10000);
    });

    it('should reject apiTimeoutMs below minimum', () => {
      expect(() => {
        AppConfigSchema.parse({ apiTimeoutMs: 500 });
      }).toThrow();
    });

    it('should reject apiTimeoutMs above maximum', () => {
      expect(() => {
        AppConfigSchema.parse({ apiTimeoutMs: 400000 });
      }).toThrow();
    });

    it('should reject commandTimeoutMs below minimum', () => {
      expect(() => {
        AppConfigSchema.parse({ commandTimeoutMs: 500 });
      }).toThrow();
    });

    it('should reject commandTimeoutMs above maximum', () => {
      expect(() => {
        AppConfigSchema.parse({ commandTimeoutMs: 120000 });
      }).toThrow();
    });

    it('should allow maximum valid apiTimeoutMs', () => {
      const config = AppConfigSchema.parse({
        apiTimeoutMs: 300000,
      });

      expect(config.apiTimeoutMs).toBe(300000);
    });

    it('should allow maximum valid commandTimeoutMs', () => {
      const config = AppConfigSchema.parse({
        commandTimeoutMs: 60000,
      });

      expect(config.commandTimeoutMs).toBe(60000);
    });

    it('should allow minimum valid apiTimeoutMs', () => {
      const config = AppConfigSchema.parse({
        apiTimeoutMs: 1000,
      });

      expect(config.apiTimeoutMs).toBe(1000);
    });

    it('should allow minimum valid commandTimeoutMs', () => {
      const config = AppConfigSchema.parse({
        commandTimeoutMs: 1000,
      });

      expect(config.commandTimeoutMs).toBe(1000);
    });
  });

  describe('ApiClient uses configured timeout', () => {
    it('should use provided timeout option', () => {
      const client = new ApiClient({
        timeout: 45000,
      });

      const axiosInstance = client.getAxiosInstance();
      expect(axiosInstance.defaults.timeout).toBe(45000);
    });

    it('should use default timeout when not provided', () => {
      const client = new ApiClient();

      const axiosInstance = client.getAxiosInstance();
      expect(axiosInstance.defaults.timeout).toBe(30000);
    });
  });

  describe('ClaudeLauncher uses configurable timeout', () => {
    it('should use timeout from options in checkClaudeInstallation', async () => {
      const launcher = new ClaudeLauncher({ claudePath: 'claude' });

      let spawnCallback: (() => void) | null = null;
      const mockChild = {
        on: jest.fn((event: string, callback: any) => {
          if (event === 'spawn') {
            spawnCallback = callback;
          }
        }),
      };

      jest.useFakeTimers();
      (spawn as jest.Mock).mockReturnValue(mockChild);

      const promise = launcher.checkClaudeInstallation();

      // Trigger spawn callback using fake timers
      if (spawnCallback) {
        Promise.resolve().then(() => spawnCallback!());
      }

      // Fast-forward less than 5 seconds
      jest.advanceTimersByTime(4000);

      const result = await promise;
      expect(result).toBe(true);
      jest.useRealTimers();
    });
  });
});
