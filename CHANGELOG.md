# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
