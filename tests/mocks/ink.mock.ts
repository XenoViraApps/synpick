/**
 * Ink Mock Setup
 *
 * Provides mocking utilities for Ink React components and hooks.
 */

import { render as inkRender } from 'ink';
import { useInput, useApp, useStdout } from 'ink';
import { Box, Text } from 'ink';

// Mock ink module
jest.mock('ink', () => {
  const actualInk = jest.requireActual('ink');

  return {
    ...actualInk,
    render: jest.fn(),
    useInput: jest.fn(),
    useApp: jest.fn(),
    useStdout: jest.fn(),
  };
});

// Type assertions for mocked functions
export const mockRender = inkRender as jest.MockedFunction<typeof inkRender>;
export const mockUseInput = useInput as jest.Mock;
export const mockUseApp = useApp as jest.Mock;
export const mockUseStdout = useStdout as jest.Mock;

// Mock App instance
export const createMockApp = () => ({
  exit: jest.fn(),
});

// Mock Stdout instance
export const createMockStdout = () => ({
  write: jest.fn(),
});

// Mock Input handler
export const createMockInputHandler = () => {
  let handler: ((input: string, key: any) => void) | null = null;

  return {
    setHandler: (cb: (input: string, key: any) => void) => {
      handler = cb;
    },
    simulate: (input: string, key: any = {}) => {
      if (handler) handler(input, key);
    },
  };
};

// Helper to setup render mock with waitUntilExit
export function setupMockRender(promise?: Promise<void>) {
  const waitUntilExit = jest.fn(() => promise || Promise.resolve());
  const unmount = jest.fn();
  mockRender.mockReturnValue({ waitUntilExit, unmount });
  return { waitUntilExit, unmount };
}

// Helper to reset all ink mocks
export function resetInkMocks() {
  mockRender.mockReset();
  mockUseInput.mockReset();
  mockUseApp.mockReset();
  mockUseStdout.mockReset();
}

// Helper to setup useApp mock
export function setupMockUseApp(mockApp = createMockApp()) {
  mockUseApp.mockReturnValue(mockApp);
  return mockApp;
}

// Helper to setup useStdout mock
export function setupMockUseStdout(mockStdout = createMockStdout()) {
  mockUseStdout.mockReturnValue(mockStdout);
  return mockStdout;
}

// Helper to setup useInput mock
export function setupMockUseInput() {
  const { setHandler, simulate } = createMockInputHandler();
  mockUseInput.mockImplementation((handler) => {
    setHandler(handler);
  });
  return { setHandler, simulate };
}
