# Error Handling

## Table of Contents

- [Overview](#overview)
- [Error Classes](#error-classes)
- [Error Handling Patterns](#error-handling-patterns)
- [Component-Specific Handling](#component-specific-handling)
- [Error Recovery](#error-recovery)
- [User-Facing Error Messages](#user-facing-error-messages)

---

## Overview

Synpick uses a structured error handling approach with custom error classes, consistent patterns, and graceful degradation where appropriate.

### Error Handling Principles

1. **Type-safe errors** - Custom error classes with type information
2. **Chain causes** - Use `cause` property for error chaining
3. **Graceful degradation** - Fall back to sensible defaults
4. **User-friendly messages** - Clear, actionable error messages
5. **Debug information** - Include technical details via `--verbose`

---

## Error Classes

### Configuration Errors

**Location:** `src/config/types.ts:53`

#### `ConfigValidationError`

Raised when configuration data fails Zod validation.

```typescript
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public override cause?: unknown
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}
```

**Thrown by:**
- `ConfigManager.updateConfig()` - When `AppConfigSchema.safeParse()` fails

**Example:**
```typescript
try {
  await configManager.updateConfig({
    cacheDurationHours: 999  // Exceeds max(168)
  });
} catch (error) {
  if (error instanceof ConfigValidationError) {
    console.error('Invalid config:', error.message);
    // "Invalid configuration update: ..."
  }
}
```

#### `ConfigLoadError`

Raised when configuration cannot be loaded from file.

```typescript
export class ConfigLoadError extends Error {
  constructor(
    message: string,
    public override cause?: unknown
  ) {
    super(message);
    this.name = 'ConfigLoadError';
  }
}
```

#### `ConfigSaveError`

Raised when configuration cannot be saved to file.

```typescript
export class ConfigSaveError extends Error {
  constructor(
    message: string,
    public override cause?: unknown
  ) {
    super(message);
    this.name = 'ConfigSaveError';
  }
}
```

**Thrown by:**
- `ConfigManager.saveConfig()` - On write failures
- `ConfigManager.updateConfig()` - On save failures

### Model Errors

**Location:** `src/models/types.ts:66`

#### `ModelValidationError`

Raised when model data fails Zod validation.

```typescript
export class ModelValidationError extends Error {
  constructor(
    message: string,
    public override cause?: unknown
  ) {
    super(message);
    this.name = 'ModelValidationError';
  }
}
```

**Thrown by:**
- `ModelInfoImpl.constructor()` - When `ModelInfoSchema.safeParse()` fails

**Example:**
```typescript
try {
  const model = new ModelInfoImpl({ id: 123 });  // Missing required fields
} catch (error) {
  if (error instanceof Error && error.message.includes('Invalid model data')) {
    console.error('Invalid model data:', error.message);
  }
}
```

#### `ApiError`

Raised for API communication errors.

```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

**Thrown by:**
- `ModelManager.fetchFromApi()` - On HTTP errors
- `ApiClient.handleError()` - On axios errors

**Properties:**
- `message: string` - Human-readable error message
- `status?: number` - HTTP status code (if available)
- `response?: any` - Response body (if available)

---

## Error Handling Patterns

### Zod Error Handling

**Pattern:** Use `safeParse()` and check result

```typescript
// In config/manager.ts
async updateConfig(updates: Partial<AppConfig>): Promise<boolean> {
  try {
    const currentData = this.config;
    const updatedData = { ...currentData, ...updates };

    const result = AppConfigSchema.safeParse(updatedData);
    if (!result.success) {
      throw new ConfigValidationError(
        `Invalid configuration update: ${result.error.message}`
      );
    }

    return await this.saveConfig(result.data);
  } catch (error) {
    if (error instanceof ConfigValidationError || error instanceof ConfigSaveError) {
      throw error;
    }
    throw new ConfigSaveError('Failed to update configuration', error);
  }
}
```

### Axios Error Handling

**Pattern:** Use `axios.isAxiosError()` to detect axios errors

```typescript
// In models/manager.ts
private async fetchFromApi(): Promise<ModelInfoImpl[]> {
  try {
    const response = await axios.get(this.modelsApiUrl, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    if (response.status === 200) {
      return /* process models */;
    } else {
      throw new ApiError(
        `API error: ${response.status} - ${response.statusText}`,
        response.status,
        response.data
      );
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new ApiError(
          `API error: ${error.response.status} - ${error.response.statusText}`,
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        throw new ApiError('Network error: No response received from API');
      } else {
        throw new ApiError(`Network error: ${error.message}`);
      }
    }
    throw new ApiError(`Error fetching models: ${(error as Error).message}`);
  }
}
```

### File Operation Error Handling

**Pattern:** Check file existence before operations

```typescript
// In config/manager.ts
private loadConfig(): AppConfig {
  try {
    const fs = require('fs');

    if (!fs.existsSync(this.configPath)) {
      return AppConfigSchema.parse({});
    }

    const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    const result = AppConfigSchema.safeParse(configData);

    if (!result.success) {
      // Try to preserve firstRunCompleted
      const preservedConfig = {
        firstRunCompleted: configData.firstRunCompleted || false,
      };

      const fallbackResult = AppConfigSchema.safeParse(preservedConfig);
      if (fallbackResult.success) {
        return fallbackResult.data;
      }

      return AppConfigSchema.parse({});
    }

    return result.data;
  } catch {
    // Recovery attempt
    const fs = require('fs');
    if (fs.existsSync(this.configPath)) {
      try {
        const partialConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        if (partialConfig.firstRunCompleted === true) {
          return AppConfigSchema.parse({ firstRunCompleted: true });
        }
      } catch {
        // Final fallback
      }
    }
    return AppConfigSchema.parse({});
  }
}
```

### Async Promise Error Handling

**Pattern:** Wrap in try-catch and handle appropriately

```typescript
// In ui/user-interface.tsx
async selectModel(models: ModelInfoImpl[]): Promise<ModelInfoImpl | null> {
  if (models.length === 0) {
    this.error('No models available for selection');
    return null;
  }

  return new Promise(resolve => {
    const { waitUntilExit } = render(
      <ModelSelector
        models={models}
        onSelect={(regularModel, thinkingModel) => {
          const selected = regularModel || thinkingModel;
          if (selected) {
            this.success(`Selected model: ${selected.getDisplayName()}`);
            resolve(selected);
          } else {
            this.info('No model selected');
            resolve(null);
          }
        }}
        onCancel={() => {
          this.info('Model selection cancelled');
          resolve(null);
        }}
      />
    );

    waitUntilExit().catch(() => {
      this.error('Selection error occurred');
      resolve(null);
    });
  });
}
```

---

## Component-Specific Handling

### ConfigManager

**Graceful Recovery:**
1. Missing config file → use defaults
2. Invalid config → preserve `firstRunCompleted`, use rest as defaults
3. Backup failure → log warning, continue
4. Permission failure → throw `ConfigSaveError`

**Example:**
```typescript
async saveConfig(config?: AppConfig): Promise<boolean> {
  const configToSave = config || this._config;
  if (!configToSave) {
    throw new ConfigSaveError('No configuration to save');
  }

  try {
    await this.ensureConfigDir();

    // Create backup
    try {
      const fsSync = require('fs');
      if (fsSync.existsSync(this.configPath)) {
        const backupPath = `${this.configPath}.backup`;
        const existingData = await readFile(this.configPath, 'utf-8');
        await writeFile(backupPath, existingData, 'utf-8');
      }
    } catch (backupError) {
      console.warn('Failed to create config backup:', backupError);
      // Continue with save
    }

    const configJson = JSON.stringify(configToSave, null, 2);
    await writeFile(this.configPath, configJson, 'utf-8');

    // Set secure permissions
    try {
      await chmod(this.configPath, 0o600);
    } catch (chmodError) {
      console.warn('Failed to set secure permissions on config file:', chmodError);
      // Continue - not fatal
    }

    this._config = configToSave;
    return true;
  } catch (error) {
    throw new ConfigSaveError(
      `Failed to save configuration to ${this.configPath}`,
      error
    );
  }
}
```

### ModelManager

**Error Handling:**
1. No API key → return empty with warning
2. Invalid model data → skip, log warning, continue
3. API error → throw `ApiError`
4. Cache error → return empty array

**Example:**
```typescript
async fetchModels(forceRefresh = false): Promise<ModelInfoImpl[]> {
  if (!forceRefresh && (await this.cache.isValid())) {
    console.info('Loading models from cache');
    return this.cache.load();
  }

  if (!this.apiKey) {
    console.warn('No API key configured');
    return [];
  }

  console.info('Fetching models from API');
  const models = await this.fetchFromApi();

  if (models.length > 0) {
    await this.cache.save(models);
    console.info(`Fetched ${models.length} models`);
  } else {
    console.warn('No models received from API');
  }

  return models;
}

private async fetchFromApi(): Promise<ModelInfoImpl[]> {
  try {
    const response = await axios.get(this.modelsApiUrl, { /* ... */ });

    if (response.status === 200) {
      const modelsData = response.data.data || [];
      const models: ModelInfoImpl[] = [];

      // Skip invalid models rather than fail entirely
      for (const modelData of modelsData) {
        try {
          const model = new ModelInfoImpl(modelData);
          models.push(model);
        } catch (error) {
          console.warn(
            `Invalid model data: ${modelData.id || 'unknown'}:`,
            error
          );
        }
      }

      return models;
    } else {
      throw new ApiError(
        `API error: ${response.status} - ${response.statusText}`,
        response.status,
        response.data
      );
    }
  } catch (error) {
    // Handle axios errors specifically
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new ApiError(
          `API error: ${error.response.status}`,
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        throw new ApiError('Network error: No response received');
      }
    }
    throw new ApiError(`Error fetching models: ${(error as Error).message}`);
  }
}
```

### ClaudeLauncher

**Error Handling:**
1. Claude not installed → return error result
2. Spawn error → catch and return error result
3. Timeout → attempt kill, return null

**Example:**
```typescript
async launchClaudeCode(options: LaunchOptions): Promise<LaunchResult> {
  try {
    const env = {
      ...process.env,
      ...this.createClaudeEnvironment(options),
      ...options.env,
    };

    const args = [...(options.additionalArgs || [])];
    const claudePath = options.claudePath || this.claudePath;

    return new Promise(resolve => {
      const child = spawn(claudePath, args, {
        stdio: 'inherit',
        env,
      });

      child.on('spawn', () => {
        resolve({
          success: true,
          pid: child.pid || undefined,
        });
      });

      child.on('error', error => {
        console.error(`Failed to launch Claude Code: ${error.message}`);
        resolve({
          success: false,
          error: error.message,
        });
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error launching Claude Code: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
```

---

## Error Recovery

### Configuration Recovery

When config file is corrupted:
1. Try to preserve `firstRunCompleted` flag
2. Apply Zod schema to get valid defaults
3. Log warning for recovery

```typescript
// In config/manager.ts
const preservedConfig = {
  firstRunCompleted: configData.firstRunCompleted || false,
};
const fallbackResult = AppConfigSchema.safeParse(preservedConfig);
if (fallbackResult.success) {
  return fallbackResult.data;
}
```

### Model Cache Recovery

When cache is invalid:
1. Return empty array
2. Allow fresh fetch from API
3. Log failure if needed

```typescript
async load(): Promise<ModelInfoImpl[]> {
  if (!(await this.isValid())) {
    return [];  // Graceful fallback
  }

  try {
    const data = await readFile(this.cacheFile, 'utf-8');
    const cacheData = JSON.parse(data);
    const modelsData = cacheData.models || [];
    return modelsData.map((modelData: any) => new ModelInfoImpl(modelData));
  } catch (error) {
    console.error('Error loading cache:', error);
    return [];  // Graceful fallback
  }
}
```

### Partial Success Handling

Model API: Skip invalid models, continue with valid ones

```typescript
for (const modelData of modelsData) {
  try {
    const model = new ModelInfoImpl(modelData);
    models.push(model);
  } catch (error) {
    console.warn(`Invalid model data: ${modelData.id || 'unknown'}:`, error);
    // Continue with next model
  }
}
```

---

## User-Facing Error Messages

### Message Guidelines

1. **Be specific** - What went wrong
2. **Be actionable** - What can the user do
3. **Use consistent formatting** - Icons, colors
4. **Include technical details** - Via `--verbose`

### Message Format

```typescript
// Error prefix with icon
ui.error('Failed to launch Claude Code: file not found');

// Context + error
ui.error(`API connection failed: ${(error as Error).message}`);

// Actionable message
ui.info('No models available. Please check your API key and connection.');
ui.info('Run "synpick setup" to configure your API key.');
```

### Error Icons

| Icon | Level | Method |
|------|-------|--------|
| ✓ | Success | `success()`, `coloredSuccess()` |
| ℹ | Info | `info()`, `coloredInfo()`, `highlightInfo()` |
| ⚠ | Warning | `warning()` |
| ✗ | Error | `error()` |
| 🐛 | Debug | `debug()` |

### Color Coding

```typescript
// Success - green (chalk)
ui.coloredSuccess('Operation completed');

// Info - blue (chalk)
ui.coloredInfo('Fetching models...');

// Highlights - cyan (chalk)
ui.highlightInfo('Run synpick model', ['synpick', 'model']);

// Thinking models - yellow (chalk)
// 🤔 Thinking indicator
```

### Example Dialogues

```typescript
// API key not configured
ui.error('No API key configured.');
ui.info('Please run "synpick setup" to configure your API key.');

// Network error
ui.error('API connection failed: Network timeout');
ui.info('Check your internet connection and try again.');

// Permission error
ui.error('Failed to save configuration: Permission denied');
ui.info('Check that you have write access to ~/.config/synpick/');

// Invalid input
ui.error(`Invalid cache duration: ${value}`);
ui.info('Cache duration must be between 1 and 168 hours.');
```

---

## Verbose Error Output

### Debug Information

When `--verbose` is enabled, include:
- Stack traces
- Detailed error objects
- Request/response details
- Internal state

```typescript
// In core/app.ts
async run(options: AppOptions & LaunchOptions): Promise<void> {
  await this.setupLogging(options);

  // Debug timing
  log.debug('Starting run() at', Date.now());

  try {
    // ... operation
  } catch (error) {
    log.debug('Error details:', error);
    ui.error(`Operation failed: ${(error as Error).message}`);
  }
}
```

### API Response Debugging

```typescript
// In api/client.ts - request interceptor
axios.interceptors.request.use(config => {
  console.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor
axios.interceptors.response.use(
  response => {
    console.debug(`API Response: ${response.status} ${response.statusText}`);
    return response;
  },
  error => {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(
          `API Error Response: ${error.response.status} ${error.response.statusText}`
        );
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Error Code Conventions

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid usage / command line error |
| 3 | Network / API error |
| 4 | Configuration error |
| 5 | Launch / execution error |

### Launch Result Codes

```typescript
interface LaunchResult {
  success: boolean;
  pid?: number;  // Process ID if successful
  error?: string;  // Error message if failed
}
```

### Update Result Actions

```typescript
interface UpdateResult {
  success: boolean;
  action: 'none' | 'installed' | 'updated' | 'failed';
  previousVersion?: string;
  newVersion?: string;
  error?: string;
}
```
