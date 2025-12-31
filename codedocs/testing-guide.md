# Testing Guide

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Test Configuration](#test-configuration)
- [Writing Tests](#writing-tests)
- [Mocking](#mocking)
- [Test Patterns](#test-patterns)
- [Running Tests](#running-tests)

---

## Overview

Synclaude uses **Jest** as its testing framework with full TypeScript support. The test suite covers:

- Configuration management
- Model data parsing and caching
- Claude Code update management
- Installation utilities
- API client interactions
- Launcher process spawning

### Testing Goals

1. **Unit tests** - Individual component functionality
2. **Integration tests** - Component interaction
3. **Coverage** - Maintain high code coverage
4. **Type safety** - Catch errors at compile time

---

## Test Structure

```
tests/
├── config.test.ts           # Configuration tests
├── models.test.ts           # Model management tests
├── claude-manager.test.ts   # Claude Code manager tests
├── install.test.ts          # Installation tests
├── unit/
│   ├── api-client.test.ts   # API client unit tests
│   └── launcher.test.ts     # Launcher unit tests
└── integration/
    └── launcher-env.test.ts # Launcher environment tests

mocks/
├── axios.ts                 # Axios mock
├── child_process.ts         # Child process mock
└── ink.ts                   # Ink mock
```

---

## Test Configuration

### Jest Configuration

**Location:** `jest.config.js`

```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

### TypeScript Types

Add type definitions for Jest:

```typescript
// tests/types.d.ts
declare global {
  namespace NodeJS {
    interface Global {
      [key: string]: any;
    }
  }
}

export {};
```

---

## Writing Tests

### Basic Test Structure

```typescript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    // Setup before each test
    configManager = new ConfigManager('/tmp/test-config');
  });

  afterEach(() => {
    // Cleanup after each test
    // ...
  });

  test('should create instance', () => {
    expect(configManager).toBeInstanceOf(ConfigManager);
  });

  test('should load default config when file does not exist', () => {
    const config = configManager.config;
    expect(config.apiKey).toBe('');
    expect(config.cacheDurationHours).toBe(24);
  });
});
```

### Testing Async Functions

```typescript
describe('ModelManager', () => {
  test('should fetch models from API', async () => {
    const mockModels = [
      { id: 'model1', name: 'Model 1', provider: 'test' },
      { id: 'model2', name: 'Model 2', provider: 'test' },
    ];

    // Mock axios response
    (axios.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: { data: mockModels },
    });

    const manager = new ModelManager({
      apiKey: 'test-key',
      modelsApiUrl: 'https://test.api/models',
      cacheFile: '/tmp/test-cache.json',
    });

    const models = await manager.fetchModels(true);

    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('model1');
  });
});
```

### Testing Error Cases

```typescript
describe('ConfigManager', () => {
  test('should throw error when saving invalid config', async () => {
    const manager = new ConfigManager('/tmp/test-config');

    await expect(async () => {
      await manager.updateConfig({
        cacheDurationHours: 999,  // Exceeds max(168)
      });
    }).rejects.toThrow(ConfigValidationError);
  });

  test('should handle read errors gracefully', () => {
    const manager = new ConfigManager('/nonexistent/path/config');
    const config = manager.config;

    // Should return defaults instead of throwing
    expect(config).toBeDefined();
    expect(config.apiKey).toBe('');
  });
});
```

---

## Mocking

### Mocking Axios

**Location:** `tests/mocks/axios.ts`

```typescript
import { jest } from '@jest/globals';

export const axios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => axios),
};

export const AxiosError = class extends Error {
  constructor(
    message: string,
    public code?: string,
    public config?: any,
    public request?: any,
    public response?: any
  ) {
    super(message);
    this.name = 'AxiosError';
  }
};

export const isAxiosError = jest.fn((error: any) => {
  return error instanceof AxiosError;
});

