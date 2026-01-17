# Synpick

![](https://img.shields.io/npm/v/synpick?style=flat-square)
![](https://img.shields.io/npm/dm/synpick?style=flat-square)
![](https://img.shields.io/node/v/synpick?style=flat-square)
![](https://img.shields.io/github/actions/workflow/status/XenoViraApps/synpick/ci.yml?branch=main&style=flat-square)
![](https://img.shields.io/github/actions/workflow/status/XenoViraApps/synpick/security.yml?branch=main&style=flat-square)
![](https://img.shields.io/badge/CodeQL-passing-brightgreen?style=flat-square)
![](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![](https://img.shields.io/badge/version-1.7.0-blue?style=flat-square)

Interactive model selection tool for Claude Code with Synthetic AI models.

## Overview

synpick is a modern TypeScript/Node.js application that provides a seamless interface for selecting and launching Claude Code with various AI models from the Synthetic API.

## Features

- **Modern TypeScript Stack**: Built with TypeScript, Node.js, and npm
- **Interactive Model Selection**: Rich terminal UI for browsing and selecting models
- **Smart Search**: Search models by name, provider, or capabilities
- **Persistent Configuration**: Save your preferred model choices
- **Easy Installation**: `npm install -g synpick` - available on npm registry
- **System Health**: Built-in diagnostic tools
- **Well Tested**: Comprehensive Jest test suite
- **Beautiful UI**: Modern React-based terminal interface with Ink
- **System Prompt Support**: Custom system prompts for Claude Code with live editing
- **Full Configuration Management**: Comprehensive Claude Code config including skills, MCP, and continuous mode
- **Config Sharing**: Save and share configurations via GitHub

## Quick Start

### Prerequisites

- Node.js 18+ and npm installed
- Synthetic API key (get one from [synthetic.new](https://synthetic.new))
- Claude Code installed (get from [claude.com/product/claude-code](https://claude.com/product/claude-code))

**Note**: The installer script will automatically configure nvm to use Node.js v24.12.0 if available.

### Installation

#### Option 1: npm Registry (Recommended)

**Linux/Windows/macOS:**
```bash
npm install -g synpick
```

**macOS (if permissions error):**
```bash
sudo npm install -g synpick
```

**Alternative for macOS (permanent fix):**
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
npm install -g synpick
```

#### Option 2: GitHub Release

```bash
npm install -g https://github.com/XenoViraApps/synpick/releases/download/v1.7.0/synpick-1.7.0.tgz
```

#### Option 3: One-line Installer

```bash
curl -sSL https://raw.githubusercontent.com/XenoViraApps/synpick/main/scripts/install.sh | bash
```

#### Option 4: Clone and Install

```bash
git clone https://github.com/XenoViraApps/synpick.git
cd synpick
./scripts/install.sh
```

**Important**:
- npm registry is the recommended installation method
- GitHub releases and install scripts are available as alternatives
- The installer script automatically configures nvm for Node.js v24.12.0 if available

### Uninstallation

#### Option 1: One-line Uninstaller

```bash
curl -sSL https://raw.githubusercontent.com/XenoViraApps/synpick/main/scripts/uninstall.sh | bash
```

#### Option 2: Manual Uninstall

```bash
# If installed globally via npm
npm uninstall -g synpick

# If installed locally via npm link
npm unlink -g synpick

# Remove configuration and cache
rm -rf ~/.config/synpick
```

### Initial Setup

After installation, run the setup wizard:

```bash
synpick setup
```

This will guide you through:
1. Configuring your Synthetic API key
2. Testing your connection
3. Selecting your first model

### Basic Usage

After setup, you can start using Synpick:

```bash
# Launch with interactive model selection
synpick

# Launch with a specific model
synpick --model "openai:gpt-4"

# Browse and save a default model
synpick model

# Check system health
synpick doctor
```

**See [USAGE.md](USAGE.md) for comprehensive usage documentation.**

---

## Advanced Usage

### Configuration Options

Synpick stores configuration in `~/.config/synpick/config.json`. Key options include:

- `apiKey`: Your Synthetic API key
- `baseUrl`: Synthetic API base URL
- `modelsApiUrl`: Models endpoint URL
- `cacheDurationHours`: Model cache duration (1-168 hours, default 24)
- `selectedModel`: Last selected model
- `selectedThinkingModel`: Last selected thinking model
- `firstRunCompleted`: Whether first-time setup has been completed
- `maxTokenSize`: Max token size for Claude Code (1000-200000, default 128000)
- `apiTimeoutMs`: HTTP API request timeout in ms (1000-300000, default 30000)
- `commandTimeoutMs`: Command execution timeout in ms (1000-60000, default 5000)

### Updates

Synpick provides multiple ways to update:

#### Update via npm (Recommended)

```bash
# Update to the latest version
npm update -g synpick
```

#### Automatic Update Command

```bash
# Check for and install updates from GitHub
synpick update
```

The update command:
- Checks GitHub repository for the latest release
- Compares versions using semver (won't downgrade)
- Runs the installer if a newer version is available

#### Manual Update

```bash
# Install specific version from npm
npm install -g synpick@1.7.0

# Or from GitHub release
npm install -g https://github.com/XenoViraApps/synpick/releases/download/v1.7.0/synpick-1.7.0.tgz
```

#### Check Current Version

```bash
synpick --version
```

### Environment Variables

You can override configuration with environment variables:

```bash
export SYNTHETIC_API_KEY="your-api-key"
export SYNTHETIC_BASE_URL="https://api.synthetic.new"
export SYNTHETIC_CACHE_DURATION=24
```

### Development

#### Setup Development Environment

```bash
git clone https://github.com/XenoViraApps/synpick.git
cd synpick
npm install
```

#### Development Commands

```bash
# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Full development cycle
npm run lint && npm test && npm run build
```

#### Project Structure

```
synpick/
├── src/
│   ├── cli/           # CLI commands and parsing (Commander.js)
│   ├── core/          # Application orchestration
│   ├── config/        # Configuration management (Zod)
│   ├── models/        # Data models and API interfaces
│   ├── ui/            # Terminal UI components (Ink)
│   ├── launcher/      # Claude Code launcher
│   ├── api/           # HTTP client (axios)
│   └── utils/         # Shared utilities
├── tests/             # Jest tests
├── scripts/           # Installation and utility scripts
```

## API Integration

### Synthetic API Endpoints

- **Models API**: `https://api.synthetic.new/openai/v1/models`
- **Anthropic API**: `https://api.synthetic.new/anthropic`

### Environment Variables for Claude Code

When launching Claude Code, Synpick automatically sets:

- `ANTHROPIC_BASE_URL=https://api.synthetic.new/anthropic`
- `ANTHROPIC_AUTH_TOKEN={your_api_key}`
- `ANTHROPIC_DEFAULT_*_MODEL` variants
- `CLAUDE_CODE_SUBAGENT_MODEL={selected_model}`

## Advanced Features

### System Prompt Management

Customize Claude Code's behavior with custom system prompts:

```bash
# Set a new system prompt
synpick sysprompt set "You are a helpful coding assistant..."

# Show current system prompt
synpick sysprompt show

# Clear system prompt
synpick sysprompt clear

# Live edit in your default editor
synpick sysprompt
synpick sysprompt --editor vim
```

### Full Configuration Management

Comprehensive configuration for Claude Code including skills, MCP servers, and settings:

```bash
# Initialize a new config file
synpick full-config init my-config.yaml

# Validate an existing config
synpick full-config validate my-config.yaml

# Apply configuration (dry-run first)
synpick full-config apply my-config.yaml --dry-run

# Apply configuration for real
synpick full-config apply my-config.yaml --confirm

# Fetch config from GitHub
synpick full-config https://github.com/owner/repo/raw/main/config.yaml

# List saved configurations
synpick full-config list-saved
```

#### Config Share

Capture your current Claude Code configuration and save it for sharing:

```bash
# Save locally only
synpick save-config my-config.yaml

# Save to GitHub (format: owner/repo/path)
synpick save-config XenoViraApps/myrepo/configs/synpick-config.yaml

# With custom name and description
synpick save-config my-config.yaml --name "Dev Config" --description "My development environment setup"

# Local-only with custom output path
synpick save-config --local-only --output ~/.config/synpick/backups/config-$(date +%Y%m%d).yaml
```

For complete YAML configuration format reference, see the [synpick-config schema](src/full-config/schema.ts).

## Troubleshooting

### Recent Fixes (v1.7.0)

This version includes:
- **System prompt support**: New `synpick sysprompt` command for custom system prompts
- **Full configuration management**: `synpick full-config` for comprehensive Claude Code setup
- **Config sharing**: `synpick save-config` to capture and share configurations
- **Fresh Mac installation fix**: Auto-installs Homebrew and Node.js on macOS
- **Model prefix normalization**: Auto-adds `hf:` prefix for HuggingFace models
- **Full-install command**: Skills, MCP servers, continuous mode, and settings management

### Recent Fixes (v1.6.1)

This version includes:
- ESM (ES Modules) compatibility - fixed `__dirname is not defined` and `require()` errors
- Now available on npm registry: `npm install -g synpick`
- Installer script now configures nvm for Node.js v24.12.0 automatically
- All 227 tests passing across 12 test suites
- Multiple installation options (npm, GitHub, install scripts)

### Common Issues

#### Node.js Version Issues

```bash
# Check your Node.js version
node --version

# Upgrade to Node.js 18+ if needed
nvm install 18
nvm use 18
```

#### PATH Issues

If `synpick` command is not found after installation:

```bash
# Check if local bin directory is in PATH
echo $PATH | grep -o "$HOME/.local/bin"

# Add to PATH (add to your .bashrc, .zshrc, etc.)
export PATH="$PATH:$HOME/.local/bin"
```

#### Permission Issues

```bash
# Fix npm global permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

#### API Connection Issues

```bash
# Test API connection
synpick doctor

# Clear cache and retry
synpick cache clear
synpick models --refresh
```

### Get Help

```bash
# Show all commands
synpick --help

# Get help for specific command
synpick models --help
synpick config --help

# Check system health
synpick doctor
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests and linting: `npm test && npm run lint`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Write tests for new functionality
- Update documentation for API changes
- Ensure compatibility with Node.js 18+

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Discord**: [Join our Discord](https://discord.gg/UETtdzH8Wu)
- **Usage Guide**: [USAGE.md](USAGE.md) - Comprehensive command reference
- **Issues**: [GitHub Issues](https://github.com/XenoViraApps/synpick/issues)
- **Discussions**: [GitHub Discussions](https://github.com/XenoViraApps/synpick/discussions)
- **Synthetic API**: [https://dev.synthetic.new](https://dev.synthetic.new)
