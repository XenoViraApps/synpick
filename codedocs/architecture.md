# Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           User (Terminal)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Layer                                │
│                    (Commander.js)                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  src/cli/index.ts, src/cli/commands.ts                   │   │
│  │  - Parse command-line arguments                          │   │
│  │  - Route to appropriate handler                          │   │
│  │  - Extract unknown options for passthrough               │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Core Application Layer                       │
│                    (SyntheticClaudeApp)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  src/core/app.ts                                         │   │
│  │  - Orchestrates all components                          │   │
│  │  - Handles core workflows (setup, run, model selection)  │   │
│  │  - Manages Claude Code updates                          │   │
│  │  - Coordinates config, models, UI, launcher              │   │
│  └──────────────────────────────────────────────────────────┘   │
└────┬───────────────────────────────────────────────┬───────────┘
     │                                               │
     │                                               │
     ▼                                               ▼
┌──────────────────┐                     ┌──────────────────────┐
│  Component Layer │                     │  External Systems    │
├──────────────────┤                     ├──────────────────────┤
│                  │                     │                      │
│  ┌────────────┐  │                     │  ┌────────────────┐  │
│  │ ConfigMgr  │  │                     │  │  Claude Code   │  │
│  │  Module    │  │                     │  │  (process)     │  │
│  └────────────┘  │                     │  └────────────────┘  │
│                  │                     │                      │
│  ┌────────────┐  │                     │  ┌────────────────┐  │
│  │ ModelMgr   │  │                     │  │  Synthetic API │  │
│  │  Module    │  │◄─────────────────────┼─►  /openai/v1/    │  │
│  └────────────┘  │                     │  │  models         │  │
│                  │                     │  └────────────────┘  │
│  ┌────────────┐  │                     │                      │
│  │    UI      │  │                     │  ┌────────────────┐  │
│  │  Module    │  │                     │  │  NPM Registry  │  │
│  │ (React/Ink)│  │                     │  │  (updates)     │  │
│  └────────────┘  │                     │  └────────────────┘  │
│                  │                     │                      │
│  ┌────────────┐  │                     │  ┌────────────────┐  │
│  │  Launcher  │  │─────────────────────▶│  │   GitHub API   │  │
│  │  Module    │  │                     │  │  (self-update) │  │
│  └────────────┘  │                     │  └────────────────┘  │
│                  │                     │                      │
│  ┌────────────┐  │                     │                      │
│  │ ClaudeMgr  │  │                     │                      │
│  │   Module   │  │                     │                      │
│  └────────────┘  │                     │                      │
└──────────────────┘                     └──────────────────────┘
```

## Core Components

### 1. CLI Layer (`src/cli/`)

**Purpose:** Parse command-line input and route to appropriate handlers.

**Files:**
- `commands.ts` - Commander.js program definition with all CLI commands
- `index.ts` - CLI entry point with error handling

**Key Commands:**
- `synclaude` - Launch Claude Code (main command)
- `synclaude model` - Interactive model selection
- `synclaude thinking-model` - Select thinking model
- `synclaude models` - List available models
- `synclaude search <query>` - Search models
- `synclaude config show/set/reset` - Configuration management
- `synclaude setup` - First-time setup wizard
- `synclaude doctor` - System health check
- `synclaude update` - Update Claude Code
- `synclaude dangerously` - Launch with --dangerously-skip-permissions

### 2. Core Application (`src/core/app.ts`)

**Purpose:** Main orchestrator coordinating all components.

**Key Methods:**
```typescript
class SyntheticClaudeApp {
  // Main workflow
  async run(options: AppOptions & LaunchOptions): Promise<void>

  // Model selection
  async interactiveModelSelection(): Promise<boolean>
  async interactiveThinkingModelSelection(): Promise<boolean>

  // Configuration
  async setup(): Promise<void>
  async showConfig(): Promise<void>
  async setConfig(key: string, value: string): Promise<void>
  async resetConfig(): Promise<void>

  // Models
  async listModels(options): Promise<void>
  async searchModels(query: string, options): Promise<void>
  async clearCache(): Promise<void>

  // Claude Code management
  async ensureClaudeCodeUpdated(): Promise<void>
  async updateClaudeCode(force?: boolean): Promise<void>
  async checkForUpdates(): Promise<void>