export default axios;
```

**Usage in tests:**

```typescript
import { axios, AxiosError } from '../mocks/axios';

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle API errors', async () => {
    const error = new AxiosError(
      'Network error',
      'ECONNREFUSED'
    );
    (axios.get as jest.Mock).mockRejectedValue(error);

    const client = new ApiClient();
    await expect(client.get('/test')).rejects.toMatchObject({
      message: expect.stringContaining('Network error'),
    });
  });
});
```

### Mocking Child Process

**Location:** `tests/mocks/child_process.ts`

```typescript
import { jest } from '@jest/globals';

export const mockChild = {
  on: jest.fn(),
  stdout: { on: jest.fn() },
  stderr: { on: jest.fn() },
};

export const spawn = jest.fn(() => mockChild);

export const execSync = jest.fn();

export default {
  spawn,
  execSync,
};
```

**Usage in tests:**

```typescript
import { spawn } from '../mocks/child_process';
import { ClaudeLauncher } from '../../src/launcher/claude-launcher';

describe('ClaudeLauncher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should spawn claude process', async () => {
    // Mock successful spawn
    spawn.mockReturnValue({
      on: jest.fn((event, callback) => {
        if (event === 'spawn') {
          callback();
        }
      }),
    });

    const launcher = new ClaudeLauncher('claude');
    const result = await launcher.launchClaudeCode({
      model: 'test-model',
    });

    expect(spawn).toHaveBeenCalledWith(
      'claude',
      expect.any(Array),
      expect.objectContaining({
        env: expect.any(Object),
        stdio: 'inherit',
      })
    );
    expect(result.success).toBe(true);
  });
});
```

### Mocking Ink (React Terminal UI)

**Location:** `tests/mocks/ink.ts`

```typescript
import { jest } from '@jest/globals';

export const Box = 'Box';
export const Text = 'Text';
export const render = jest.fn((component: any) => ({
  waitUntilExit: jest.fn().mockResolvedValue(undefined),
  unmount: jest.fn(),
}));

export const useInput = jest.fn((callback) => {});
export const useApp = jest.fn(() => ({
  exit: jest.fn(),
}));

export const useStdout = jest.fn(() => ({}));

