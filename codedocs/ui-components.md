# UI Components

## Table of Contents

- [Overview](#overview)
- [UserInterface Class](#userinterface-class)
- [ModelSelector Component](#modelselector-component)
- [Supporting Components](#supporting-components)
- [Thinking Model Display](#thinking-model-display)
- [Input Handling](#input-handling)

---

## Overview

The UI system uses **Ink** (React for CLI) to create an interactive terminal interface. The system provides:

- Color-coded console output
- Interactive model selection with keyboard navigation
- Real-time search filtering
- Dual model selection (regular + thinking)
- Progress display
- Status messages

### Architecture

```
┌─────────────────────────────────────────────┐
│            UserInterface Class              │
│  ┌───────────────────────────────────────┐  │
│  │  Console Output Methods               │  │
│  │  - info, success, warning, error      │  │
│  │  - coloredSuccess, coloredInfo        │  │
│  │  - highlightInfo                      │  │
│  │  - debug                              │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  Model Display                        │  │
│  │  - showModelList()                    │  │
│  │  - selectModel()                      │  │
│  │  - selectDualModels()                 │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  User Input                           │  │
│  │  - askQuestion()                      │  │
│  │  - askPassword()                      │  │
│  │  - confirm()                          │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  Status & Progress                   │  │
│  │  - showProgress()                     │  │
│  │  - showStatus()                       │  │
│  │  - clear()                            │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
              │ uses
              ▼
┌─────────────────────────────────────────────┐
│         Ink React Components                │
│  ┌───────────────────────────────────────┐  │
│  │  ModelSelector                        │  │
│  │  - Search filtering                   │  │
│  │  - Keyboard navigation                │  │
│  │  - Dual selection                     │  │
│  │  - Scrolling                          │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  ModelList                            │  │
│  │  - Static list display                │  │
│  │  - Metadata formatting                │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  ProgressBar                          │  │
│  │  - ASCII progress bar                 │  │
│  │  - Percentage/counter display         │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  StatusMessage                        │  │
│  │  - Colored status indicators          │  │
│  │  - Icon+message format                │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## UserInterface Class

### Class Definition

**Location:** `src/ui/user-interface.tsx:30`

```typescript
export interface UIOptions {
  verbose?: boolean;
  quiet?: boolean;
}

export class UserInterface {
  constructor(options: UIOptions = {});

  // Console output
  info(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;
  coloredSuccess(message: string, ...args: any[]): void;
  coloredInfo(message: string, ...args: any[]): void;
  highlightInfo(message: string, highlights: string[]): void;
  warning(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;

  // Model display
  showModelList(models: ModelInfoImpl[], selectedIndex?: number): void;
  async selectModel(models: ModelInfoImpl[]): Promise<ModelInfoImpl | null>;
  async selectDualModels(models: ModelInfoImpl[]): Promise<{
    regular: ModelInfoImpl | null;
    thinking: ModelInfoImpl | null;
  }>;

  // Progress/Status
  showProgress(current: number, total: number, label?: string): void;
  showStatus(type: 'info' | 'success' | 'warning' | 'error', message: string): void;

  // User input
  async askQuestion(question: string, defaultValue?: string): Promise<string>;
  async askPassword(question: string): Promise<string>;
  async confirm(message: string, defaultValue?: boolean): Promise<boolean>;

  // Terminal control
  clear(): void;
}
```

### Constructor

```typescript
constructor(options: UIOptions = {})
```

**Parameters:**
- `verbose?: boolean` - Enable debug output (default: false)
- `quiet?: boolean` - Suppress non-error output (default: false)

### Console Output Methods

#### `info()`

```typescript
info(message: string, ...args: any[]): void
```

Prints info message with ℹ prefix.

**Respects:** quiet mode

**Example:**
```typescript
ui.info('Configuration loaded');
// ℹ Configuration loaded
```

#### `success()`

```typescript
success(message: string, ...args: any[]): void
```

Prints success message with ✓ prefix.

**Respects:** quiet mode

**Example:**
```typescript
ui.success('Setup completed');
// ✓ Setup completed
```

#### `coloredSuccess()`

```typescript
coloredSuccess(message: string, ...args: any[]): void
```

Prints success message with green color and ✓ prefix.

**Used for:** Important success notifications

**Example:**
```typescript
ui.coloredSuccess('API key saved');
// ✓ API key saved  (green)
```

#### `coloredInfo()`

```typescript
coloredInfo(message: string, ...args: any[]): void
```

Prints info message with blue color and ℹ prefix.

**Used for:** Important info notifications

**Example:**
```typescript
ui.coloredInfo('Fetching models...');
// ℹ Fetching models...  (blue)
```

#### `highlightInfo()`

```typescript
highlightInfo(message: string, highlights: string[]): void
```

Prints info with highlighted terms in cyan.

**Parameters:**
- `message: string` - The message to print
- `highlights: string[]` - Terms to highlight in cyan

**Example:**
```typescript
ui.highlightInfo(
  'Run synclaude model to select a model',
  ['synclaude', 'model']
);
// ℹ Run synclaude model to select a model
//         ------ -----  (cyan)
```

#### `warning()`

```typescript
warning(message: string, ...args: any[]): void
```

Prints warning message with ⚠ prefix.

**Respects:** quiet mode

**Example:**
```typescript
ui.warning('Cache may be stale');
// ⚠ Cache may be stale
```

#### `error()`

```typescript
error(message: string, ...args: any[]): void
```

Prints error message with ✗ prefix.

**Note:** Never suppressed (shown even in quiet mode)

**Example:**
```typescript
ui.error('API connection failed');
// ✗ API connection failed
```

#### `debug()`

```typescript
debug(message: string, ...args: any[]): void
```

Prints debug message with 🐛 prefix.

**Respects:** verbose mode only

**Example:**
```typescript
ui.debug('Cache hit, loading from file');
// 🐛 Cache hit, loading from file (verbose only)
```

### Model Display Methods

#### `showModelList()`

```typescript
showModelList(models: ModelInfoImpl[], selectedIndex?: number): void
```

Displays a static list of models with metadata.

**Parameters:**
- `models: ModelInfoImpl[]` - Models to display
- `selectedIndex?: number` - Index to mark as selected (→)

**Output Format:**
```
Available Models:
================
→ 1. anthropic:claude-3-5-sonnet-20241022 🤔 Thinking
     Provider: anthropic
     Context: 200K tokens
     Quantization: none
     ID: anthropic:claude-3-5-sonnet-20241022

  2. openai:gpt-4o-mini-2024-07-18
     Provider: openai
     Context: 128K tokens
     Quantization: int8
     ID: openai:gpt-4o-mini-2024-07-18
```

#### `selectModel()`

```typescript
async selectModel(models: ModelInfoImpl[]): Promise<ModelInfoImpl | null>
```

Displays interactive model selector (single selection).

**Returns:** Selected model or `null` if cancelled

**Keyboard Controls:**
- ↑↓ - Navigate
- Enter - Select and return
- q/Escape - Cancel (return null)

#### `selectDualModels()`

```typescript
async selectDualModels(models: ModelInfoImpl[]): Promise<{
  regular: ModelInfoImpl | null;
  thinking: ModelInfoImpl | null;
}>
```

Displays interactive model selector with dual selection.

**Returns:**
- `regular`: Regular model (Enter key)
- `thinking`: Thinking model (t key)

**Keyboard Controls:**
- ↑↓ - Navigate
- Enter - Select as regular + launch
- t - Toggle thinking model
- Space - Launch with selections
- q/Escape - Cancel

### User Input Methods

#### `askQuestion()`

```typescript
async askQuestion(question: string, defaultValue?: string): Promise<string>
```

Prompts user for text input.

**Parameters:**
- `question: string` - Prompt text
- `defaultValue?: string` - Default value (shown in parentheses)

**Returns:** User input or default value

**Example:**
```typescript
const name = await ui.askQuestion('Username');
// Username: john

const email = await ui.askQuestion('Email', 'user@example.com');
// Email (user@example.com): user@example.com
```

#### `askPassword()`

```typescript
async askPassword(question: string): Promise<string>
```

Prompts for password with masked input (displays `*` for each character).

**Features:**
- Raw mode input handling
- Backspace support
- Ctrl+C to cancel
- Enter to submit

**Example:**
```typescript
const apiKey = await ui.askPassword('Enter API key');
// Enter API key: **********
```

**Internal Implementation:**
```typescript
async askPassword(question: string): Promise<string> {
  return new Promise(resolve => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    // Store original settings
    const wasRaw = stdin.isRaw;
    let password = '';

    stdout.write(`${question}: `);

    // Enable raw mode for input
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (key: string) => {
      switch (key) {
        case '\n': case '\r': case '\u0004':  // Enter, Ctrl+D
          stdin.setRawMode(wasRaw);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':  // Ctrl+C
          stdin.setRawMode(wasRaw);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve('');
          break;
        case '\u007F': case '\u0008':  // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write('\b \b');
          }
          break;
        default:
          // Accept printable characters only
          for (let i = 0; i < key.length; i++) {
            const char = key[i];
            if (char && char >= ' ' && char <= '~') {
              password += char;
              stdout.write('*');
            }
          }
      }
    };

    stdin.on('data', onData);
  });
}
```

#### `confirm()`

```typescript
async confirm(message: string, defaultValue = false): Promise<boolean>
```

Prompts for yes/no confirmation.

**Parameters:**
- `message: string` - Prompt text
- `defaultValue: boolean` - Default value (affects prompt display)

**Returns:** `true` for yes, `false` for no

**Example:**
```typescript
const ok = await ui.confirm('Continue?', true);
// Continue? (Y/n): y

const sure = await ui.confirm('Are you sure?', false);
// Are you sure? (y/N): n
```

### Progress/Status Methods

#### `showProgress()`

```typescript
showProgress(current: number, total: number, label?: string): void
```

Displays ASCII progress bar.

**Format:**
```
[██████████░░░░░░░░░░] 50% (5/10)
```

**Parameters:**
- `current: number` - Current progress value
- `total: number` - Total progress value
- `label?: string` - Optional label prefix

**Respects:** quiet mode

**Example:**
```typescript
for (let i = 0; i <= 100; i += 10) {
  ui.showProgress(i, 100, 'Downloading');
  await delay(100);
}
// Downloading [████████████████████] 100% (100/100)
```

#### `showStatus()`

```typescript
showStatus(type: 'info' | 'success' | 'warning' | 'error', message: string): void
```

Displays a status message as an Ink component.

**Icons by type:**
- `info`: ℹ️ (blue)
- `success`: ✅ (green)
- `warning`: ⚠️ (yellow)
- `error`: ❌ (red)

**Example:**
```typescript
ui.showStatus('success', 'Operation completed');
// ✅ Operation completed (green)
```

#### `clear()`

```typescript
clear(): void
```

Clears the terminal screen.

---

## ModelSelector Component

### Component Definition

**Location:** `src/ui/components/ModelSelector.tsx:31`

```typescript
interface ModelSelectorProps {
  models: ModelInfoImpl[];
  onSelect: (regularModel: ModelInfoImpl | null, thinkingModel: ModelInfoImpl | null) => void;
  onCancel: () => void;
  searchPlaceholder?: string;
  initialRegularModel?: ModelInfoImpl | null;
  initialThinkingModel?: ModelInfoImpl | null;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  onSelect,
  onCancel,
  initialRegularModel = null,
  initialThinkingModel = null,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredModels, setFilteredModels] = useState<ModelInfoImpl[]>(models);
  const [selectedRegularModel] = useState<ModelInfoImpl | null>(initialRegularModel);
  const [selectedThinkingModel, setSelectedThinkingModel] = useState<ModelInfoImpl | null>(
    initialThinkingModel
  );

  // Keyboard input handling via useInput hook
  // Rendering logic...
}
```

### Features

1. **Search Filtering** - Real-time search as you type
2. **Keyboard Navigation** - Arrow keys for up/down
3. **Dual Selection** - Regular + thinking models
4. **Scrollable List** - Shows scroll indicators when needed
5. **Thinking Model Detection** - Tags thinking models with 🤔
6. **Selection Indicators** - Visual feedback for selections

### State

| State | Type | Purpose |
|-------|------|---------|
| `searchQuery` | `string` | Current search term |
| `selectedIndex` | `number` | Currently highlighted index |
| `filteredModels` | `ModelInfoImpl[]` | Models matching search |
| `selectedRegularModel` | `ModelInfoImpl \| null` | Selected regular model |
| `selectedThinkingModel` | `ModelInfoImpl \| null` | Selected thinking model |

### Keyboard Controls

| Key | Action |
|-----|--------|
| ↑↓ | Navigate model list |
| Type | Enter search query text |
| Backspace/Delete | Remove last char from search |
| t | Toggle thinking model (when no search) |
| Enter | Select as regular + launch |
| Space | Launch with current selections |
| Escape | Cancel without saving |
| q | Cancel without saving |

### Display Format

```
Select Models:
Regular: none | Thinking: deepseek:deepseek-r1

Search: sonnet

Found 4 models

▸     1. claude-3-5-sonnet-20241022
     Provider: anthropic | Context: 200K 🤔 Thinking

  [T] 2. claude-3-5-sonnet-20240620
     Provider: anthropic | Context: 200K 🤔 Thinking

     3. gpt-4o-2024-05-13
     Provider: openai | Context: 128K

     4. gemini-1.5-pro-001
     Provider: google | Context: 1000K

↑↓ Navigate | Enter: Regular Model + Launch | t: Toggle Thinking Model | Space: Launch | q: Quit
```

### Selection Indicators

| Indicator | Meaning |
|-----------|---------|
| `▸` | Currently highlighted |
| `[R]` | Selected as regular model |
| `[T]` | Selected as thinking model |
| `[R,T]` | Selected as both |
| `    ` | Not selected |

---

## Supporting Components

### ModelList

**Location:** `src/ui/components/ModelList.tsx`

Simple component for displaying a static model list.

### ProgressBar

**Location:** `src/ui/components/ProgressBar.tsx`

Ink component for progress bar display.

### StatusMessage

**Location:** `src/ui/components/StatusMessage.tsx**

Ink component for colored status messages.

**Props:**
```typescript
interface StatusMessageProps {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
```

---

## Thinking Model Display

### Detection Function

```typescript
function isThinkingModel(modelId: string): boolean {
  const id = modelId.toLowerCase();

  if (id.includes('thinking')) return true;
  if (id.includes('minimax') && (id.includes('2') || id.includes('3'))) return true;
  if (id.includes('deepseek-r1') || id.includes('deepseek-r2') || id.includes('deepseek-r3'))
    return true;
  if (id.includes('deepseek') && (id.includes('3.2') || id.includes('3-2'))) return true;
  if (id.includes('qwq')) return true;
  if (id.includes('o1') || id.includes('o3')) return true;
  if (id.includes('qwen3')) return true;

  return false;
}
```

### Display Usage

In `user-interface.tsx:showModelList()`:
```typescript
const thoughtSuffix = isThinkingModel(model.id)
  ? ' ' + chalk.yellow('🤔 Thinking')
  : '';

console.log(`${marker} ${index + 1}. ${chalk.cyan(displayName)}${thoughtSuffix}`);
```

In `ModelSelector.tsx`:
```typescript
{isThinkingModel(model.id) && ' | 🤔 Thinking'}
```

---

## Input Handling

### UseInput Hook

Uses Ink's `useInput` hook for keyboard input:

```typescript
import { useInput, useApp } from 'ink';

const { exit } = useApp();

useInput((input, key) => {
  // input: single character
  // key: object with modifiers

  if (key.return) {
    // Enter pressed
  }
  if (key.upArrow) {
    // Up arrow pressed
  }
  if (key.ctrl) {
    // Ctrl key modifier
  }
});
```

### Raw Input Mode

For password input, uses Node.js raw mode:

```typescript
const stdin = process.stdin;

// Enable raw mode
stdin.setRawMode(true);
stdin.resume();

// Restore
stdin.setRawMode(false);
stdin.pause();
```

---

## Usage Examples

### Basic Output

```typescript
const ui = new UserInterface({ verbose: true });

ui.info('Info message');
ui.success('Success message');
ui.coloredSuccess('Important success');
ui.coloredInfo('Important info');
ui.warning('Warning message');
ui.error('Error message');
ui.debug('Debug message');
```

### Interactive Selection

```typescript
const models = await modelManager.fetchModels();
const { regular, thinking } = await ui.selectDualModels(models);

if (regular) {
  console.log('Regular:', regular.getDisplayName());
}
if (thinking) {
  console.log('Thinking:', thinking.getDisplayName());
}
```

### User Input

```typescript
const username = await ui.askQuestion('Username');
const password = await ui.askPassword('Password');
const confirmed = await ui.confirm('Proceed?', true);

if (confirmed) {
  // Proceed with operation
}
```

### Progress Display

```typescript
const total = 100;
for (let i = 1; i <= total; i++) {
  await doWork(i);
  ui.showProgress(i, total, 'Processing');
}
ui.success('Done!');
```

### Status Messages

```typescript
ui.showStatus('info', 'Fetching data...');
await fetchData();

ui.showStatus('success', 'Data fetched!');
```

### Custom Highlight

```typescript
ui.highlightInfo(
  'Run synclaude model to select and synclaude to start',
  ['synclaude', 'model', 'start']
);
// Blue info with cyan highlighted terms
```