  // System
  async doctor(): Promise<void>
  async localInstall(options): Promise<void>
}
```

**Dependencies:**
- `ConfigManager` - Configuration persistence
- `ModelManager` - Model fetching and caching
- `UserInterface` - Terminal UI
- `ClaudeLauncher` - Process launcher
- `ClaudeCodeManager` - Version management

### 3. Configuration Layer (`src/config/`)

**Purpose:** Type-safe configuration management with Zod validation.

**Files:**
- `types.ts` - Zod schema and error classes
- `manager.ts` - ConfigManager class

**Configuration Schema:**
```typescript
interface AppConfig {
  apiKey: string
  baseUrl: string
  anthropicBaseUrl: string
  modelsApiUrl: string
  cacheDurationHours: number  // 1-168
  selectedModel: string
  selectedThinkingModel: string
  firstRunCompleted: boolean
  autoUpdateClaudeCode: boolean
  claudeCodeUpdateCheckInterval: number  // 1-720 hours
  lastClaudeCodeUpdateCheck?: string  // ISO timestamp
  maxTokenSize: number  // 1000-200000
}
```

**Storage:**
- Location: `~/.config/synclaude/config.json`
- Permissions: 0o600 (user-only)
- Backup: `~/.config/synclaude/config.json.backup`

### 4. Model Layer (`src/models/`)

**Purpose:** Model data fetching, caching, and validation.

**Files:**
- `types.ts` - ModelInfo schema and error classes
- `info.ts` - ModelInfoImpl class (wraps API data)
- `cache.ts` - ModelCache class (file-based caching)
- `manager.ts` - ModelManager class (orchestrates fetching)

**Model Data Structure:**
```typescript
interface ModelInfo {
  id: string
  object: string
  created?: number
  owned_by?: string
  provider?: string
  always_on?: boolean
  context_length?: number
  max_output_length?: number
  pricing?: PricingInfo
  quantization?: string
  supported_sampling_parameters?: string[]
  // ... additional fields
}
```

**Cache Details:**
- Location: `~/.config/synclaude/models_cache.json`
- Duration: Configurable (default 24 hours)
- Structure:
```json
{
  "models": [...],
  "timestamp": "ISO-8601",
  "count": 42
}
```

### 5. UI Layer (`src/ui/`)

**Purpose:** Interactive terminal UI using React/Ink.

**Files:**
- `user-interface.tsx` - UserInterface class
- `components/ModelSelector.tsx` - Interactive model selection
- `components/ModelList.tsx` - Model list display
- `components/ProgressBar.tsx` - Progress display
- `components/StatusMessage.tsx` - Status display

**Thinking Model Detection:**
```typescript
function isThinkingModel(modelId: string): boolean {
  const id = modelId.toLowerCase();
  if (id.includes('thinking')) return true;
  if (id.includes('minimax') && (id.includes('2') || id.includes('3'))) return true;
  if (id.includes('deepseek-r1') || id.includes('deepseek-r2') || id.includes('deepseek-r3')) return true;
  if (id.includes('deepseek') && (id.includes('3.2') || id.includes('3-2'))) return true;
  if (id.includes('qwq')) return true;
  if (id.includes('o1')) return true;
  if (id.includes('o3')) return true;
  if (id.includes('qwen3')) return true;
  return false;
}
```

### 6. Launcher Layer (`src/launcher/`)

**Purpose:** Spawn Claude Code with configured environment variables.

**Environment Variables Set:**
```bash
ANTHROPIC_BASE_URL="https://api.synthetic.new/anthropic"
ANTHROPIC_AUTH_TOKEN="<apiKey>"
ANTHROPIC_DEFAULT_OPUS_MODEL="<model>"
ANTHROPIC_DEFAULT_SONNET_MODEL="<model>"
ANTHROPIC_DEFAULT_HAIKU_MODEL="<model>"
ANTHROPIC_DEFAULT_HF_MODEL="<model>"
ANTHROPIC_DEFAULT_MODEL="<model>"
CLAUDE_CODE_SUBAGENT_MODEL="<model>"
ANTHROPIC_THINKING_MODEL="<thinkingModel>"  # if set
CLAUDE_CODE_MAX_TOKEN_SIZE="<maxTokenSize>"
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"
```

### 7. API Client (`src/api/`)

**Purpose:** Axios-based HTTP client with interceptors and error handling.

**Features:**
- Request/response interceptors for logging
- Timeout management (default 30s)
- Automatic error parsing
- ApiError class for structured errors

### 8. Claude Manager (`src/claude/`)

**Purpose:** Manage Claude Code installation and updates.

**Capabilities:**
- Get current version (installed vs npm)
- Get latest version from npm registry
- Install/update via npm
- Run official installer curl script
- Check for updates without installing
- Get installation info (path, symlink status)

## Design Patterns

### Dependency Injection

Components receive dependencies via constructor parameters:

```typescript
constructor() {
  this.configManager = new ConfigManager();
  this.ui = new UserInterface({
    verbose: this.configManager.config.apiKey
      ? this.configManager.config.cacheDurationHours > 0
      : false,
  });
  this.launcher = new ClaudeLauncher();
  this.claudeCodeManager = new ClaudeCodeManager();
}
```

### Singleton Pattern

Global instances for shared state:

```typescript
// Logger
let globalLogger: Logger | null = null;
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger({ level: 'info' });
  }
  return globalLogger;
}

// Claude Code Manager (default singleton)
export const claudeCodeManager = new ClaudeCodeManager();
```

### Lazy Initialization

ModelManager is created only when needed:

```typescript
private getModelManager(): ModelManager {
  if (!this.modelManager) {
    const config = this.configManager.config;
    const cacheFile = join(homedir(), '.config', 'synclaude', 'models_cache.json');
    this.modelManager = new ModelManager({
      apiKey: config.apiKey,
      modelsApiUrl: config.modelsApiUrl,
      cacheFile,
      cacheDurationHours: config.cacheDurationHours,
    });
  }
  return this.modelManager;
}
```

### Configuration Caching

ConfigManager caches parsed configuration with lazy getter:

```typescript
private _config: AppConfig | null = null;

get config(): AppConfig {
  if (this._config === null) {
    this._config = this.loadConfig();
  }
  return this._config;
}
```

## Error Handling Strategy

### Custom Error Classes

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

### Graceful Degradation

- Config load failures fall back to defaults
- Cache errors return empty arrays
- API errors are caught and displayed to users
- First-run flag preserved even on invalid config

## File System Layout

```
~/.config/synclaude/
├── config.json           # User configuration
├── config.json.backup    # Backup of last config
└── models_cache.json     # Cached model data
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ESNEXT",
    "module": "ESNEXT",
    "jsx": "react-jsx",
    "strict": false,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "declaration": true,
    "sourceMap": true
  }
}
```