export default {
  Box,
  Text,
  render,
  useInput,
  useApp,
  useStdout,
};
```

---

## Test Patterns

### Configuration Testing

```typescript
describe('ConfigManager', () => {
  describe('API Key Management', () => {
    test('hasApiKey returns false for empty string', () => {
      const manager = new ConfigManager('/tmp/test');
      expect(manager.hasApiKey()).toBe(false);
    });

    test('hasApiKey returns true for valid key', async () => {
      const manager = new ConfigManager('/tmp/test');
      await manager.setApiKey('sk-test-key');
      expect(manager.hasApiKey()).toBe(true);
    });

    test('getApiKey returns the stored key', async () => {
      const manager = new ConfigManager('/tmp/test');
      await manager.setApiKey('sk-test-key');
      expect(manager.getApiKey()).toBe('sk-test-key');
    });
  });

  describe('Model Selection', () => {
    test('hasSavedModel returns false when not set', () => {
      const manager = new ConfigManager('/tmp/test');
      expect(manager.hasSavedModel()).toBe(false);
    });

    test('hasSavedModel returns true when model is set', async () => {
      const manager = new ConfigManager('/tmp/test');
      await manager.setSavedModel('model-id');
      expect(manager.hasSavedModel()).toBe(true);
    });
  });
});
```

### Model Management Testing

```typescript
describe('ModelManager', () => {
  describe('fetchModels', () => {
    test('should return empty array when no API key', async () => {
      const manager = new ModelManager({
        apiKey: '',
        modelsApiUrl: 'https://test.api/models',
        cacheFile: '/tmp/test-cache.json',
      });

      const models = await manager.fetchModels();
      expect(models).toEqual([]);
    });

    test('should load from cache when valid', async () => {
      const manager = new ModelManager({
        apiKey: 'test-key',
        modelsApiUrl: 'https://test.api/models',
        cacheFile: '/tmp/test-cache.json',
        cacheDurationHours: 24,
      });

      // Mock cache as valid
      jest.spyOn(manager['cache'], 'isValid').mockResolvedValue(true);
      jest.spyOn(manager['cache'], 'load').mockResolvedValue([
        expect.anything(),
      ]);

      const models = await manager.fetchModels();

      expect(manager['cache'].isValid).toHaveBeenCalled();
      expect(manager['cache'].load).toHaveBeenCalled();
    });
  });

  describe('searchModels', () => {
    test('should filter by provider', async () => {
      const manager = new ModelManager({
        apiKey: 'test-key',
        modelsApiUrl: 'https://test.api/models',
        cacheFile: '/tmp/test-cache.json',
      });

      const models = [
        new ModelInfoImpl({ id: 'anthropic:model1', provider: 'anthropic' }),
        new ModelInfoImpl({ id: 'openai:model2', provider: 'openai' }),
      ];

      const results = manager.searchModels('anthropic', models);

      expect(results).toHaveLength(1);
      expect(results[0].provider).toBe('anthropic');
    });
  });
});
```

### Cache Testing

```typescript
describe('ModelCache', () => {
  describe('isValid', () => {
    test('should return false when file does not exist', async () => {
      const cache = new ModelCache({
        cacheFile: '/nonexistent/cache.json',
        cacheDurationHours: 24,
      });

      expect(await cache.isValid()).toBe(false);
    });

    test('should return false when cache is expired', async () => {
      // Create old cache file
      const fs = require('fs');
      const oneDayAgo = Date.now() - 25 * 60 * 60 * 1000;

      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        mtime: new Date(oneDayAgo),
      } as any);

      const cache = new ModelCache({
        cacheFile: '/tmp/test-cache.json',
        cacheDurationHours: 24,
      });

      expect(await cache.isValid()).toBe(false);
    });
  });
});
```

---

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- config.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="API key"
```

### Verbose Output

```bash
npm test -- --verbose
```

---

## Test Scripts Reference

| Script | Description |
|--------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm test -- <file>` | Run specific test file |
| `npm test -- --verbose` | Verbose test output |

---

## Coverage Targets

Current coverage requirements (subject to change):

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

To improve coverage:
1. Add tests for uncovered branches
2. Add edge case tests
3. Add error handling tests
4. Add integration tests

---

## Best Practices

### 1. Isolate Tests

Each test should be independent:

```typescript
beforeEach(() => {
  // Reset state before each test
  jest.clearAllMocks();
});
```

### 2. Use Descriptive Test Names

```typescript
// Good
test('should throw ConfigValidationError when cache duration exceeds max', async () => {
  // ...
});

// Bad
test('test config', () => {
  // ...
});
```

### 3. Test Success and Failure Paths

```typescript
describe('saveConfig', () => {
  test('should save successfully with valid config', async () => {
    // ...
  });

  test('should throw error when directory does not exist', async () => {
    // ...
  });
});
```

### 4. Mock External Dependencies

Don't make real network calls:

```typescript
// Instead of:
await axios.get('https://api.example.com/data');

// Use mock:
(axios.get as jest.Mock).mockResolvedValue({
  data: { /* ... */ },
});
```

### 5. Match Specific Values

```typescript
// Good - specific assertion
expect(result.status).toBe(200);
expect(result.data).toEqual({ id: 'test' });

// Bad - loose assertion
expect(result).toBeTruthy();
```

### 6. Use beforeEach/afterEach

For common setup/teardown:

```typescript
describe('ModelManager', () => {
  let manager: ModelManager;

  beforeEach(() => {
    manager = new ModelManager({
      apiKey: 'test-key',
      modelsApiUrl: 'https://test.api/models',
      cacheFile: '/tmp/test-cache.json',
    });
  });

  // Tests...
});
```
