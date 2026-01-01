# API Reference

## Table of Contents

- [Core Application](#core-application)
- [Configuration](#configuration)
- [Models](#models)
- [UI](#ui)
- [Launcher](#launcher)
- [API Client](#api-client)
- [Claude Manager](#claude-manager)
- [Utilities](#utilities)

---

## Core Application

### `SyntheticClaudeApp`

Main orchestrator class that coordinates all application components.

**Location:** `src/core/app.ts:20`

```typescript
class SyntheticClaudeApp {
  constructor()
  getConfig(): AppConfig
  async run(options: AppOptions & LaunchOptions): Promise<void>
  async setup(): Promise<void>
  async doctor(): Promise<void>
  async listModels(options: { refresh?: boolean }): Promise<void>
  async searchModels(query: string, options: { refresh?: boolean }): Promise<void>
  async showConfig(): Promise<void>
  async setConfig(key: string, value: string): Promise<void>
  async resetConfig(): Promise<void>
  async clearCache(): Promise<void>
  async cacheInfo(): Promise<void>
  async updateClaudeCode(force?: boolean): Promise<void>
  async checkForUpdates(): Promise<void>
  async interactiveModelSelection(): Promise<boolean>
  async interactiveThinkingModelSelection(): Promise<boolean>
  async localInstall(options: {
    verbose?: boolean;
    force?: boolean;
    skipPath?: boolean;
  }): Promise<void>
}
```

#### Methods

##### `run(options)`
Main workflow entry point. Handles:
- Logging setup
- Banner display
- Claude Code update check
- First-time setup if needed
- Model selection
- Launching Claude Code

**Parameters:**
```typescript
interface AppOptions {
  verbose?: boolean;
  quiet?: boolean;
  additionalArgs?: string[];
  thinkingModel?: string;
}

interface LaunchOptions {
  model?: string;
  claudePath?: string;
  additionalArgs?: string[];
  env?: Record<string, string>;
  thinkingModel?: string | null;
  maxTokenSize?: number;
}
```

##### `setup()`
First-time setup wizard that:
- Prompts for API key
- Tests API connection (optional)
- Runs interactive model selection
- Marks first run as completed

##### `doctor()`
System health check that verifies:
- Claude Code installation
- Configuration (API key)
- API connection
- Claude Code update status
- Configuration summary

##### `updateClaudeCode(force?)`
Updates both synpick (via GitHub) and Claude Code (via npm).

**Parameters:**
- `force: boolean` - Force update even if up to date

##### `interactiveModelSelection()`
Fetches models, displays interactive selector UI, saves selections.

**Returns:** `boolean` - true if selections were made

---

## Configuration

### `AppConfigSchema`

Zod schema defining the complete application configuration.

**Location:** `src/config/types.ts:3`

```typescript
interface AppConfig {
  // Authentication
  apiKey: string;

  // API endpoints
  baseUrl: string;
  anthropicBaseUrl: string;
  modelsApiUrl: string;

  // Cache settings
  cacheDurationHours: number;  // 1-168

  // Selected models
  selectedModel: string;
  selectedThinkingModel: string;

  // Setup state
  firstRunCompleted: boolean;

  // Auto-update settings
  autoUpdateClaudeCode: boolean;
  claudeCodeUpdateCheckInterval: number;  // 1-720 hours
  lastClaudeCodeUpdateCheck?: string;  // ISO 8601 timestamp

  // Claude Code settings
  maxTokenSize: number;  // 1000-200000

  // Timeout settings
  apiTimeoutMs: number;  // 1000-300000, HTTP API request timeout
  commandTimeoutMs: number;  // 1000-60000, Command execution timeout
}
```

### `ConfigManager`

Manages configuration persistence, validation, and access.

**Location:** `src/config/manager.ts:6`

```typescript
class ConfigManager {
  constructor(configDir?: string)

  // Accessors
  get config(): AppConfig

  // Configuration management
  async saveConfig(config?: AppConfig): Promise<boolean>
  async updateConfig(updates: Partial<AppConfig>): Promise<boolean>

  // API key
  hasApiKey(): boolean
  getApiKey(): string
  async setApiKey(apiKey: string): Promise<boolean>

  // Model selection
  getSelectedModel(): string
  async setSelectedModel(model: string): Promise<boolean>
  hasSavedModel(): boolean
  getSavedModel(): string
  async setSavedModel(model: string): Promise<boolean>

  hasSavedThinkingModel(): boolean
  getSavedThinkingModel(): string
  async setSavedThinkingModel(model: string): Promise<boolean>

  // Cache validation
  getCacheDuration(): number
  async setCacheDuration(hours: number): Promise<boolean>
  async isCacheValid(cacheFile: string): Promise<boolean>

  // First-run state
  isFirstRun(): boolean
  async markFirstRunCompleted(): Promise<boolean>
}
```

#### Error Classes

```typescript
class ConfigValidationError extends Error {
  constructor(message: string, cause?: unknown)
}

class ConfigLoadError extends Error {
  constructor(message: string, cause?: unknown)
}

class ConfigSaveError extends Error {
  constructor(message: string, cause?: unknown)
}
```

---

## Models

### `ModelInfo` (interface)

Structure of model data from the Synthetic API.

**Location:** `src/models/types.ts:3`

```typescript
interface ModelInfo {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
  provider?: string;
  always_on?: boolean;
  hugging_face_id?: string;
  name?: string;
  input_modalities?: string[];
  output_modalities?: string[];
  context_length?: number;
  max_output_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
    image?: string;
    request?: string;
    input_cache_reads?: string;
    input_cache_writes?: string;
  };
  quantization?: string;
  supported_sampling_parameters?: string[];
  supported_features?: string[];
  openrouter?: { slug?: string };
  datacenters?: Array<{ country_code?: string }>;
}
```

### `ModelInfoImpl`

Implementation class wrapping model data with utility methods.

**Location:** `src/models/info.ts:3`

```typescript
class ModelInfoImpl implements ModelInfo {
  // All ModelInfo properties...

  constructor(data: ModelInfo)

  getDisplayName(): string
  getProvider(): string
  getModelName(): string
  toJSON(): ModelInfo
}
```

### `ModelCache`

File-based model cache with expiration.

**Location:** `src/models/cache.ts:10`

```typescript
interface ModelCacheOptions {
  cacheFile: string;
  cacheDurationHours: number;
}

class ModelCache {
  constructor(options: ModelCacheOptions)

  async isValid(): Promise<boolean>
  async load(): Promise<ModelInfoImpl[]>
  async save(models: ModelInfoImpl[]): Promise<boolean>
  async clear(): Promise<boolean>
  async getInfo(): Promise<CacheInfo>
}
```

### `CacheInfo` (interface)

```typescript
interface CacheInfo {
  exists: boolean;
  filePath?: string;
  modifiedTime?: string;
  sizeBytes?: number;
  modelCount?: number;
  isValid?: boolean;
  error?: string;
}
```

### `ModelManager`

Orchestrates model fetching, caching, and search.

**Location:** `src/models/manager.ts:13`

```typescript
interface ModelManagerOptions {
  apiKey: string;
  modelsApiUrl: string;
  cacheFile: string;
  cacheDurationHours?: number;
}

class ModelManager {
  constructor(options: ModelManagerOptions)

  async fetchModels(forceRefresh?: boolean): Promise<ModelInfoImpl[]>
  getModels(models?: ModelInfoImpl[]): ModelInfoImpl[]
  async searchModels(query: string, models?: ModelInfoImpl[]): Promise<ModelInfoImpl[]>
  async getModelById(modelId: string, models?: ModelInfoImpl[]): Promise<ModelInfoImpl | null>
  async clearCache(): Promise<boolean>
  async getCacheInfo(): Promise<Record<string, any>>
}
```

#### Error Classes

```typescript
class ModelValidationError extends Error {
  constructor(message: string, cause?: unknown)
}

class ApiError extends Error {
  constructor(
    message: string,
    status?: number,
    response?: any
  )
}
```

---

## UI

### `UserInterface`

Terminal UI class with mixed console and Ink-based components.

**Location:** `src/ui/user-interface.tsx:30`

```typescript
interface UIOptions {
  verbose?: boolean;
  quiet?: boolean;
}

class UserInterface {
  constructor(options: UIOptions)

  // Simple output methods
  info(message: string, ...args: any[]): void
  success(message: string, ...args: any[]): void
  coloredSuccess(message: string, ...args: any[]): void
  coloredInfo(message: string, ...args: any[]): void
  highlightInfo(message: string, highlights: string[]): void
  warning(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
  debug(message: string, ...args: any[]): void

  // Model display
  showModelList(models: ModelInfoImpl[], selectedIndex?: number): void
  async selectModel(models: ModelInfoImpl[]): Promise<ModelInfoImpl | null>
  async selectDualModels(models: ModelInfoImpl[]): Promise<{
    regular: ModelInfoImpl | null;
    thinking: ModelInfoImpl | null;
  }>

  // Progress/status
  showProgress(current: number, total: number, label?: string): void
  showStatus(type: 'info' | 'success' | 'warning' | 'error', message: string): void

  // User input
  async askQuestion(question: string, defaultValue?: string): Promise<string>
  async askPassword(question: string): Promise<string>
  async confirm(message: string, defaultValue?: boolean): Promise<boolean>

  // Terminal control
  clear(): void
}
```

---

## Launcher

### `ClaudeLauncher`

Manages launching Claude Code as a subprocess.

**Location:** `src/launcher/claude-launcher.ts:18`

```typescript
interface LaunchOptions {
  model: string;
  claudePath?: string;
  additionalArgs?: string[];
  env?: Record<string, string>;
  thinkingModel?: string | null;
  maxTokenSize?: number;
}

interface LaunchResult {
  success: boolean;
  pid?: number;
  error?: string;
}

class ClaudeLauncher {
  constructor(claudePath?: string)

  async launchClaudeCode(options: LaunchOptions): Promise<LaunchResult>
  async checkClaudeInstallation(): Promise<boolean>
  async getClaudeVersion(): Promise<string | null>
  setClaudePath(path: string): void
  getClaudePath(): string
}
```

#### Environment Variables Set

| Variable | Value |
|----------|-------|
| `ANTHROPIC_BASE_URL` | `https://api.synthetic.new/anthropic` |
| `ANTHROPIC_AUTH_TOKEN` | Configured API key |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Selected model ID |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Selected model ID |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Selected model ID |
| `ANTHROPIC_DEFAULT_HF_MODEL` | Selected model ID |
| `ANTHROPIC_DEFAULT_MODEL` | Selected model ID |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Selected model ID |
| `ANTHROPIC_THINKING_MODEL` | Selected thinking model ID (if set) |
| `CLAUDE_CODE_MAX_TOKEN_SIZE` | Configured max token size |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `1` |

---

## API Client

### `ApiClient`

Axios-based HTTP client with interceptors and error handling.

**Location:** `src/api/client.ts:10`

```typescript
interface ApiClientOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

class ApiClient {
  constructor(options: ApiClientOptions)

  setApiKey(apiKey: string): void
  setBaseURL(baseURL: string): void
  async get<T = any>(url: string, config?: any): Promise<AxiosResponse<T>>
  async post<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>>
  async put<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>>
  async delete<T = any>(url: string, config?: any): Promise<AxiosResponse<T>>
  async fetchModels(apiKey: string, modelsUrl: string): Promise<ApiModelsResponse>
  getAxiosInstance(): AxiosInstance
}
```

### `ApiModelsResponse`

```typescript
interface ApiModelsResponse {
  data: ModelInfo[];
  object?: string;
}
```

---

## Claude Manager

### `ClaudeCodeManager`

Manages Claude Code installation, updates, and version checking.

**Location:** `src/claude/manager.ts:32`

```typescript
interface InstallOptions {
  force?: boolean;
  verbose?: boolean;
  npmCommand?: string;
}

interface UpdateResult {
  success: boolean;
  action: 'none' | 'installed' | 'updated' | 'failed';
  previousVersion?: string;
  newVersion?: string;
  error?: string;
}

class ClaudeCodeManager {
  constructor(options?: { verbose?: boolean })

  async checkInstallation(): Promise<boolean>
  async getClaudePath(): Promise<string>
  async getCurrentVersion(): Promise<string | null>
  async getNpmInstalledVersion(): Promise<string | null>
  async getLatestVersion(): Promise<string | null>
  async needsUpdate(): Promise<boolean>
  async installOrUpdate(options?: InstallOptions): Promise<UpdateResult>
  async runOfficialInstaller(): Promise<UpdateResult>
  async checkForUpdates(options?: { useActualVersion?: boolean }): Promise<{
    hasUpdate: boolean;
    currentVersion: string | null;
    latestVersion: string | null;
    isNpmInstalled: boolean;
  }>
  static shouldCheckUpdate(lastCheckTime?: string, intervalHours?: number): boolean
  static getCurrentTimestamp(): string
}
```

### Constants

```typescript
CLAUDE_PACKAGE = '@anthropic-ai/claude-code'
NPM_REGISTRY_URL = 'https://registry.npmjs.org/@anthropic-ai/claude-code'
UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000  // 24 hours
OFFICIAL_INSTALL_URL = 'https://claude.ai/install.sh'
```

---

## Utilities

### Logger

Logging utility with level-based output.

**Location:** `src/utils/logger.ts:9`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  constructor(options: { level: LogLevel; verbose?: boolean; quiet?: boolean })

  debug(message: string, ...args: any[]): void
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
  setLevel(level: LogLevel): void
  setVerbose(verbose: boolean): void
  setQuiet(quiet: boolean): void
}

export function setupLogging(verbose?: boolean, quiet?: boolean): void
export function getLogger(): Logger

// Convenience exports
export const log = {
  debug: (message: string, ...args: any[]) => void
  info: (message: string, ...args: any[]) => void
  warn: (message: string, ...args: any[]) => void
  error: (message: string, ...args: any[]) => void
}
```

### Model Utilities

Model-related utility functions for classification and identification.

**Location:** `src/utils/model-utils.ts`

```typescript
/**
 * Determines if a model ID represents a thinking-capable model.
 *
 * Thinking models are identified through pattern matching on the model ID.
 * Patterns include:
 * - Contains "thinking" keyword
 * - Minimax 2/3 variants
 * - DeepSeek-R1/R2/R3 variants
 * - DeepSeek 3.2/3-2 variants
 * - QWQ models
 * - OpenAI O1/O3 models
 * - Qwen3 models
 *
 * @param modelId - The model identifier to check
 * @returns true if the model is identified as a thinking model
 */
function isThinkingModel(modelId: string): boolean
```

**Usage Example:**
```typescript
import { isThinkingModel } from './utils/model-utils';

if (isThinkingModel('deepseek:deepseek-r1')) {
  console.log('This is a thinking model');
}
```

**Supported Patterns:**
| Pattern | Examples |
|---------|----------|
| thinking keyword | `x:thinking-model`, `thinking:latest` |
| minimax 2/3 | `minimax:minimax-2`, `minimax:minimax-3` |
| deepseek-r1/r2/r3 | `deepseek:deepseek-r1`, `deepseek:deepseek-r2` |
| deepseek 3.2/3-2 | `deepseek:deepseek-3.2`, `deepseek:deepseek-3-2` |
| qwq | `qwen:qwq-32b-preview` |
| o1/o3 | `openai:o1-preview`, `openai:o3-mini` |
| qwen3 | `qwen:qwen3-72b` |

---

### Banner

Banner creation and flag normalization utilities.

**Location:** `src/utils/banner.ts`

```typescript
function createBanner(options?: {
  verbose?: boolean;
  quiet?: boolean;
  model?: string;
  thinkingModel?: string;
}): string

function normalizeDangerousFlags(args: string[]): string[]
```

### Install Utilities

Installation and uninstallation functions for local and system-wide setups.

**Location:** `src/install/install.ts`

#### Types

```typescript
enum InstallMethodEnum {
  NPM_USER_PREFIX = 'npm_user_prefix',
  NPM_GLOBAL = 'npm_global',
  MANUAL_LOCAL = 'manual_local'
}

interface InstallOptions {
  verbose?: boolean;
  force?: boolean;
  skipPath?: boolean;
}

interface InstallResult {
  success: boolean;
  installMethod: InstallMethodEnum;
  npmBinDir?: string;
  configuredNpmPrefix?: string;
  pathUpdated?: boolean;
  error?: string;
}

interface PathUpdateResult {
  updated: boolean;
  configFile?: string;
  error?: string;
}
```

#### Functions

##### `installSynclaude`

```typescript
async function installSynclaude(options?: InstallOptions): Promise<boolean>
```

Main installation function that detects the best installation method and executes it.

**Parameters:**
- `options.verbose` - Enable verbose logging
- `options.force` - Force reinstallation
- `options.skipPath` - Skip PATH updates

**Returns:** `true` if successful, `false` otherwise

**Process:**
1. Check if already installed
2. Detect best install method (npm user prefix, npm global, or manual)
3. Execute corresponding installation strategy
4. Configure npm user prefix if needed
5. Update PATH if needed
6. Verify installation

##### `uninstallSynclaude`

```typescript
async function uninstallSynclaude(): Promise<void>
```

Uninstalls synpick from the system.

**Process:**
1. Detect installation method
2. Remove npm global package if installed
3. Clean up stale symlinks
4. Remove directory from PATH if applicable

##### `detectInstallMethod`

```typescript
function detectInstallMethod(): InstallMethodEnum
```

Detects the best installation method for the current system.

**Detection Logic:**
- Use `npm_user_prefix` if user can write to npm prefix without sudo
- Use `npm_global` if user can run npm install -g with sudo
- Use `manual_local` as fallback

**Returns:** The detected installation method

##### `configureNpmUserPrefix`

```typescript
async function configureNpmUserPrefix(): Promise<string | null>
```

Configures npm to use a user-local prefix directory for installations without sudo.

**Returns:** The configured prefix directory, or `null` if failed

**Process:**
1. Create `.npm-global` directory in home
2. Run `npm config set prefix`
3. Verify configuration

##### `addToPathIfNotExists`

```typescript
async function addToPathIfNotExists(dir?: string): Promise<PathUpdateResult>
```

Adds a directory to the user's PATH if it's not already there.

**Parameters:**
- `dir` - Directory to add (defaults to npm bin directory)

**Returns:** Result object with update status

**Supported Files (in order of priority):**
- `~/.zshenv`
- `~/.bash_profile`
- `~/.bashrc`
- `~/.profile`

##### `getNpmBinDir`

```typescript
async function getNpmBinDir(): Promise<string>
```

Gets the npm global binaries directory.

**Returns:** The full path to the npm bin directory

##### `verifyInstallation`

```typescript
async function verifyInstallation(): Promise<boolean>
```

Verifies that synpick is correctly installed and accessible.

**Returns:** `true` if verification passes, `false` otherwise

**Checks:**
- Can execute `synpick --version`
- Version output is valid
- Binary is accessible from current PATH

##### `checkCleanStaleSymlinks`

```typescript
async function checkCleanStaleSymlinks(dir?: string): Promise<void>
```

Checks for and removes stale symlinks in the npm bin directory.

**Parameters:**
- `dir` - Directory to check (defaults to npm bin directory)

**Process:**
1. Finds all symlinks pointing to non-existent targets
2. Reports stale symlinks
3. Removes them

##### `npmGlobalInstallPathExists`

```typescript
async function npmGlobalInstallPathExists(): Promise<boolean>
```

Checks if synpick is installed globally via npm.

**Returns:** `true` if installed, `false` otherwise

##### `getSynclaudeGlobalInstallPath`

```typescript
function getSynclaudeGlobalInstallPath(): string | null
```

Gets the global installation path if synpick is installed via npm.

**Returns:** The installation path, or `null` if not found
