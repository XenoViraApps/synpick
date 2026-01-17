import { render } from 'ink';
import React from 'react';
import chalk from 'chalk';
import { createInterface } from 'readline';
import { ModelInfoImpl } from '../models';
import { ModelSelector } from './components/ModelSelector';
import { TierSelector, type TierSelection } from './components/TierSelector';
import { StatusMessage } from './components/StatusMessage';
import { PasswordInput } from './components/PasswordInput';
import { BYTES_PER_KB, PERCENTAGE_MAX, DEFAULT_PROGRESS_BAR_LENGTH } from '../utils/constants';
import { isThinkingModel } from '../utils';

export interface UIOptions {
  verbose?: boolean;
  quiet?: boolean;
}

/**
 * UserInterface handles all user interaction for the synpick CLI
 *
 * Provides methods for displaying messages, progress indicators,
 * user input collection, and interactive model selection.
 */
export class UserInterface {
  private verbose: boolean;
  private quiet: boolean;

  /**
   * Creates a new UserInterface instance
   *
   * @param options - Configuration options for the UI
   * @param options.verbose - If true, enables debug output
   * @param options.quiet - If true, suppresses non-error output
   */
  constructor(options: UIOptions = {}) {
    this.verbose = options.verbose || false;
    this.quiet = options.quiet || false;
  }

  /**
   * Displays an informational message
   *
   * @param message - The message to display
   * @param args - Additional arguments to log
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.quiet) {
      console.log(`ℹ ${message}`, ...args);
    }
  }

  /**
   * Displays a success message
   *
   * @param message - The message to display
   * @param args - Additional arguments to log
   */
  success(message: string, ...args: unknown[]): void {
    if (!this.quiet) {
      console.log(`✓ ${message}`, ...args);
    }
  }

  /**
   * Displays a colored success message for important notifications
   *
   * @param message - The message to display
   * @param args - Additional arguments to log
   */
  coloredSuccess(message: string, ...args: unknown[]): void {
    if (!this.quiet) {
      console.log(chalk.green(`✓ ${message}`), ...args);
    }
  }

  /**
   * Displays a colored info message for important notifications
   *
   * @param message - The message to display
   * @param args - Additional arguments to log
   */
  coloredInfo(message: string, ...args: unknown[]): void {
    if (!this.quiet) {
      console.log(chalk.blue(`ℹ ${message}`), ...args);
    }
  }

  /**
   * Displays a message with highlighted text
   *
   * @param message - The message to display
   * @param highlights - Strings within the message to highlight with cyan color
   */
  highlightInfo(message: string, highlights: string[] = []): void {
    if (!this.quiet) {
      let output = chalk.blue('ℹ ');
      let processedMessage = message;

      // Color each highlighted occurrence
      highlights.forEach(highlight => {
        const regex = new RegExp(`(${highlight})`, 'g');
        processedMessage = processedMessage.replace(regex, chalk.cyan('$1'));
      });

      output += processedMessage;
      console.log(output);
    }
  }

  /**
   * Displays a warning message
   *
   * @param message - The message to display
   * @param args - Additional arguments to log
   */
  warning(message: string, ...args: unknown[]): void {
    if (!this.quiet) {
      console.warn(`⚠ ${message}`, ...args);
    }
  }

  /**
   * Displays an error message
   *
   * Always displays, even in quiet mode.
   *
   * @param message - The message to display
   * @param args - Additional arguments to log
   */
  error(message: string, ...args: unknown[]): void {
    console.error(`✗ ${message}`, ...args);
  }

  /**
   * Displays a debug message
   *
   * Only displays when verbose mode is enabled.
   *
   * @param message - The message to display
   * @param args - Additional arguments to log
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.verbose) {
      console.debug(`🐛 ${message}`, ...args);
    }
  }

  /**
   * Displays a simple list of models
   *
   * @param models - The models to display
   * @param selectedIndex - Optional index of the currently selected model
   */
  showModelList(models: ModelInfoImpl[], selectedIndex?: number): void {
    if (models.length === 0) {
      this.info('No models available');
      return;
    }

    console.log('\nAvailable Models:');
    console.log('================');

    models.forEach((model, index) => {
      const marker = selectedIndex === index ? '➤' : ' ';
      const displayName = model.getDisplayName();
      const thoughtsuffix = isThinkingModel(model.id) ? ' ' + chalk.yellow('🤔 Thinking') : '';

      console.log(`${marker} ${index + 1}. ${chalk.cyan(displayName)}${thoughtsuffix}`);
      console.log(`    ${chalk.gray('Provider:')} ${model.getProvider()}`);
      if ('context_length' in model && typeof model.context_length === 'number') {
        const contextK = Math.round(model.context_length / BYTES_PER_KB);
        console.log(`    ${chalk.gray('Context:')} ${contextK}K tokens`);
      }
      if ('quantization' in model && model.quantization) {
        console.log(`    ${chalk.gray('Quantization:')} ${model.quantization}`);
      }
      console.log(`    ${chalk.gray('ID:')} ${model.id}`);
      console.log('');
    });
  }

