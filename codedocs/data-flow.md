# Data Flows and Workflows

## Table of Contents

- [Model Selection Flow](#model-selection-flow)
- [Configuration Flow](#configuration-flow)
- [Launch Flow](#launch-flow)
- [Update Flow](#update-flow)
- [First-Time Setup Flow](#first-time-setup-flow)
- [Doctor Flow](#doctor-flow)
- [Cache Management Flow](#cache-management-flow)

---

## Model Selection Flow

```
User runs: synclaude model
         │
         ▼
┌─────────────────────────────────────────────┐
│ CLI: commands.ts                           │
│  - Parse command "model"                   │
│  - Create SyntheticClaudeApp               │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ App: interactiveModelSelection()           │
│  1. Check if API key configured            │
│     └─> If no → error, return false       │
│                                             │
│  2. Get ModelManager (lazy init)           │
│     └─> ConfigManager.getApiKey()          │
│     └─> Create ModelManager instance       │
│                                             │
│  3. Fetch models                           │
│     └─> ModelManager.fetchModels()         │
│         ├─> Check cache validity           │
│         │   └─> ModelCache.isValid()       │
│         │       └─> fs.stat() + age check  │
│         │                                   │
│         ├─> If valid → load from cache     │
│         │   └─> ModelCache.load()          │
│         │       └─> JSON.parse()           │
│         │                                   │
│         └─> If invalid/fresh → fetch API   │
│             └─> axios.get() with auth      │
│             └─> Parse ModelInfoSchema      │
│             └─> Create ModelInfoImpl[]     │
│             └─> ModelCache.save()          │
│                                             │
│  4. Sort models                            │
│     └─> ModelManager.getModels()           │
│         └─> Sort by ID                     │
│                                             │
│  5. Display interactive UI                 │
│     └─> UserInterface.selectDualModels()   │
│         └─> render(<ModelSelector />)      │
│             ├─> Ink/React render           │
│             ├─> Keyboard input handling    │
│             │   ├─> ↑↓ navigation           │
│             │   ├─> t: toggle thinking     │
│             │   ├─> Enter: select+launch   │
│             │   └─> Space: launch          │
│             ├─> Search filtering           │
│             └─> Model selection            │
│                                             │
│  6. Save selections                        │
│     ├─> ConfigManager.setSavedModel()      │
│     └─> ConfigManager.setSavedThinkingModel()│
│         └─> validate with Zod              │
│         └─> fs.writeFile()                 │
│         └─> chmod 0o600                    │
└──────────────┬──────────────────────────────┘
               │
               ▼
        Success message
```

---

## Configuration Flow

### Reading Configuration

```
ConfigManager.config (getter)
         │
         ▼
┌─────────────────────────────────────────────┐
│ Is _config cached?                          │
│  ├─> Yes → return _config                  │
│  └─> No → loadConfig()                     │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ loadConfig()                                │
│  1. Check config file exists                │
│     └─> fs.existsSync(configPath)          │
│                                             │
│  2. If not exists → return defaults         │
│     └─> AppConfigSchema.parse({})          │
│                                             │
│  3. If exists → load and validate          │
│     ├─> JSON.parse(file)                   │
│     ├─> AppConfigSchema.safeParse()        │
│     │   └─> If valid → return              │
│     │                                       │
│     └─> If invalid → recovery              │
│         ├─> Preserve firstRunCompleted     │
│         ├─> Try parse with preserved data  │
│         └─> If still invalid → defaults    │
└─────────────────────────────────────────────┘
```

### Saving Configuration

```
ConfigManager.saveConfig(config)
         │
         ▼
┌─────────────────────────────────────────────┐
│ 1. Ensure config directory exists           │
│    └─> fs.mkdir(configDir, { recursive })  │
│                                             │
│  2. Create backup                          │
│    └─> Read existing config                 │
│    └─> Write to config.json.backup         │
│                                             │
│  3. Write new config                       │
│    └─> JSON.stringify(config, null, 2)     │
│    └─> fs.writeFile(configPath, data)      │
│                                             │
│  4. Set secure permissions                 │
│    └─> chmod(configPath, 0o600)            │
│                                             │
│  5. Update cache                           │
│    └─> _config = config                    │
└─────────────────────────────────────────────┘
```

### Updating Configuration

```
ConfigManager.updateConfig(partial)
         │
         ▼
┌─────────────────────────────────────────────┐
│ 1. Get current config                       │
│    └─> this.config (getter)                │
│                                             │
│  2. Merge with updates                      │
│    └─> { ...current, ...updates }          │
│                                             │
│  3. Validate with Zod                      │
│    └─> AppConfigSchema.safeParse()        │
│    └─> If invalid → throw ConfigError       │
│                                             │
│  4. Save validated config                   │
│    └─> saveConfig(result.data)             │
└─────────────────────────────────────────────┘
```

---

## Launch Flow

```
User runs: synclaude [options]
         │
         ▼
┌─────────────────────────────────────────────┐
│ CLI: Main action handler                    │
│  1. Parse options                          │
│  2. Extract additional args                │
│  3. Normalize dangerous flags              │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ App: run({ model, verbose, quiet, ... })   │
│                                             │
│  1. Setup logging                          │
│    └─> Logger.setLevel()                   │
│                                             │
│  2. Display banner (if !quiet)             │
│    └─> createBanner(options)               │
│                                             │
│  3. Check for Claude Code updates          │
│    └─> ensureClaudeCodeUpdated()           │
│        ├─> Check if enabled                │
│        ├─> Check if interval passed        │
│        ├─> claudeCodeManager.checkForUpdates()│
│        └─> Update last check timestamp     │
│                                             │
│  4. Handle first run                       │
│    └─> If isFirstRun() → setup()          │
│                                             │
│  5. Select model                           │
│    └─> selectModel(options.model)          │
│        ├─> If preselected → use it        │
│        └─> Else → use saved model          │
│                                             │
│  6. Select thinking model                  │
│    └─> selectThinkingModel(options...)     │
│        ├─> If preselected → use it        │
│        └─> Else → use saved model         │
│                                             │
│  7. Launch Claude Code                     │
│    └─> launchClaudeCode(model, options)   │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ Launcher: launchClaudeCode()               │
│                                             │
│  1. Create environment variables            │
│    └─> createClaudeEnvironment()          │
│        ├─> ANTHROPIC_BASE_URL              │
│        ├─> ANTHROPIC_AUTH_TOKEN            │
│        ├─> ANTHROPIC_DEFAULT_*_MODEL       │
│        ├─> CLAUDE_CODE_SUBAGENT_MODEL      │
│        ├─> ANTHROPIC_THINKING_MODEL        │
│        └─> CLAUDE_CODE_MAX_TOKEN_SIZE      │
│                                             │
│  2. Merge with provided env vars           │
│    └─> { ...process.env, ...env, ...options.env }│
│                                             │
│  3. Spawn Claude Code process              │
│    └─> spawn('claude', args, {            │
│          stdio: 'inherit',                 │
│          env: mergedEnv                    │
│        })                                  │
│                                             │
│  4. Handle spawn events                    │
│    ├─> 'spawn' → resolve({ success, pid }) │
│    └─> 'error' → resolve({ success, error })│
└─────────────────────────────────────────────┘
               │
               ▼
        Claude Code runs
```

---

## Update Flow

```
User runs: synclaude update
         │
         ▼
┌─────────────────────────────────────────────┐
│ App: updateClaudeCode(force?)               │
│                                             │
│  Update Synclaude (self)                    │
│  ├─> updateSynclaudeSelf()                 │
│  │   1. Get current version                │
│  │       └─> execSync('synclaude --version')│
│  │                                         │
│  │   2. Get latest version from GitHub     │
│  │       ├─> axios.get(releases/latest)   │
│  │       └─> Fallback: package.json        │
│  │                                         │
│  │   3. Compare versions                  │
│  │       └─> compareVersions()             │
│  │                                         │
│  │   4. If newer or force                  │
│  │       ├─> Download install script       │
│  │       ├─> exec(curl | bash)             │
│  │       ├─> Verify update                 │
│  │       └─> Display success message      │
│  │                                         │
│  Update Claude Code                         │
│  ├─> Check npm installation               │
│  ├─> checkForUpdates({ useActualVersion })│
│  │   ├─> getCurrentVersion()              │
│  │   └─> getLatestVersion()               │
│  │                                         │
│  ├─> If update needed or force             │
│  │   ├─> installOrUpdate()                │
│  │   │   1. npm install -g @anthropic-ai/claude-code│
│  │   │   2. Verify installation          │
│  │   │   3. Return UpdateResult           │
│  │   │                                     │
│  │   └─> Display result                   │
│  │       ├─> "Installed: x.x.x"           │
│  │       └─> "Updated to x.x.x (was y.y.y)"│
└─────────────────────────────────────────────┘
```

---

## First-Time Setup Flow

```
User runs: synclaude (first time)
         │
         ▼
┌─────────────────────────────────────────────┐
│ App: run() detects first run                │
│  └─> configManager.isFirstRun() = true     │
│         │
│         ▼
│ App: setup()                               │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  1. Display welcome message                │
│                                             │
│  2. Prompt for API key                     │
│     └─> ui.askPassword('Enter API key')    │
│         ├─> Enable raw stdin mode         │
│         ├─> Capture keystrokes             │
│         ├─> Display '*' for each char     │
│         └─> Return password string        │
│                                             │
│  3. Save API key                           │
│     └─> configManager.setApiKey(key)      │
│         └─> updateConfig({ apiKey })       │
│             ├─> Zod validation            │
│             └─> fs.writeFile()             │
│                                             │
│  4. Test API connection (optional)         │
│     └─> ui.confirm('Test connection?', yes)│
│         └─> If yes:                        │
│             ├─> modelManager.fetchModels() │
│             ├─> Display success/error     │
│             └─> If error → might exit     │
│                                             │
│  5. Select models (optional)               │
│     └─> ui.confirm('Select models?', yes) │
│         └─> If yes:                        │
│             └─> interactiveModelSelection()│
│                 └─> (See model selection)  │
│                                             │
│  6. Mark first run as completed             │
│     └─> configManager.markFirstRunCompleted()│
│         └─> updateConfig({ firstRunCompleted: true })│
│                                             │
│  7. Display completion message             │
│     └─> Show "Getting started" commands    │
└─────────────────────────────────────────────┘
```

---

## Doctor Flow

```
User runs: synclaude doctor
         │
         ▼
┌─────────────────────────────────────────────┐
│ App: doctor()                              │
│                                             │
│  1. Check Claude Code installation         │
│     └─> launcher.checkClaudeInstallation() │
│         └─> spawn('claude', ['--version']) │
│         └─> On spawn → true, error → false │
│     └─> Display status indicator          │
│                                             │
│     If installed:                          │
│     ├─> launcher.getClaudeVersion()        │
│     │   └─> Parse version output          │
│     │   └─> Display version               │
│     │                                     │
│     └─> Check for updates                 │
│         └─> claudeCodeManager.checkForUpdates()│
│             ├─> Show "Update available"    │
│             └─> Show "Up to date"          │
│                                             │
│  2. Check configuration                    │
│     └─> configManager.hasApiKey()         │
│     └─> Display status indicator          │
│                                             │
│  3. Check API connection                   │
│     └─> If has API key:                   │
│         ├─> modelManager.fetchModels(true) │
│         ├─> Display status indicator       │
│         └─> Show model count              │
│                                             │
│  4. Display configuration summary          │
│     ├─> autoUpdateClaudeCode              │
│     ├─> maxTokenSize                      │
│     └─> Update check interval             │
└─────────────────────────────────────────────┘
```

---

## Cache Management Flow

### Reading Cache

```
ModelManager.fetchModels(forceRefresh?)
         │
         ▼
┌─────────────────────────────────────────────┐
│ Check if force refresh                      │
│  └─> If true → skip cache                  │
│                                             │
│ Check if cache is valid                     │
│  └─> cache.isValid()                      │
│      ├─> fs.stat(cacheFile)               │
│      ├─> Get mtime                         │
│      └─> Compare age with duration         │
│                                             │
│ If valid:                                  │
│  ├─> console.info('Loading from cache')   │
│  ├─> cache.load()                         │
│  │   ├─> readFile(cacheFile)             │
│  │   ├─> JSON.parse()                    │
│  │   ├─> Extract .models[]               │
│  │   └─> Map to ModelInfoImpl[]          │
│  └─> Return models                       │
│                                             │
│ If invalid or force:                       │
│  ├─> Check API key                        │
│  └─> fetchFromApi()                       │
│      ├─> axios.get(modelsApiUrl, {        │
│      │     headers: {                    │
│      │       Authorization: apiKey        │
│      │     }                           │
│      │   })                            │
│      ├─> Parse ModelInfoSchema           │
│      ├─> Create ModelInfoImpl[]          │
│      └─> cache.save(models)             │
│          ├─> mkdir parent dir            │
│          ├─> JSON.stringify({            │
│          │     models: [...],           │
│          │     timestamp: ISO-8601,     │
│          │     count: N                 │
│          │   }, null, 2)                │
│          └─> writeFile(cacheFile)       │
└─────────────────────────────────────────────┘
```

### Clearing Cache

```
ModelManager.clearCache()
         │
         ▼
┌─────────────────────────────────────────────┐
│ cache.clear()                              │
│  └─> fs.unlink(cacheFile)                 │
│  └─> console.debug('Cache cleared')       │
│  └─> Return true                          │
│                                             │
│ On error:                                  │
│  └─> console.error('Error clearing cache')│
│  └─> Return false                         │
└─────────────────────────────────────────────┘
```

### Getting Cache Info

```
ModelManager.getCacheInfo()
         │
         ▼
┌─────────────────────────────────────────────┐
│ cache.getInfo()                            │
│                                             │
│  Try:                                       │
│    1. fs.stat(cacheFile)                   │
│    2. Load models cache.load()            │
│    3. Check validity isValid()            │
│                                             │
│  On success Return:                         │
│    {                                        │
│      exists: true,                         │
│      filePath: string,                     │
│      modifiedTime: ISO-8601,              │
│      sizeBytes: number,                   │
│      modelCount: number,                  │
│      isValid: boolean                     │
│    }                                        │
│                                             │
│  On error Return:                           │
│    {                                        │
│      exists: false,                        │
│      error: message                        │
│    }                                        │
└─────────────────────────────────────────────┘
```

---

## Security Flow

### API Key Handling

```
User enters API key (setup or config set)
         │
         ⬇️
┌──────────────────────────────────────────────┐
│ Masked input handling                       │
│  ├─> stdin.setRawMode(true)                 │
│  ├─> Capture individual keystrokes           │
│  ├─> Display '*' for each character          │
│  ├─> Handle backspace, Enter, Ctrl+C         │
│  └─> Restore original stdin mode            │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│ ConfigManager.setApiKey(key)                │
│  ├─> Validate with Zod                      │
│  └─> saveConfig()                           │
│      ├─> JSON.stringify(config)             │
│      ├─> writeFile(configPath)             │
│      └─> chmod(configPath, 0o600)  🔒      │
│          (owner read/write only)            │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│ Displaying config                          │
│  ├─> getApiKey()                            │
│  ├─> Mask for display                       │
│  │   └─> '••••••••' + suffix                │
│  └─> Show only last 4 characters            │
└──────────────────────────────────────────────┘
```

### API Request with Authentication

```
Need to fetch models
         │
         ▼
┌──────────────────────────────────────────────┐
│ ModelManager.fetchFromApi()                 │
│                                             │
│  1. Prepare headers                         │
│     {                                        │
│       Authorization: 'Bearer <API_KEY>' 🔑  │
│       Content-Type: 'application/json'      │
│     }                                        │
│                                             │
│  2. Make request                            │
│     axios.get(modelsApiUrl, {               │
│       headers,                              │
│       timeout: 30000                        │
│     })                                      │
│                                             │
│  3. Process response                        │
│     ├─> status 200 → success               │
│     ├─> Handle errors via interceptors      │
│     └─> Log debug info                      │
└──────────────────────────────────────────────┘
```
