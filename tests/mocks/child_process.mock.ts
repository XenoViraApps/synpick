/**
 * Child Process Mock Setup
 *
 * Provides mocking utilities for child_process.spawn and child_process.execSync.
 */

import { spawn } from 'child_process';
import { execSync } from 'child_process';

// Mock child_process at the top level
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  execSync: jest.fn(),
}));

// Type assertions for mocked functions
export const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
export const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

/**
 * Create a mock child process object
 *
 * @param pid - Process ID to return
 * @param spawnSuccess - Whether spawn should succeed (trigger 'spawn' event) or fail (trigger 'error' event)
 * @returns Mock child process object with required methods
 */
export function createMockChildProcess(pid: number, spawnSuccess = true) {
  const mockChild = {
    pid,
    killed: false,
    on: jest.fn((event, callback) => {
      if (event === 'spawn' && spawnSuccess) {
        setImmediate(() => callback());
      } else if (event === 'error' && !spawnSuccess) {
        setImmediate(() => callback(new Error('Spawn failed')));
      } else if (event === 'exit') {
        // No-op, tests can call the callback directly if needed
      }
    }),
    kill: jest.fn(() => {
      mockChild.killed = true;
    }),
    stdout: {
      pipe: jest.fn(),
    },
    stderr: {
      pipe: jest.fn(),
    },
    stdin: {
      pipe: jest.fn(),
    },
    unref: jest.fn(),
  };

  return mockChild;
}

/**
 * Helper to reset all child_process mocks
 */
export function resetChildProcessMocks() {
  mockSpawn.mockReset();
  mockExecSync.mockReset();
}

/**
 * Setup mock spawn to return a successful child process
 */
export function setupMockSpawnSuccess(pid = 1234) {
  const mockChild = createMockChildProcess(pid, true);
  mockSpawn.mockReturnValue(mockChild as any);
  return mockChild;
}

/**
 * Setup mock spawn to return a failed child process
 */
export function setupMockSpawnFailure() {
  const mockChild = createMockChildProcess(0, false);
  mockSpawn.mockReturnValue(mockChild as any);
  return mockChild;
}

/**
 * Setup mock execSync to return a value
 */
export function setupMockExecSync(output: string) {
  mockExecSync.mockReturnValue(output as any);
}

/**
 * Setup mock execSync to throw an error
 */
export function setupMockExecSyncError(message: string) {
  mockExecSync.mockImplementation(() => {
    throw new Error(message);
  });
}
