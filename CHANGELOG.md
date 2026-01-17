# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2026-01-16

### Added
- **System Prompt Support**: New `synpick sysprompt` command with subcommands:
  - `set` - Set a custom system prompt
  - `show` - Display the current system prompt
  - `clear` - Remove the custom system prompt
  - Default behavior opens editor for live editing (`synpick sysprompt`)
- **Full Configuration Management**: Added `synpick full-config` command group:
  - `init` - Initialize new config file with templates
  - `validate` - Validate config files against schema
  - `save` - Save configuration files to `~/.synpick/configs/`
  - `list-saved` - List locally saved configurations
- **Full Install Command**: Added `synpick full-install` command:
  - Install full configuration from local file or GitHub repository
  - Options: `--github <owner/repo>`, `--branch`, `--path`, `--yes` (auto-confirm), `--dry-run`
  - Supports skills installation, MCP server setup, and Claude settings
- **Config Sharing**: Added `synpick save-config` command:
  - Capture current Claude Code and SynPick configuration
  - Save to local file or push to GitHub (format: `owner/repo/path`)
  - Options: `--local-only`, `--name`, `--description`, `--output`, `--branch`
  - Config capture includes: Claude channel, MCP servers, skills, settings, synpick settings
- **Config Schema**: Added `src/full-config/schema.ts` with Zod validation for YAML config format
  - Supports Claude Code version/channel configuration
  - MCP server configurations (npm, go, python, builtin, command)
  - Skills management with URL/file support
  - Claude settings (theme, telemetry, auto-update, history size)
  - SynPick settings (model, API key, system prompt)
- **Config Parser**: Added `src/full-config/parser.ts` with:
  - GitHub URL fetching for config files
  - Local file parsing with YAML support
  - Error handling with clear validation messages
- **Config Installer**: Added `src/full-config/installer.ts` with:
  - Dry run mode for testing without making changes
  - Interactive confirmation before applying changes
  - Skills cloning from git repositories
  - MCP server installation (npm packages, go/python packages, custom commands)
  - Settings application to Claude Code config
  - Progress reporting with step-by-step feedback
- **Config Capturer**: Added `src/full-config/capturer.ts` with:
  - Capture current Claude Code configuration from `~/.anthropic/`
  - Capture SynPick configuration from `~/.synpick/`
  - Detect Claude Code channel (stable/beta/canary)
  - Discover installed MCP servers
  - List installed skills with git URLs
  - Export to YAML format
- **E2E Tests**: Added `tests/e2e-new-commands.test.ts` for testing v1.7.0 commands

### Fixed
- **Fresh Mac Installation**: Fixed install script to auto-install Homebrew and Node.js on macOS
  - Added Homebrew detection and installation for macOS
  - Added Node.js via Homebrew installation with version management
  - Added node, typescript, tsc auto-installation on first run
  - Fixed multiple TypeScript errors that were blocking fresh installs
- **Model Prefix Normalization**: Fixed HuggingFace models causing 400 errors due to missing `hf:` prefix
  - Added automatic prefix normalization for known model providers
  - Supports: `hf:`, `openai:`, `anthropic:`, `claude:`, `google:`, `meta:`
  - Prevents API errors when switching models or using skills
- **Test Suite**: Fixed test failures due to model prefix normalization
  - Updated all model ID assertions to include `hf:` prefix
  - Cleaned up environment variable handling in tests
  - All 241 tests passing

### Changed
- **Version**: Bumped to v1.7.0
- **Config Schema**: Extended with `systemPrompt` field for custom prompts
- **Launcher**: Added system prompt injection into Claude Code environment
- **README**: Updated with v1.7.0 features and documentation

### Dependency Updates
- Added `yaml` package for YAML parsing (replaced js-yaml)

### Testing
- All 13 test suites passing
- 241 total tests passing

## [1.6.3] - 2026-01-01

### Added
- Added GitHub Actions CI/CD pipeline with automated build, test, and release workflow
- Added CodeQL security analysis (v4) for vulnerability detection
- Added badges to README (npm version, license)

### Fixed
- Fixed global update command to use `npm update -g` instead of custom update logic
- Removed all remaining "SynClaude" branding, now consistently uses "SynPick/Bundling"
- Normalized path separators to forward slashes for Windows compatibility
- Removed Python from CodeQL analysis (now only analyzes JavaScript)

### Changed
- Removed Node 18 from CI/CD build matrix (now tests on Node 20 and 22 only)
- Updated CodeQL to version 4 for improved security scanning

## [1.6.2] - 2026-01-01

### Added
- GitHub Actions CI/CD pipeline for automated releases
- Automated npm package publishing workflow

### Changed
- Renamed package from synclaude to synpick
- Fixed branding - renamed all "SynClaude" references to "SynPick"