  /**
   * Interactive model selection using Ink
   *
   * For backward compatibility - returns a single model (regular or thinking).
   *
   * @param models - The models to select from
   * @returns Promise resolving to the selected model, or null if cancelled
   */
  async selectModel(models: ModelInfoImpl[]): Promise<ModelInfoImpl | null> {
    if (models.length === 0) {
      this.error('No models available for selection');
      return null;
    }

    return new Promise(resolve => {
      const { waitUntilExit } = render(
        <ModelSelector
          models={models}
          onSelect={(regularModel, thinkingModel) => {
            const selected = regularModel || thinkingModel;
            if (selected) {
              this.success(`Selected model: ${selected.getDisplayName()}`);
              resolve(selected);
            } else {
              this.info('No model selected');
              resolve(null);
            }
          }}
          onCancel={() => {
            this.info('Model selection cancelled');
            resolve(null);
          }}
        />
      );

      waitUntilExit().catch(() => {
        resolve(null);
      });
    });
  }

  /**
   * Interactive dual model selection using Ink
   *
   * Allows selecting both regular and thinking models.
   *
   * @param models - The models to select from
   * @returns Promise resolving to an object with regular and thinking models (may be null)
   */
  async selectDualModels(
    models: ModelInfoImpl[]
  ): Promise<{ regular: ModelInfoImpl | null; thinking: ModelInfoImpl | null }> {
    if (models.length === 0) {
      this.error('No models available for selection');
      return { regular: null, thinking: null };
    }

    return new Promise(resolve => {
      const { waitUntilExit } = render(
        <ModelSelector
          models={models}
          onSelect={(regularModel, thinkingModel) => {
            if (regularModel || thinkingModel) {
              if (regularModel) this.success(`Regular model: ${regularModel.getDisplayName()}`);
              if (thinkingModel) this.success(`Thinking model: ${thinkingModel.getDisplayName()}`);
            } else {
              this.info('No models selected');
            }
            resolve({ regular: regularModel, thinking: thinkingModel });
          }}
          onCancel={() => {
            this.info('Model selection cancelled');
            resolve({ regular: null, thinking: null });
          }}
        />
      );

      waitUntilExit().catch(() => {
        resolve({ regular: null, thinking: null });
      });
    });
  }

  /**
   * Interactive tier-based model selection using Ink
   *
   * Allows selecting different models for each tier (default, opus, sonnet, haiku, subagent, thinking).
   * Navigation: Tab/Shift+Tab switch tiers, ↑/↓ navigate models, Space selects, Enter confirms, Esc cancels.
   *
   * @param models - The models to select from
   * @param initialSelection - Optional initial tier selections
   * @param defaultModelId - Optional default model ID to use as fallback
   * @returns Promise resolving to tier selections, or null if cancelled
   */
  async selectTiers(
    models: ModelInfoImpl[],
    initialSelection?: TierSelection,
    defaultModelId?: string
  ): Promise<TierSelection | null> {
    if (models.length === 0) {
      this.error('No models available for selection');
      return null;
    }

    return new Promise(resolve => {
      const { waitUntilExit } = render(
        <TierSelector
          models={models}
          initialSelection={initialSelection}
          defaultModelId={defaultModelId}
          onSelect={selection => {
            this.coloredSuccess('Tier models saved successfully');
            resolve(selection);
          }}
          onCancel={() => {
            this.info('Tier selection cancelled');
            resolve(null);
          }}
        />
      );

      waitUntilExit().catch(() => {
        resolve(null);
      });
    });
  }

  /**
   * Shows a progress bar on the console
   *
   * @param current - Current progress value
   * @param total - Total value for completion
   * @param label - Optional label to display before the progress bar
   */
  showProgress(current: number, total: number, label?: string): void {
    if (this.quiet) return;

    const percentage = Math.round((current / total) * PERCENTAGE_MAX);
    const barLength = DEFAULT_PROGRESS_BAR_LENGTH;
    const filledLength = Math.round((percentage / PERCENTAGE_MAX) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    const labelStr = label ? `${label} ` : '';
    process.stdout.write(`\r${labelStr}[${bar}] ${percentage}% (${current}/${total})`);

    if (current >= total) {
      console.log(''); // New line when complete
    }
  }

  /**
   * Asks a question and waits for user input
   *
   * @param question - The question to ask
   * @param defaultValue - Optional default value
   * @returns Promise resolving to the user's answer
   */
  async askQuestion(question: string, defaultValue?: string): Promise<string> {
    return new Promise(resolve => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
      rl.question(prompt, (answer: string) => {
        rl.close();
        resolve(answer || defaultValue || '');
      });
    });
  }

