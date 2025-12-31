# Synpick

Interactive model selection tool for Claude Code with Synthetic AI models.

## Overview

synpick is a modern TypeScript/Node.js application that provides a seamless interface for selecting and launching Claude Code with various AI models from the Synthetic API.

## Features

- **Modern TypeScript Stack**: Built with TypeScript, Node.js, and npm
- **Interactive Model Selection**: Rich terminal UI for browsing and selecting models
- **Smart Search**: Search models by name, provider, or capabilities
- **Persistent Configuration**: Save your preferred model choices
- **Easy Installation**: One-line installer with npm support
- **System Health**: Built-in diagnostic tools
- **Well Tested**: Comprehensive Jest test suite
- **Beautiful UI**: Modern React-based terminal interface with Ink

## Quick Start

### Prerequisites

- Node.js 18+ and npm installed
- Synthetic API key (get one from [synthetic.new](https://synthetic.new))
- Claude Code installed (get from [claude.com/product/claude-code](https://claude.com/product/claude-code))

**Note**: The installer script will automatically configure nvm to use Node.js v24.12.0 if available.

### Installation

#### Option 1: GitHub Release (Recommended)

**Linux/Windows:**
```bash
npm install -g https://github.com/jeffersonwarrior/synpick/releases/download/v1.6.1/synpick-1.6.1.tgz
```

**macOS (if permissions error):**
```bash
sudo npm install -g https://github.com/jeffersonwarrior/synpick/releases/download/v1.6.1/synpick-1.6.1.tgz
```

**Alternative for macOS (permanent fix):**
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
npm install -g https://github.com/jeffersonwarrior/synpick/releases/download/v1.6.1/synpick-1.6.1.tgz
```

#### Option 2: One-line Installer

```bash
curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synpick/main/scripts/install.sh | bash
```

#### Option 3: macOS One-line Script

```bash
curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synpick/main/scripts/install-macos.sh | bash
```

#### Option 4: Clone and Install

```bash
git clone https://github.com/jeffersonwarrior/synpick.git
cd synpick
./scripts/install.sh
```

You can also use the macOS-specific installer:
```bash
git clone https://github.com/jeffersonwarrior/synpick.git
cd synpick
./scripts/install-macos.sh
```

**Important**:
- Direct git installation via npm is not supported due to npm's git installation limitations
- Use the specific release tarball from GitHub Releases
- GitHub-only installation (npm registry fallback removed)
- Installer tries version-specific release first, then falls back to main branch

### Uninstallation

#### Option 1: One-line Uninstaller

```bash
curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synpick/main/scripts/uninstall.sh | bash
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

#### Automatic Update Command

```bash
# Check for and install updates from GitHub
synpick update
```

The update command:
- Checks GitHub repository for the latest release
- Compares versions using semver (won't downgrade)
- Runs the installer if a newer version is available
- Only updates from official GitHub releases

#### Manual Update via GitHub

```bash
# Install specific version from GitHub release
npm install -g https://github.com/jeffersonwarrior/synpick/releases/download/v1.6.1/synpick-1.6.1.tgz

# Or run the installer again
curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synpick/main/scripts/install.sh | bash
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
git clone https://github.com/jeffersonwarrior/synpick.git
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

## Troubleshooting

### Recent Fixes (v1.6.1)

This version includes:
- ESM (ES Modules) compatibility - fixed `__dirname is not defined` and `require()` errors
- Installer script now configures nvm for Node.js v24.12.0 automatically
- All 227 tests passing across 12 test suites
- GitHub-only installation (npm registry fallback removed)

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

- **Usage Guide**: [USAGE.md](USAGE.md) - Comprehensive command reference
- **Issues**: [GitHub Issues](https://github.com/jeffersonwarrior/synpick/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jeffersonwarrior/synpick/discussions)
- **Synthetic API**: [https://dev.synthetic.new](https://dev.synthetic.new)