## [1.6.1] - 2025-12-31

### Added
- Added comprehensive `USAGE.md` documentation with quick start guide, model selection, configuration, system tools, and troubleshooting
- Added centralized version management via `version.txt` (CLI and install script now read from this single source of truth)
- Added `isThinkingModel()` utility function to shared `src/utils/model-utils.ts`
- Added `nvm use --delete-prefix v24.12.0 --silent` to end of install script for consistent Node.js version
- Added `tests/installer-script.test.ts` for installer script validation
- Added `tests/cli-subcommands.test.ts` for comprehensive CLI subcommand testing

### Fixed
- Fixed `ReferenceError: __dirname is not defined` in ESM environment (`src/utils/banner.ts`)
- Fixed all `require()` calls for ESM compatibility:
  - `src/models/info.ts`: Replaced `require('./types')` with direct import
  - `src/models/cache.ts`: Replaced `require('path')` with `import { dirname }`
  - `src/ui/user-interface.tsx`: Replaced `require('readline')` with `import { createInterface }`
  - `src/core/app.ts`: Replaced `require('../config')` with `import { AppConfigSchema }`
- Fixed install.sh hardcoded paths - now uses shell variables instead of fixed `/home/agent/` paths
- Fixed install.sh fish shell syntax handling in PATH entries
- Fixed install.sh variable name collision in cleanup function
- Fixed Jest configuration for ESM compatibility (renamed `jest.config.js` to `jest.config.cjs`)
- Fixed Jest timeout handler issues with `forceExit` configuration
- Fixed syntax error in `scripts/build.sh` (removed extra quote)
- Fixed mixed `require()` usage in `src/config/manager.ts` for ESM compatibility
- Fixed duplicate `PathUpdateResult` interface in `src/install/install.ts`
- Removed real `setTimeout` calls from test files to prevent timer leaks

### Changed
- Removed npm registry fallback from installer script - now only uses GitHub sources
- Updated installer to fallback to main branch if version-specific tarball fails
- Removed dual ESLint configuration (kept modern `eslint.config.js`, removed legacy `.eslintrc.js`)
- Added `USAGE.md` and `version.txt` to npm package files array
- Updated README.md with fork note documenting this is a fork of jeffersonwarrior/synclaude
- Updated CLAUDE.md with fork note for CI/CD context
- Removed npm registry references from README.md update instructions

## [1.6.0] - 2025-12-31

### Added
- Added `info()` function to install script for always-visible progress messages
- Added explicit progress indicators for dependency installation steps
- Added better error handling and tolerance for cleanup operations
- Added `compareVersions()` function for proper semver comparison
- Added `getLatestGitHubVersion()` to check GitHub releases directly
- Added update command protection against downgrading to older versions

### Changed
- Update command now checks GitHub repository instead of npm registry
- Update command only proceeds if newer version is available
- Updated tarball URL in install script to use direct codeload URL (fixes download issues)
- Updated all production dependencies to latest versions:
  - `axios`: 1.12.2 → 1.13.2
  - `commander`: 11.1.0 → 14.0.2
  - `zod`: 3.25.76 → 4.2.1
- Updated all development dependencies to latest versions:
  - `@types/jest`: 29.5.14 → 30.0.0
  - `@types/node`: 20.19.23 → 25.0.3
  - `@typescript-eslint/*`: 6.21.0 → 8.51.0
  - `eslint`: 8.57.1 → 9.39.2
  - `eslint-config-prettier`: 9.1.2 → 10.1.8
  - `jest`: 29.7.0 → 30.2.0
  - `prettier`: 3.6.2 → 3.7.4
  - `react-devtools-core`: 6.1.5 → 4.28.5 (for ink 3 compatibility)
  - `ts-jest`: 29.4.5 → 29.4.6

### Fixed
- Fixed install script hanging when run without `-v` (verbose) flag
- Fixed `npm bin -g` deprecation warnings by using `npm prefix -g` instead
- Fixed js-yaml security vulnerability via npm audit fix
- Fixed install script cleanup function causing premature exit with `set -e`
- Fixed verification step to warn instead of exit on help command failure
- Fixed update command downgrading to older versions (now checks GitHub releases)

### Security
- Resolved moderate security vulnerability in `js-yaml` (CVE GHSA-mh29-5h37-fv8m)

## [1.5.0] - 2024-XX-XX

### Added
- Claude Code management integration
- Enhanced installer with multiple installation methods
- Comprehensive configuration validation

### Changed
- Migrated to TypeScript for entire codebase
- Improved error handling and user feedback

### Fixed
- Various installation and configuration issues

## [1.3.2] - 2024-XX-XX

### Added
- Initial release
- Core model selection functionality
- Basic configuration management
