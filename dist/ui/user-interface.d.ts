import { ModelInfoImpl } from '../models';
export interface UIOptions {
    verbose?: boolean;
    quiet?: boolean;
}
/**
 * UserInterface handles all user interaction for the synclaude CLI
 *
 * Provides methods for displaying messages, progress indicators,
 * user input collection, and interactive model selection.
 */
export declare class UserInterface {
    private verbose;
    private quiet;
    /**
     * Creates a new UserInterface instance
     *
     * @param options - Configuration options for the UI
     * @param options.verbose - If true, enables debug output
     * @param options.quiet - If true, suppresses non-error output
     */
    constructor(options?: UIOptions);
    /**
     * Displays an informational message
     *
     * @param message - The message to display
     * @param args - Additional arguments to log
     */
    info(message: string, ...args: any[]): void;
    /**
     * Displays a success message
     *
     * @param message - The message to display
     * @param args - Additional arguments to log
     */
    success(message: string, ...args: any[]): void;
    /**
     * Displays a colored success message for important notifications
     *
     * @param message - The message to display
     * @param args - Additional arguments to log
     */
    coloredSuccess(message: string, ...args: any[]): void;
    /**
     * Displays a colored info message for important notifications
     *
     * @param message - The message to display
     * @param args - Additional arguments to log
     */
    coloredInfo(message: string, ...args: any[]): void;
    /**
     * Displays a message with highlighted text
     *
     * @param message - The message to display
     * @param highlights - Strings within the message to highlight with cyan color
     */
    highlightInfo(message: string, highlights?: string[]): void;
    /**
     * Displays a warning message
     *
     * @param message - The message to display
     * @param args - Additional arguments to log
     */
    warning(message: string, ...args: any[]): void;
    /**
     * Displays an error message
     *
     * Always displays, even in quiet mode.
     *
     * @param message - The message to display
     * @param args - Additional arguments to log
     */
    error(message: string, ...args: any[]): void;
    /**
     * Displays a debug message
     *
     * Only displays when verbose mode is enabled.
     *
     * @param message - The message to display
     * @param args - Additional arguments to log
     */
    debug(message: string, ...args: any[]): void;
    /**
     * Displays a simple list of models
     *
     * @param models - The models to display
     * @param selectedIndex - Optional index of the currently selected model
     */
    showModelList(models: ModelInfoImpl[], selectedIndex?: number): void;
    /**
     * Interactive model selection using Ink
     *
     * For backward compatibility - returns a single model (regular or thinking).
     *
     * @param models - The models to select from
     * @returns Promise resolving to the selected model, or null if cancelled
     */
    selectModel(models: ModelInfoImpl[]): Promise<ModelInfoImpl | null>;
    /**
     * Interactive dual model selection using Ink
     *
     * Allows selecting both regular and thinking models.
     *
     * @param models - The models to select from
     * @returns Promise resolving to an object with regular and thinking models (may be null)
     */
    selectDualModels(models: ModelInfoImpl[]): Promise<{
        regular: ModelInfoImpl | null;
        thinking: ModelInfoImpl | null;
    }>;
    /**
     * Shows a progress bar on the console
     *
     * @param current - Current progress value
     * @param total - Total value for completion
     * @param label - Optional label to display before the progress bar
     */
    showProgress(current: number, total: number, label?: string): void;
    /**
     * Asks a question and waits for user input
     *
     * @param question - The question to ask
     * @param defaultValue - Optional default value
     * @returns Promise resolving to the user's answer
     */
    askQuestion(question: string, defaultValue?: string): Promise<string>;
    /**
     * Asks for password input with masking
     *
     * Password input is masked with asterisks for security.
     * Press Enter to submit, Ctrl+C to cancel.
     *
     * @param question - The prompt question
     * @returns Promise resolving to the entered password (empty if cancelled)
     */
    askPassword(question: string): Promise<string>;
    /**
     * Asks the user to confirm an action
     *
     * @param message - The confirmation message
     * @param defaultValue - Default value if user just presses Enter
     * @returns Promise resolving to true if user confirmed, false otherwise
     */
    confirm(message: string, defaultValue?: boolean): Promise<boolean>;
    /**
     * Shows a status message using the Ink StatusMessage component
     *
     * @param type - The type of status message (info, success, warning, error)
     * @param message - The message to display
     */
    showStatus(type: 'info' | 'success' | 'warning' | 'error', message: string): void;
    /**
     * Clears the terminal screen
     */
    clear(): void;
}
//# sourceMappingURL=user-interface.d.ts.map