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

The synclaude CLI provides the following command structure:

```
synclaude [global-options] [command] [command-options]
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

### `synclaude` (default)

**Description:** Launch Claude Code with the saved or specified model.

**Usage:**
```bash
synclaude [options] [claude-code-options...]
```

**Examples:**
```bash
# Use saved model
synclaude

# Use specific model
synclaude --model anthropic:claude-3-5-sonnet-20241022

# Use saved model with thinking model
synclaude --thinking-model deepseek:deepseek-r1

# Pass options to Claude Code
synclaude --dangerously-skip-permissions

# Verbose mode
synclaude --verbose

# Quiet mode
synclaude --quiet
```

**Behavior:**
1. If this is the first run, runs the setup wizard
2. Checks for Claude Code updates (if enabled)
3. Uses saved model or specified `--model`
4. Uses saved or specified `--thinking-model`
5. Launches Claude Code with configured environment variables

---

## Model Commands

### `synclaude model`

**Description:** Interactive model selection and launch Claude Code.

**Usage:**
```bash
synclaude model [options]
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--verbose` | `-v` | Enable verbose logging |
| `--quiet` | `-q` | Suppress non-error output |

**Examples:**
```bash
# Interactive selection
synclaude model

# Verbose mode
synclaude model --verbose
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

### `synclaude thinking-model`

**Description:** Interactive thinking model selection and save to config.

**Usage:**
```bash
synclaude thinking-model [options]
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--verbose` | `-v` | Enable verbose logging |

**Examples:**
```bash
synclaude thinking-model
```

**Behavior:**
1. Fetches available models from API
2. Displays interactive model selector
3. Allows selection of a thinking model
4. Saves to configuration as `selectedThinkingModel`

### `synclaude models`

**Description:** List available models.

**Usage:**
```bash
synclaude models [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--refresh` | Force refresh model cache |

**Examples:**
```bash
# List from cache
synclaude models

# Force refresh from API
synclaude models --refresh
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

### `synclaude search <query>`

**Description:** Search models by name or provider.

**Usage:**
```bash
synclaude search <query> [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--refresh` | Force refresh model cache |

**Examples:**
```bash
# Search by name
synclaude search sonnet

# Search by provider
synclaude search anthropic

# Force refresh while searching
synclaude search deepseek --refresh
```

**Search Fields:**
- Model ID
- Provider name
- Model name

---

## Configuration Commands

### `synclaude config show`

**Description:** Show current configuration.

**Usage:**
```bash
synclaude config show
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

### `synclaude config set <key> <value>`

**Description:** Set configuration value.

**Usage:**
```bash
synclaude config set <key> <value>
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
synclaude config set apiKey sk-xxxxxxxxxx

# Set cache duration to 48 hours
synclaude config set cacheDurationHours 48

# Disable auto-update
synclaude config set autoUpdateClaudeCode false

# Set max token size
synclaude config set maxTokenSize 200000
```

### `synclaude config reset`

**Description:** Reset configuration to defaults (requires confirmation).

**Usage:**
```bash
synclaude config reset
```

**Behavior:**
1. Prompts for confirmation
2. If confirmed, resets all configuration to defaults
3. First run flag is set to `false`

---

## System Commands

### `synclaude setup`

**Description:** Run initial setup.

**Usage:**
```bash
synclaude setup
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

### `synclaude doctor`

**Description:** Check system health and configuration.

**Usage:**
```bash
synclaude doctor
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

### `synclaude update`

**Description:** Update Claude Code to the latest version.

**Usage:**
```bash
synclaude update [options]
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--force` | `-f` | Force update even if already up to date |

**Behavior:**
1. Checks for synclaude updates from GitHub
2. Updates synclaude if available (via installer script)
3. Checks for Claude Code updates from npm
4. Updates Claude Code if available (via npm or installer)

**Examples:**
```bash
# Normal update
synclaude update

# Force update
synclaude update --force
```

### `synclaude check-update`

**Description:** Check if there are Claude Code updates available.

**Usage:**
```bash
synclaude check-update
```

**Output Format:**
```
Checking for Claude Code updates...
Current version: 2.0.76
Latest version: 2.1.0

✓ Update available!
Run "synclaude update" to update Claude Code
```

### `synclaude dangerously`

**Description:** Launch Claude Code with `--dangerously-skip-permissions` using last used models.

**Aliases:** `dangerous`, `dang`, `danger`

**Usage:**
```bash
synclaude dangerously [options]
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
synclaude dangerously

# Force model selection
synclaude dangerously --force
```

### `synclaude install`

**Description:** Install synclaude from local directory to system-wide.

**Usage:**
```bash
synclaude install [options]
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
synclaude install

# Verbose installation
synclaude install --verbose

# Force reinstall
synclaude install --force --verbose
```

---

## Cache Commands

### `synclaude cache clear`

**Description:** Clear model cache.

**Usage:**
```bash
synclaude cache clear
```

**Behavior:**
- Deletes `~/.config/synclaude/models_cache.json`
- Next model fetch will refresh from API

### `synclaude cache info`

**Description:** Show cache information.

**Usage:**
```bash
synclaude cache info
```

**Output Format:**
```
Cache Information:
==================
Status: Valid  (or Expired)
File: /home/user/.config/synclaude/models_cache.json
Size: 45678 bytes
Models: 42
Modified: 2024-12-31T12:34:56.789Z
```

### `synclaude cache`

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
synclaude setup

# Select and use a model
synclaude model

# Use a specific model with thinking model
synclaude --model anthropic:claude-3-5-sonnet-20241022 --thinking-model deepseek:deepseek-r1

# Check system health
synclaude doctor

# Update everything
synclaude update

# Check for updates only
synclaude check-update

# Search for a model
synclaude search sonnet

# Clear cache and refresh models
synclaude cache clear
synclaude models --refresh
```