  /**
   * Asks for password input with masking
   *
   * Password input is masked with asterisks for security.
   * Press Enter to submit, Ctrl+C to cancel.
   *
   * @param question - The prompt question
   * @returns Promise resolving to the entered password (empty if cancelled)
   */
  async askPassword(question: string): Promise<string> {
    return new Promise(resolve => {
      // Store original settings
      const stdin = process.stdin;
      const stdout = process.stdout;
      const wasRaw = stdin.isRaw;

      let password = '';
      stdout.write(`${question}: `);

      // Enable raw mode to capture individual keystrokes
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');

      const onData = (key: string) => {
        switch (key) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl+D
            // Restore original stdin settings
            stdin.setRawMode(wasRaw);
            stdin.pause();
            stdin.removeListener('data', onData);
            stdout.write('\n');
            resolve(password);
            break;
          case '\u0003': // Ctrl+C
            // Restore original stdin settings
            stdin.setRawMode(wasRaw);
            stdin.pause();
            stdin.removeListener('data', onData);
            stdout.write('\n');
            resolve('');
            break;
          case '\u007F': // Backspace (DEL)
          case '\u0008': // Backspace (BS)
            if (password.length > 0) {
              password = password.slice(0, -1);
              stdout.write('\b \b');
            }
            break;
          default:
            // Handle multi-character input (like paste) and individual keypresses
            for (let i = 0; i < key.length; i++) {
              const char = key[i];
              // Only accept printable ASCII characters
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

  /**
   * Prompts user to enter a password to create/set encryption
   *
   * Uses the PasswordInput component with confirmation for security.
   * User must enter the same password twice to confirm.
   *
   * @param options - Password prompt options
   * @returns Promise resolving to the entered password (null if cancelled)
   */
  async promptPasswordCreate(options: {
    prompt?: string;
    minLength?: number;
  } = {}): Promise<string | null> {
    const { prompt = 'Enter password', minLength = 8 } = options;

    return new Promise(resolve => {
      let password: string | null = null;
      let confirmPasswordStep = false;
      let firstPassword = '';

      const renderInput = () => {
        const { waitUntilExit, unmount } = render(
          <PasswordInput
            prompt={confirmPasswordStep ? 'Confirm password' : prompt}
            minLength={confirmPasswordStep ? firstPassword.length : minLength}
            onSubmit={submittedPassword => {
              if (!confirmPasswordStep) {
                firstPassword = submittedPassword;
                confirmPasswordStep = true;
                // Re-render for confirmation step
                unmount();
                renderInput();
              } else {
                if (submittedPassword === firstPassword) {
                  password = submittedPassword;
                } else {
                  this.error('Passwords do not match!');
                  password = null;
                }
                unmount();
                resolve(password);
              }
            }}
            onCancel={() => {
              unmount();
              resolve(null);
            }}
          />
        );

        return { waitUntilExit };
      };

      renderInput();
    });
  }

  /**
   * Prompts user to enter a password to decrypt an encrypted config
   *
   * Uses the PasswordInput component for secure password entry.
   *
   * @param prompt - The prompt to display
   * @returns Promise resolving to the entered password (null if cancelled)
   */
  async promptPasswordDecrypt(prompt = 'Enter password to decrypt'): Promise<string | null> {
    return new Promise(resolve => {
      const { unmount } = render(
        <PasswordInput
          prompt={prompt}
          minLength={0}
          onSubmit={password => {
            unmount();
            resolve(password);
          }}
          onCancel={() => {
            unmount();
            resolve(null);
          }}
        />
      );
    });
  }

  /**
   * Asks the user to confirm an action
   *
   * @param message - The confirmation message
   * @param defaultValue - Default value if user just presses Enter
   * @returns Promise resolving to true if user confirmed, false otherwise
   */
  async confirm(message: string, defaultValue = false): Promise<boolean> {
    const defaultStr = defaultValue ? 'Y/n' : 'y/N';
    const answer = await this.askQuestion(`${message} (${defaultStr})`, defaultValue ? 'y' : 'n');
    return answer.toLowerCase().startsWith('y');
  }

  /**
   * Shows a status message using the Ink StatusMessage component
   *
   * @param type - The type of status message (info, success, warning, error)
   * @param message - The message to display
   */
  showStatus(type: 'info' | 'success' | 'warning' | 'error', message: string): void {
    const { waitUntilExit } = render(<StatusMessage type={type} message={message} />);
    waitUntilExit();
  }

  /**
   * Clears the terminal screen
   */
  clear(): void {
    console.clear();
  }
}
