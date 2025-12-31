# Synclaude Codebase Documentation

This directory contains comprehensive documentation of the Synclaude codebase architecture, patterns, and implementation details.

## Project Overview

**Synclaude** is a TypeScript/Node.js interactive CLI tool that integrates Synthetic AI models with Claude Code. It provides:

- Model selection from the Synthetic API
- Configuration management with Zod validation
- Seamless launching of Claude Code with various language models
- Interactive terminal UI using React/Ink
- Automatic model caching with configurable duration
- Dual model support (regular + thinking models)

## Documentation Structure

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | High-level architecture and design patterns |
| [api-reference.md](./api-reference.md) | Complete API reference for all modules |
| [data-flow.md](./data-flow.md) | Key data flows and workflows |
| [configuration.md](./configuration.md) | Configuration system details |
| [cli-commands.md](./cli-commands.md) | All CLI commands and options |
| [models-system.md](./models-system.md) | Model management and caching |
| [ui-components.md](./ui-components.md) | React/Ink UI components |
| [error-handling.md](./error-handling.md) | Error handling patterns |
| [testing-guide.md](./testing-guide.md) | Testing strategy and patterns |
| [audit-report.md](./audit-report.md) | Code audit findings and recommendations |

## Technology Stack

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | ^1.8.2 | HTTP client for API calls |
| `chalk` | ^5.3.0 | Terminal colors and styling |
| `commander` | ^14.0.2 | CLI framework |
| `ink` | ^6.6.0 | React-based terminal UI |
| `react` | ^19.0.0 | UI component library |
| `zod` | ^4.3.3 | Runtime data validation |

### Development Dependencies

- `typescript` ^5.7.3 - Type checking and compilation
- `jest` ^30.2.0 - Testing framework
- `eslint` ^9.18.0 - Linting
- `prettier` ^3.7.4 - Code formatting

## Module Overview

```
src/
├── cli/           # Commander.js-based CLI layer
├── core/          # Main application orchestrator
├── config/        # Zod-based configuration management
├── models/        # Model data and API interfaces
├── ui/            # React/Ink terminal UI components
├── launcher/      # Claude Code process launcher
├── api/           # Axios-based HTTP client
├── claude/        # Claude Code update manager
├── install/       # Installation utilities
└── utils/         # Shared utilities
```

## Key Design Patterns

1. **Layered Architecture**: CLI -> Core -> (Config/Models/UI) -> (API/Process)
2. **Dependency Injection**: Components receive dependencies via constructor
3. **Singleton Pattern**: ConfigManager cached, global Logger
4. **React for Terminal**: Ink components for interactive UI
5. **Zod Validation**: Runtime validation for all external data
