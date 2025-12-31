# Synclaude

Interactive model selection tool for Claude Code with Synthetic AI models.

## Overview

synclaude is a modern TypeScript/Node.js application that provides a seamless interface for selecting and launching Claude Code with various AI models from the Synthetic API.

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

### Installation

#### Option 1: GitHub Release (Recommended)

**Linux/Windows:**
```bash
npm install -g https://github.com/jeffersonwarrior/synclaude/releases/download/v1.6.0/synclaude-1.6.0.tgz
```

**macOS (if permissions error):**
```bash
sudo npm install -g https://github.com/jeffersonwarrior/synclaude/releases/download/v1.6.0/synclaude-1.6.0.tgz
```

**Alternative for macOS (permanent fix):**
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
npm install -g https://github.com/jeffersonwarrior/synclaude/releases/download/v1.6.0/synclaude-1.6.0.tgz
```

#### Option 2: Download from GitHub Releases

1. Visit [GitHub Releases](https://github.com/jeffersonwarrior/synclaude/releases)
2. Download the latest `synclaude-X.Y.Z.tgz` file
3. Install with: `npm install -g synclaude-X.Y.Z.tgz`

#### Option 3: One-line Installer

```bash
curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synclaude/main/scripts/install.sh | bash
```

#### Option 4: macOS One-line Script

```bash
curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synclaude/main/scripts/install-macos.sh | bash
```

#### Option 5: Clone and Install

```bash
git clone https://github.com/jeffersonwarrior/synclaude.git
cd synclaude
./scripts/install.sh
```

You can also use the macOS-specific installer:
```bash
git clone https://github.com/jeffersonwarrior/synclaude.git
cd synclaude
./scripts/install-macos.sh
```

**Important**:
- Direct git installation (`npm install -g https://github.com/.../synclaude.git`) is not supported due to npm's git installation limitations
- Use the specific release tarball: `https://github.com/jeffersonwarrior/synclaude/releases/download/v1.6.0/synclaude-1.6.0.tgz`
- Or visit [GitHub Releases](https://github.com/jeffersonwarrior/synclaude/releases) for the latest version

### Uninstallation

#### Option 1: One-line Uninstaller

```bash
curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synclaude/main/scripts/uninstall.sh | bash
```

#### Option 2: Manual Uninstall

```bash
# If installed globally via npm
npm uninstall -g synclaude

# If installed locally via npm link
npm unlink -g synclaude

# Remove configuration and cache
rm -rf ~/.config/synclaude
```

### Initial Setup

After installation, run the setup wizard:

```bash
synclaude setup
```

This will guide you through:
1. Configuring your Synthetic API key
2. Testing your connection
3. Selecting your first model

### Basic Usage

After setup, you can start using Synclaude:

```bash
# Launch with interactive model selection
synclaude

# Launch with a specific model
synclaude --model "openai:gpt-4"

# Browse and save a default model
synclaude model

# Check system health
synclaude doctor
```

**See [USAGE.md](USAGE.md) for comprehensive usage documentation.**

---

## Advanced Usage

### Configuration Options

Synclaude stores configuration in `~/.config/synclaude/config.json`. Key options include:

- `apiKey`: Your Synthetic API key
- `baseUrl`: Synthetic API base URL
- `modelsApiUrl`: Models endpoint URL
- `cacheDurationHours`: Model cache duration (1-168 hours)
- `selectedModel`: Last selected model
- `firstRunCompleted`: Whether first-time setup has been completed

### Updates

Synclaude provides multiple ways to update:

#### Automatic Update Command

```bash
# Check for and install updates from GitHub
synclaude update
```

The update command:
- Checks your GitHub repository for the latest release
- Compares versions using semver (won't downgrade)
- Runs the installer if a newer version is available
- Only updates from official GitHub releases

#### Manual Update via npm

```bash
# Update to latest version from npm registry
npm update -g synclaude

# Install specific version
npm install -g synclaude@1.6.0

# Or reinstall from GitHub release
npm install -g https://github.com/jeffersonwarrior/synclaude/releases/download/v1.6.0/synclaude-1.6.0.tgz
```

#### Check Current Version

```bash
synclaude --version
```

This approach provides:
- **Full control** over when updates happen
- **Standard npm workflow** that developers are familiar with
- **No update-related bugs or complexity**
- **Rollback capability** if needed (`npm install -g synclaude@specific-version`)

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
git clone https://github.com/jeffersonwarrior/synclaude.git
cd synclaude
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
synclaude/
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

## API Integration

### Synthetic API Endpoints

- **Models API**: `https://api.synthetic.new/openai/v1/models`
- **Anthropic API**: `https://api.synthetic.new/anthropic`

### Environment Variables for Claude Code

When launching Claude Code, Synclaude automatically sets:

- `ANTHROPIC_BASE_URL=https://api.synthetic.new/anthropic`
- `ANTHROPIC_AUTH_TOKEN={your_api_key}`
- `ANTHROPIC_DEFAULT_*_MODEL` variants
- `CLAUDE_CODE_SUBAGENT_MODEL={selected_model}`

## Troubleshooting

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

If `synclaude` command is not found after installation:

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
synclaude doctor

# Clear cache and retry
synclaude cache clear
synclaude models --refresh
```

### Get Help

```bash
# Show all commands
synclaude --help

# Get help for specific command
synclaude models --help
synclaude config --help

# Check system health
synclaude doctor
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
- **Issues**: [GitHub Issues](https://github.com/jeffersonwarrior/synclaude/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jeffersonwarrior/synclaude/discussions)
- **Synthetic API**: [https://dev.synthetic.new](https://dev.synthetic.new)
