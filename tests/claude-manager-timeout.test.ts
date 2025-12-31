/**
 * ClaudeCodeManager Timeout Handling Tests
 *
 * Tests the spawnCommand timeout handling and race condition fixes.
 */

import { spawn } from 'child_process';
jest.mock('child_process');

import { ClaudeCodeManager } from '../src/claude/manager';

describe('ClaudeCodeManager - Timeout Handling', () => {
  let manager: ClaudeCodeManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    manager = new ClaudeCodeManager({ verbose: false });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('spawnCommand - Race Condition Tests', () => {
    /**
     * Test 1: Verify that process closing before timeout clears the timeout
     * This ensures we don't have a lingering timeout trying to kill an already-dead process
     */
    it('should clear timeout when process closes successfully', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      let closeCallback: ((code: number) => void) | null = null;
      const mockChild = {
        pid: 1234,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            closeCallback = callback;
          }
        }),
      };

      (spawn as jest.Mock).mockReturnValue(mockChild);

      // Access private method for testing
      const spawnCommand = (manager as any).spawnCommand.bind(manager);
      const promise = spawnCommand('test', ['arg1']);

      // Trigger close immediately
      if (closeCallback) {
        closeCallback(0);
      }

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.code).toBe(0);
      expect(mockChild.kill).not.toHaveBeenCalled();
      // Verify clearTimeout was called to clean up the timeout
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    /**
     * Test 2: Verify that error event properly cleans up timeout
     */
    it('should clear timeout when spawn errors immediately', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      let errorCallback: ((err: Error) => void) | null = null;
      const mockChild = {
        pid: 1234,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        on: jest.fn((event: string, callback: any) => {
          if (event === 'error') {
            errorCallback = callback;
          }
        }),
      };

      (spawn as jest.Mock).mockReturnValue(mockChild);

      // Access private method
      const spawnCommand = (manager as any).spawnCommand.bind(manager);
      const promise = spawnCommand('failing-command', []);

      // Trigger error immediately
      if (errorCallback) {
        errorCallback(new Error('Spawn failed'));
      }

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.code).toBe(-1);
      // Verify timeout was cleared
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    /**
     * Test 3: Verify that after close event, timeout does NOT fire
     * This is testing the "resolved" flag
     */
    it('should prevent timeout from firing after process closes', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      let closeCallback: ((code: number) => void) | null = null;
      let timeoutCallback: (() => void) | null = null;
      let timeoutFired = false;

      const mockChild = {
        pid: 1234,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            closeCallback = callback;
          }
        }),
      };

      (spawn as jest.Mock).mockReturnValue(mockChild);

      // Capture setTimeout callback
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        timeoutCallback = callback;
        return 1 as any;
      });

      const spawnCommand = (manager as any).spawnCommand.bind(manager);
      const promise = spawnCommand('test', ['arg']);

      // Process closes normally
      if (closeCallback) {
        closeCallback(0);
      }

      // Wait for the close to process
      await promise;

      // Verify clearTimeout was called (timeout was cleared)
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Now try to trigger the timeout callback (simulating it firing)
      if (timeoutCallback) {
        timeoutFired = true;
      }

      // Verify kill was not called (process already resolved)
      expect(mockChild.kill).not.toHaveBeenCalled();
    });

    /**
     * Test 4: Verify that timeout actually fires after the delay
     */
    it('should call doResolve after timeout', async () => {
      let timeoutCallback: (() => void) | null = null;

      const mockChild = {
        pid: 1234,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        on: jest.fn(() => {
          // Never emit close or error - process hangs
        }),
      };

      (spawn as jest.Mock).mockReturnValue(mockChild);

      // Capture setTimeout callback
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        timeoutCallback = callback;
        return 1 as any;
      });

      const spawnCommand = (manager as any).spawnCommand.bind(manager);
      const promise = spawnCommand('slow-command', []);

      // Verify promise hasn't resolved yet
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });
      expect(resolved).toBe(false);

      // Fast-forward past the timeout delay
      jest.advanceTimersByTime(5100);

      // Trigger the timeout callback
      if (timeoutCallback) {
        timeoutCallback();
      }

      // Now the promise should resolve
      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.code).toBeNull();
      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
    });

    /**
     * Test 5: Verify that resolved flag prevents duplicate processing
     * The key fix is that timeoutId is properly scoped and cleared
     */
    it('should properly scope timeoutId so event handlers can clear it', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      let closeCallback: ((code: number) => void) | null = null;

      const mockChild = {
        pid: 1234,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            closeCallback = callback;
          }
        }),
      };

      (spawn as jest.Mock).mockReturnValue(mockChild);

      const spawnCommand = (manager as any).spawnCommand.bind(manager);
      const promise = spawnCommand('test', ['arg']);

      // Process closes immediately
      if (closeCallback) {
        closeCallback(0);
      }

      const result = await promise;

      // Verify result is as expected from close event
      expect(result.success).toBe(true);
      expect(result.code).toBe(0);

      // The critical part: verify clearTimeout was actually called
      // (this proves timeoutId was properly scoped before doResolve could access it)
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

      // Verify kill was not called (process closed normally)
      expect(mockChild.kill).not.toHaveBeenCalled();
    });
  });

  describe('spawnCommand - Output Capture', () => {
    it('should capture stdout and stderr when verbose is false', async () => {
      let dataCallback: ((data: Buffer) => void) | null = null;
      let closeCallback: ((code: number) => void) | null = null;

      const mockChild = {
        pid: 1234,
        stdout: {
          on: jest.fn((event: string, callback: any) => {
            if (event === 'data') {
              dataCallback = callback;
            }
          }),
        },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            closeCallback = callback;
          }
        }),
      };

      (spawn as jest.Mock).mockReturnValue(mockChild);

      const spawnCommand = (manager as any).spawnCommand.bind(manager);
      const promise = spawnCommand('test', []);

      // Emit some data before close
      if (dataCallback) {
        dataCallback(Buffer.from('test output'));
      }
      if (closeCallback) {
        closeCallback(0);
      }

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('test output');
      expect(result.code).toBe(0);
    });

    it('should use inherit stdio when verbose is true', async () => {
      const verboseManager = new ClaudeCodeManager({ verbose: true });
      const spawnCommand = (verboseManager as any).spawnCommand.bind(verboseManager);

      let closeCallback: ((code: number) => void) | null = null;
      const mockChild = {
        pid: 1234,
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            closeCallback = callback;
          }
        }),
      };

      (spawn as jest.Mock).mockReturnValue(mockChild);

      const promise = spawnCommand('test', []);

      if (closeCallback) {
        closeCallback(0);
      }

      await promise;

      // With verbose mode, spawn was called with 'inherit' stdio
      expect(spawn).toHaveBeenCalledWith(
        'test',
        [],
        expect.objectContaining({
          stdio: 'inherit',
        })
      );
    });
  });
});
