# Configuration System

## Table of Contents

- [Overview](#overview)
- [Configuration Schema](#configuration-schema)
- [ConfigManager](#configmanager)
- [Storage](#storage)
- [Environment Variables](#environment-variables)
- [Error Handling](#error-handling)

---

## Overview

The configuration system uses **Zod** for runtime validation and type safety. Configuration is persisted to a JSON file in the user's home directory with secure permissions.

### Key Features

- **Type-safe** with full Zod schema validation
- **Secure** with 0o600 file permissions (read/write for owner only)
- **Redundant** with automatic backup before writes
- **Resilient** with graceful fallback to defaults on corruption
- **Lazy-loading** with caching for performance

---

## Configuration Schema

### Complete Schema

**Location:** `src/config/types.ts:3`

```typescript
import { z } from 'zod';

export const AppConfigSchema = z.object({
  // Authentication
  apiKey: z.string().default('').describe('Synthetic API key'),

  // API endpoints
  baseUrl: z.string()
    .default('https://api.synthetic.new')
    .describe('Synthetic API base URL'),

  anthropicBaseUrl: z.string()
    .default('https://api.synthetic.new/anthropic')
    .describe('Anthropic-compatible API endpoint'),

  modelsApiUrl: z.string()
    .default('https://api.synthetic.new/openai/v1/models')
    .describe('OpenAI-compatible models endpoint'),

  // Cache settings
  cacheDurationHours: z.number()
    .int()
    .min(1)
    .max(168)
    .default(24)
    .describe('Model cache duration in hours'),

  // Selected models
  selectedModel: z.string()
    .default('')
    .describe('Last selected model'),

  selectedThinkingModel: z.string()
    .default('')
    .describe('Last selected thinking model'),

  // Setup state
  firstRunCompleted: z.boolean()
    .default(false)
    .describe('Whether first-time setup has been completed'),

  // Auto-update settings
  autoUpdateClaudeCode: z.boolean()
    .default(true)
    .describe('Whether to automatically check for Claude Code updates'),

  claudeCodeUpdateCheckInterval: z.number()
    .int()
    .min(1)
    .max(720)
    .default(24)
    .describe('Hours between Claude Code update checks'),

  lastClaudeCodeUpdateCheck: z.string()
    .optional()
    .describe('Last Claude Code update check timestamp (ISO 8601)'),

  // Claude Code settings
  maxTokenSize: z.number()
    .int()
    .min(1000)
    .max(200000)
    .default(128000)
    .describe('Max token size for Claude Code context window'),
  apiTimeoutMs: z.number()
    .int()
    .min(1000)
    .max(300000)
    .default(30000)
    .describe('HTTP API request timeout in milliseconds'),
  commandTimeoutMs: z.number()
    .int()
    .min(1000)
    .max(60000)
    .default(5000)
    .describe('Command execution timeout in milliseconds'),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
```

### Schema Properties Reference

| Property | Type | Default | Range | Description |
|----------|------|---------|-------|-------------|
| `apiKey` | string | `""` | - | Synthetic API authentication key |
| `baseUrl` | string | `https://api.synthetic.new` | Valid URL | Base API URL |
| `anthropicBaseUrl` | string | `https://api.synthetic.new/anthropic` | Valid URL | Anthropic-compatible endpoint |
| `modelsApiUrl` | string | `https://api.synthetic.new/openai/v1/models` | Valid URL | Models API endpoint |
| `cacheDurationHours` | number | `24` | 1-168 | Cache validity in hours |
| `selectedModel` | string | `""` | Valid model ID | Last selected regular model |
| `selectedThinkingModel` | string | `""` | Valid model ID | Last selected thinking model |
| `firstRunCompleted` | boolean | `false` | - | Setup wizard completed flag |
| `autoUpdateClaudeCode` | boolean | `true` | - | Auto-check for Claude Code updates |
| `claudeCodeUpdateCheckInterval` | number | `24` | 1-720 | Hours between update checks |
| `lastClaudeCodeUpdateCheck` | string? | `undefined` | ISO-8601 | Last update check timestamp |
| `maxTokenSize` | number | `128000` | 1000-200000 | Claude Code context window size |
| `apiTimeoutMs` | number | `30000` | 1000-300000 | HTTP API request timeout in milliseconds |
| `commandTimeoutMs` | number | `5000` | 1000-60000 | Command execution timeout in milliseconds |

---

## ConfigManager

### Constructor

```typescript
class ConfigManager {
  constructor(configDir?: string)
}
```

**Parameters:**
- `configDir?: string` - Configuration directory path
  - Default: `~/.config/synpick`

**Example:**
```typescript
// Default location
const config = new ConfigManager();

// Custom location
const config = new ConfigManager('/custom/path');
```

### Properties

#### `config` (getter)

```typescript
get config(): AppConfig
```

Lazy-loaded accessor for the configuration. Loads on first access and caches the result.

**Returns:** Typed `AppConfig` object

**Example:**
```typescript
const manager = new ConfigManager();
const apiKey = manager.config.apiKey;
```

### Methods

#### `saveConfig()`

```typescript
async saveConfig(config?: AppConfig): Promise<boolean>
```

Saves configuration to file with backup and secure permissions.

**Parameters:**
- `config?: AppConfig` - Configuration to save (uses cached value if omitted)

**Returns:** `true` if successful, throws error on failure

**Process:**
1. Ensures config directory exists
2. Creates backup of existing config (`.backup`)
3. Writes new config as JSON
4. Sets file permissions to `0o600`
5. Updates cached value

#### `updateConfig()`

```typescript
async updateConfig(updates: Partial<AppConfig>): Promise<boolean>
```

Updates specific configuration fields with validation.

**Parameters:**
- `updates: Partial<AppConfig>` - Object with fields to update

**Returns:** `true` if successful

**Throws:** `ConfigValidationError` if validation fails

**Example:**
```typescript
await manager.updateConfig({
  cacheDurationHours: 48,
  autoUpdateClaudeCode: false
});
```

### API Key Methods

```typescript
hasApiKey(): boolean
getApiKey(): string
async setApiKey(apiKey: string): Promise<boolean>
```

#### `hasApiKey()`

Returns whether an API key is configured (non-empty string).

#### `getApiKey()`

Returns the configured API key.

#### `setApiKey(apiKey)`

Sets and saves a new API key.

### Model Selection Methods

```typescript
getSelectedModel(): string
async setSelectedModel(model: string): Promise<boolean>
hasSavedModel(): boolean
getSavedModel(): string
async setSavedModel(model: string): Promise<boolean>

getSavedThinkingModel(): string
async setSavedThinkingModel(model: string): Promise<boolean>
hasSavedThinkingModel(): boolean
```

#### `hasSavedModel()`

Returns whether a saved model exists and first run is completed.

#### `getSavedModel()`

Returns the saved model ID, or empty string if not available.

#### `setSavedModel(model)`

Saves a model and marks first run as completed.

### Cache Duration Methods

```typescript
getCacheDuration(): number
async setCacheDuration(hours: number): Promise<boolean>
async isCacheValid(cacheFile: string): Promise<boolean>
```

#### `getCacheDuration()`

Returns cache duration in hours.

#### `setCacheDuration(hours)`

Sets cache duration (1-168 hours).

**Returns:** `false` if validation fails, `true` on success.

#### `isCacheValid(cacheFile)`

Checks if a cache file is still valid based on configured duration.

**Process:**
1. Gets file stats
2. Calculates age
3. Compares with `cacheDurationHours`

### First-Run Methods

```typescript
isFirstRun(): boolean
async markFirstRunCompleted(): Promise<boolean>
```

#### `isFirstRun()`

Returns `true` if first run has not been completed.

#### `markFirstRunCompleted()`

Marks first run as completed.

**Example:**
```typescript
const manager = new ConfigManager();

if (manager.isFirstRun()) {
  // Run setup
  await manager.markFirstRunCompleted();
}
```

---

## Storage

### File Locations

| File | Location | Purpose |
|------|----------|---------|
| `config.json` | `~/.config/synpick/config.json` | Main configuration |
| `config.json.backup` | `~/.config/synpick/config.json.backup` | Backup of last config |
| `models_cache.json` | `~/.config/synpick/models_cache.json` | Model data cache |

### File Permissions

- **config.json**: `0o600` (read/write for owner only)
- **models_cache.json**: Default (no special permissions)

### Backup Strategy

Before writing new configuration:
1. Read existing config (if exists)
2. Write to `config.json.backup`
3. Write new config to `config.json`
4. Set secure permissions

On backup failure:
- Log warning
- Continue with save operation

### Recovery from Corruption

If config file exists but is invalid:
1. Preserve `firstRunCompleted` flag if possible
2. Try to parse with preserved data only
3. If that fails, return defaults

---

## Environment Variables

### Override Variables

| Variable | Overrides | Usage |
|----------|-----------|-------|
| `SYNTHETIC_API_KEY` | `config.apiKey` | Set API key without config |
| `SYNTHETIC_BASE_URL` | `config.baseUrl` | Override API base URL |
| `NODE_ENV` | - | Environment mode (development/production) |

### Implementation

```typescript
const apiKey =
  process.env.SYNTHETIC_API_KEY ||
  configManager.config.apiKey;

const baseUrl =
  process.env.SYNTHETIC_BASE_URL ||
  configManager.config.baseUrl;
```

### Example

```bash
# Use API key from environment
export SYNTHETIC_API_KEY="sk-xxxxxxxxxx"
synpick

# Override base URL (for testing)
synpick SYNTHETIC_BASE_URL="http://localhost:8080"
```

---

## Error Handling

### Error Classes

#### `ConfigValidationError`

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

Thrown when configuration validation fails.

**Thrown by:**
- `updateConfig()` - if Zod validation fails

#### `ConfigLoadError`

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

Thrown when configuration cannot be loaded.

#### `ConfigSaveError`

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

Thrown when configuration cannot be saved.

**Thrown by:**
- `saveConfig()` - on write failures
- `updateConfig()` - on save failures

### Error Handling Pattern

```typescript
async function updateConfigSafely(
  manager: ConfigManager,
  updates: Partial<AppConfig>
): Promise<boolean> {
  try {
    return await manager.updateConfig(updates);
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      console.error('Validation failed:', error.message);
    } else if (error instanceof ConfigSaveError) {
      console.error('Save failed:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
    return false;
  }
}
```

---

## Usage Examples

### Basic Usage

```typescript
import { ConfigManager } from './config';

const configManager = new ConfigManager();

// Read configuration
const apiKey = configManager.config.apiKey;
const maxTokens = configManager.config.maxTokenSize;

// Update configuration
await configManager.updateConfig({
  cacheDurationHours: 48,
  maxTokenSize: 200000
});

// Set API key
await configManager.setApiKey('sk-xxxxxxxxxx');
```

### First-Run Detection

```typescript
import { ConfigManager } from './config';

const configManager = new ConfigManager();

if (configManager.isFirstRun()) {
  // Run setup wizard
  await runSetupWizard();
  await configManager.markFirstRunCompleted();
}
```

### Model Selection Workflow

```typescript
import { ConfigManager } from './config';

const configManager = new ConfigManager();

// Check if model is saved
if (configManager.hasSavedModel()) {
  const modelId = configManager.getSavedModel();
  console.log('Using saved model:', modelId);
}

// Save model after selection
await configManager.setSavedModel('anthropic:claude-3-5-sonnet-20241022');

// Set thinking model
await configManager.setSavedThinkingModel('deepseek:deepseek-r1');
```

### Cache Validation

```typescript
import { ConfigManager } from './config';
import { ModelCache } from './models/cache';

const configManager = new ConfigManager();
const cache = new ModelCache({
  cacheFile: '~/.config/synpick/models_cache.json',
  cacheDurationHours: configManager.config.cacheDurationHours
});

// Check if cache is valid
if (await cache.isValid()) {
  // Use cached data
} else {
  // Fetch from API
}
```

---

## Migration Guide

### Upgrading Config Schema

When adding new configuration fields:

1. Update `AppConfigSchema` with default values
2. Existing configs will automatically get defaults
3. No manual migration needed

```typescript
// Example: Adding new field
export const AppConfigSchema = z.object({
  // ... existing fields
  // New field with default - existing configs auto-get this
  newFeature: z.boolean().default(false),
});
```

### Removing Configuration Fields

When removing fields:

1. Remove from schema
2. Old values in existing configs are ignored
3. No impact on functionality

### Changing Value Constraints

When changing constraints:

1. Update Zod schema
2. Invalid configs may fail validation
3. Provide recovery path

```typescript
// Example: Tightening constraints
// Old: min(0)
// New: min(1)
cacheDurationHours: z.number().int().min(1).max(168),
```
