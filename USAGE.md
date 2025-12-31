# Synclaude Usage Guide

Complete reference for using Synclaude with Claude Code and Synthetic AI models.

## Table of Contents

- [Quick Start](#quick-start)
- [Model Selection](#model-selection)
- [Model Management](#model-management)
- [Configuration](#configuration)
- [System Tools](#system-tools)
- [Advanced Usage](#advanced-usage)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### First-Time Setup

After installation, run the setup wizard:

```bash
synpick setup
```

The setup wizard will guide you through:
1. Configuring your Synthetic API key
2. Testing your API connection
3. Selecting your first model

### Launch Claude Code

```bash
# Interactive model selection (uses saved model if available)
synpick

# Or explicitly:
synpick launch
```

---

## Model Selection

### Interactive Selection

```bash
synpick model
```

This opens a rich terminal UI to browse and select models:
- Use **↑/↓** to navigate
- **Search** by typing provider or model name (e.g., "gpt", "claude", "openai")
- **Enter** to select
- **Esc** to cancel

### Specific Model Selection

```bash
# Launch with a specific model
synpick --model "openai:gpt-4"

# Or:
synpick -m "claude:claude-3-5-sonnet-20241022"

# Use the saved/default model
synpick
```

### Model Categories

Models are organized by provider:

| Provider | Examples | Use Case |
|----------|----------|----------|
| OpenAI | `gpt-4`, `gpt-4o`, `gpt-3.5-turbo` | General-purpose, coding |
| Anthropic | `claude-3-5-sonnet`, `claude-3-opus` | Long context, nuanced tasks |
| Others | Various | Experimental, specialized |

---

## Model Management

### List All Models

```bash
# List all available models
synpick models

# Display with details (provider, context size, etc.)
synpick models --verbose
```

### Search Models

```bash
# Search by name or keyword
synpick search "gpt"

# Search for specific provider
synpick search "openai"

# Search partial names
synpick search "sonnet"
```

### Refresh Cache

```bash
# Force refresh model list from API
synpick models --refresh

# Or use the cache command
synpick cache refresh
```

---

## Configuration

### Show Configuration

```bash
# Show current configuration
synpick config show

# Filter to specific setting
synpick config show apiKey
```

### Set Configuration

```bash
# Set API key
synpick config set apiKey "your-api-key-here"

# Set cache duration (2-168 hours, default 24)
synpick config set cacheDurationHours 12

# Set default model (uses model ID from "synpick models")
synpick config set selectedModel "openai:gpt-4"
```

### Reset Configuration

```bash
# Reset to defaults
synpick config reset

# Reset specific option
synpick config reset apiKey
```

### Configuration File Location

Configuration is stored in: `~/.config/synpick/config.json`

```json
{
  "apiKey": "your-api-key",
  "baseUrl": "https://api.synthetic.new",
  "modelsApiUrl": "https://api.synthetic.new/openai/v1/models",
  "cacheDurationHours": 24,
  "selectedModel": "openai:gpt-4",
  "firstRunCompleted": true
}
```

---

## System Tools

### Doctor (Diagnostics)

```bash
# Run full diagnostic check
synpick doctor
```

The doctor command checks:
- Node.js and npm versions
- Installation status
- Configuration validity
- API connectivity
- Cache status
- PATH configuration

### Version Information

```bash
# Show installed version
synpick --version

# Short form
synpick -V
```

### Update

```bash
# Update to latest version from GitHub
synpick update
```

The update command:
- Checks GitHub for latest release
- Compares using semver (no downgrades)
- Runs installer if update available
- Only updates from official releases

### Cache Management

```bash
# Clear model cache
synpick cache clear

# Refresh cache from API
synpick cache refresh

# Show cache info (size, age, etc.)
synpick cache info
```

Cache is stored in: `~/.config/synpick/models_cache.json`

---

## Advanced Usage

### Environment Variables

Override configuration with environment variables:

```bash
# Set API key (overrides config)
export SYNTHETIC_API_KEY="your-api-key"

# Custom API base URL
export SYNTHETIC_BASE_URL="https://api.synthetic.new"

# Cache duration (overrides config)
export SYNTHETIC_CACHE_DURATION=12

# Then run synpick
synpick
```

### Silent Mode

```bash
# Launch Claude Code without banner
synpick --quiet

# Or:
synpick -q
```

### Verbose Logging

```bash
# Enable verbose debug output
synpick --verbose

# Or:
synpick -v
```

### Configuration File Format

The configuration file is validated using Zod schemas:

```json
{
  "apiKey": string,              // Required: Your API key
  "baseUrl": string,             // Optional: API base URL (default: https://api.synthetic.new)
  "modelsApiUrl": string,        // Optional: Models endpoint (default: baseUrl + /openai/v1/models)
  "cacheDurationHours": 2-168,   // Optional: Cache duration (default: 24)
  "selectedModel": string,       // Optional: Default model ID
  "firstRunCompleted": boolean   // Internal: Setup wizard complete flag
}
```

---

## Examples

### Common Workflows

#### 1. Fresh Installation

```bash
# Install
git clone https://github.com/jeffersonwarrior/synpick.git
cd synpick
./scripts/install.sh

# Setup
synpick setup

# Launch
synpick
```

#### 2. Quick Model Switch

```bash
# List available models
synpick models

# Search for a specific one
synpick search "gpt-4"

# Launch with it directly
synpick --model "openai:gpt-4"
```

#### 3. Save a Favorite Model

```bash
# Select and save
synpick model

# Now launches use saved model
synpick

# Check what's saved
synpick config show selectedModel
```

#### 4. Debug Connection Issues

```bash
# Run diagnostics
synpick doctor

# Refresh cache
synpick cache refresh

# Test with verbose output
synpick --verbose models
```

#### 5. Update to Latest

```bash
# Check version
synpick --version

# Update
synpick update

# Verify
synpick --version
```

---

## Troubleshooting

### "Command not found" Error

```bash
# Check installation
npm list -g synpick

# Find where npm installed binaries
npm bin -g

# Add to PATH if needed
export PATH="$PATH:$(npm bin -g)"
```

### API Key Issues

```bash
# Reset API key
synpick config set apiKey "your-new-key"

# Or use env var
export SYNTHETIC_API_KEY="your-new-key"
synpick

# Verify with doctor
synpick doctor
```

### stale Models

```bash
# Force refresh
synpick cache clear
synpick models --refresh
```

### Permission Errors

```bash
# On Linux/macOS, fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
./scripts/install.sh
```

### Get Help

```bash
# General help
synpick --help

# Command-specific help
synpick models --help
synpick config --help
synpick cache --help

# Diagnostic info
synpick doctor
```

---

## Additional Resources

- **Installation**: See [README.md](README.md) for installation instructions
- **Development**: See [CLAUDE.md](CLAUDE.md) for development guide
- **Issues**: [GitHub Issues](https://github.com/jeffersonwarrior/synpick/issues)
- **Source**: [GitHub Repository](https://github.com/jeffersonwarrior/synpick)
