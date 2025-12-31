# CLI Commands Reference

## Table of Contents

- [Overview](#overview)
- [Main Command](#main-command)
- [Model Commands](#model-commands)
- [Configuration Commands](#configuration-commands)
- [System Commands](#system-commands)
- [Cache Commands](#cache-commands)

---

## Overview

The synpick CLI provides the following command structure:

```
synpick [global-options] [command] [command-options]
```

### Global Options

| Option | Short | Description |
|--------|-------|-------------|
| `--model <model>` | `-m` | Use specific model (skip selection) |
| `--thinking-model <model>` | `-t` | Use specific thinking model |
| `--verbose` | `-v` | Enable verbose logging |
| `--quiet` | `-q` | Suppress non-error output |
| `--help` | `-h` | Display help |
| `--version` | `-V` | Display version |

### Claude Code Passthrough

Any unknown options are passed through to Claude Code, including:
- `--dangerously-skip-permissions`
- `--dangerously-skip-transport`
- `--dangerously-skip-browser-permissions`
- And other Claude Code flags

---

## Main Command

### `synpick` (default)

**Description:** Launch Claude Code with the saved or specified model.

**Usage:**
```bash
synpick [options] [claude-code-options...]
```

**Examples:**
```bash
# Use saved model
synpick

# Use specific model
synpick --model anthropic:claude-3-5-sonnet-20241022

# Use saved model with thinking model
synpick --thinking-model deepseek:deepseek-r1

# Pass options to Claude Code
synpick --dangerously-skip-permissions

# Verbose mode
synpick --verbose

# Quiet mode
synpick --quiet
```

**Behavior:**
1. If this is the first run, runs the setup wizard
2. Checks for Claude Code updates (if enabled)
3. Uses saved model or specified `--model`
4. Uses saved or specified `--thinking-model`
5. Launches Claude Code with configured environment variables

---

## Model Commands

### `synpick model`

**Description:** Interactive model selection and launch Claude Code.

**Usage:**
```bash
synpick model [options]
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--verbose` | `-v` | Enable verbose logging |
| `--quiet` | `-q` | Suppress non-error output |

**Examples:**
```bash
# Interactive selection
synpick model

# Verbose mode
synpick model --verbose
```

**Behavior:**
1. Fetches available models from API (uses cache if valid)
2. Displays interactive model selector UI
3. Allows selection of:
   - Regular model (Enter key)
   - Thinking model (t key to toggle)
4. Saves selections to configuration
5. Launches Claude Code with selected models

**Keyboard Controls:**
| Key | Action |
|-----|--------|
| ↑↓ | Navigate model list |
| Enter | Select as regular model + launch |
| t | Toggle thinking model selection |
| Space | Launch with current selections |
| q / Escape | Quit without saving |

### `synpick thinking-model`

**Description:** Interactive thinking model selection and save to config.

**Usage:**
```bash
synpick thinking-model [options]
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--verbose` | `-v` | Enable verbose logging |

**Examples:**
```bash
synpick thinking-model
```

**Behavior:**
1. Fetches available models from API
2. Displays interactive model selector
3. Allows selection of a thinking model
4. Saves to configuration as `selectedThinkingModel`

### `synpick models`

**Description:** List available models.

**Usage:**
```bash
synpick models [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--refresh` | Force refresh model cache |

**Examples:**
```bash
# List from cache
synpick models

# Force refresh from API
synpick models --refresh
```

**Output Format:**
```
Available Models:
================
  1. claude-3-5-sonnet-20241022 🤔 Thinking
    Provider: anthropic
    Context: 200K tokens
    Quantization: none
    ID: anthropic:claude-3-5-sonnet-20241022

  2. gpt-4o-mini-2024-07-18
    Provider: openai
    Context: 128K tokens
    Quantization: int8
    ID: openai:gpt-4o-mini-2024-07-18
```

### `synpick search <query>`

**Description:** Search models by name or provider.

**Usage:**
```bash
synpick search <query> [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--refresh` | Force refresh model cache |

**Examples:**
```bash
# Search by name
synpick search sonnet

# Search by provider
synpick search anthropic

# Force refresh while searching
synpick search deepseek --refresh
```

**Search Fields:**
- Model ID
- Provider name
- Model name

---

## Configuration Commands

### `synpick config show`

**Description:** Show current configuration.

**Usage:**
```bash
synpick config show
```

**Output Format:**
```
Current Configuration:
=====================
API Key: ************************abc4
Base URL: https://api.synthetic.new
Models API: https://api.synthetic.new/openai/v1/models
Cache Duration: 24 hours
Selected Model: anthropic:claude-3-5-sonnet-20241022
Selected Thinking Model: deepseek:deepseek-r1
First Run Completed: Yes
Auto-update Claude Code: Yes
Update Check Interval: 24 hours
Max Token Size: 128000
```

### `synpick config set <key> <value>`

**Description:** Set configuration value.

**Usage:**
```bash
synpick config set <key> <value>
```

**Supported Keys:**
| Key | Type | Valid Range/Format |
|-----|------|-------------------|
| `apiKey` | string | Any valid API key |
| `baseUrl` | string | Valid URL |
| `modelsApiUrl` | string | Valid URL |
| `cacheDurationHours` | number | 1-168 |
| `selectedModel` | string | Valid model ID |
| `selectedThinkingModel` | string | Valid model ID |
| `autoUpdateClaudeCode` | boolean | `true`, `false`, `1`, `0` |
| `claudeCodeUpdateCheckInterval` | number | 1-720 hours |
| `maxTokenSize` | number | 1000-200000 |

**Examples:**
```bash
# Set API key
synpick config set apiKey sk-xxxxxxxxxx

# Set cache duration to 48 hours
synpick config set cacheDurationHours 48

# Disable auto-update
synpick config set autoUpdateClaudeCode false

# Set max token size
synpick config set maxTokenSize 200000
```

### `synpick config reset`

**Description:** Reset configuration to defaults (requires confirmation).

**Usage:**
```bash
synpick config reset
```

**Behavior:**
1. Prompts for confirmation
2. If confirmed, resets all configuration to defaults
3. First run flag is set to `false`

---

## System Commands

### `synpick setup`

**Description:** Run initial setup.

**Usage:**
```bash
synpick setup
```

**Behavior:**
1. Prompts for Synthetic API key
2. Tests API connection (optional)
3. Runs interactive model selection (optional)
4. Marks first run as completed

**Questions Asked:**
1. `Enter your Synthetic API key:` (masked input)
2. `Test API connection? (Y/n):` (defaults to yes)
3. `Select a model now? (Y/n):` (defaults to yes)

### `synpick doctor`

**Description:** Check system health and configuration.

**Usage:**
```bash
synpick doctor
```

**Output Format:**
```
System Health Check
===================
✓ Claude Code: Installed  (or ✗ Not found)
  Claude Code version: 2.0.76
  ✓ Claude Code is up to date (2.0.76)

✓ Configuration: API key configured  (or ✗ missing)
✓ API connection: OK (42 models)

Auto-update Claude Code: Enabled
Max Token Size: 128000
```

**Checks Performed:**
- Claude Code installation
- Claude Code version
- Claude Code update status
- Configuration (API key)
- API connection
- Configuration summary

### `synpick update`

**Description:** Update Claude Code to the latest version.

**Usage:**
```bash
synpick update [options]
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--force` | `-f` | Force update even if already up to date |

**Behavior:**
1. Checks for synpick updates from GitHub
2. Updates synpick if available (via installer script)
3. Checks for Claude Code updates from npm
4. Updates Claude Code if available (via npm or installer)

**Examples:**
```bash
# Normal update
synpick update

# Force update
synpick update --force
```

### `synpick check-update`

**Description:** Check if there are Claude Code updates available.

**Usage:**
```bash
synpick check-update
```

**Output Format:**
```
Checking for Claude Code updates...
Current version: 2.0.76
Latest version: 2.1.0

✓ Update available!
Run "synpick update" to update Claude Code
```

### `synpick dangerously`

**Description:** Launch Claude Code with `--dangerously-skip-permissions` using last used models.

**Aliases:** `dangerous`, `dang`, `danger`

**Usage:**
```bash
synpick dangerously [options]
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--verbose` | `-v` | Enable verbose logging |
| `--quiet` | `-q` | Suppress non-error output |
| `--force` | `-f` | Force model selection even if last used is available |

**Examples:**
```bash
# Use saved models with dangerous flags
synpick dangerously

# Force model selection
synpick dangerously --force
```

### `synpick install`

**Description:** Install synpick from local directory to system-wide.

**Usage:**
```bash
synpick install [options]
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--verbose` | `-v` | Show detailed installation output |
| `--force` | `-f` | Force reinstallation even if already installed |
| `--skip-path` | | Skip PATH updates |

**Behavior:**
1. Builds the project
2. Removes existing global installation (if `--force`)
3. Links globally via `npm link`
4. Verifies installation
5. Shows installation details

**Examples:**
```bash
# Install
synpick install

# Verbose installation
synpick install --verbose

# Force reinstall
synpick install --force --verbose
```

---

## Cache Commands

### `synpick cache clear`

**Description:** Clear model cache.

**Usage:**
```bash
synpick cache clear
```

**Behavior:**
- Deletes `~/.config/synpick/models_cache.json`
- Next model fetch will refresh from API

### `synpick cache info`

**Description:** Show cache information.

**Usage:**
```bash
synpick cache info
```

**Output Format:**
```
Cache Information:
==================
Status: Valid  (or Expired)
File: /home/user/.config/synpick/models_cache.json
Size: 45678 bytes
Models: 42
Modified: 2024-12-31T12:34:56.789Z
```

### `synpick cache`

**Description:** Cache management group command.

**Subcommands:**
- `clear` - Clear model cache
- `info` - Show cache information

---

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid usage (incorrect arguments) |
| 3 | Network/API error |
| 4 | Configuration error |
| 5 | Launch error |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SYNTHETIC_API_KEY` | Override API key | From config |
| `SYNTHETIC_BASE_URL` | Override base URL | From config |
| `NODE_ENV` | Environment mode | `production` |
| `VERBOSE` | Enable verbose logging | `false` |

---

## Examples

### Common Workflows

```bash
# First-time setup
synpick setup

# Select and use a model
synpick model

# Use a specific model with thinking model
synpick --model anthropic:claude-3-5-sonnet-20241022 --thinking-model deepseek:deepseek-r1

# Check system health
synpick doctor

# Update everything
synpick update

# Check for updates only
synpick check-update

# Search for a model
synpick search sonnet

# Clear cache and refresh models
synpick cache clear
synpick models --refresh
```
