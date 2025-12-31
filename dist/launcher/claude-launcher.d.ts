export interface LaunchOptions {
    model: string;
    claudePath?: string;
    additionalArgs?: string[];
    env?: Record<string, string>;
    thinkingModel?: string | null;
    maxTokenSize?: number;
}
export interface LauncherOptions {
    claudePath?: string;
    /** Timeout for command execution in milliseconds (default: 5000) */
    timeoutMs?: number;
}
export interface LaunchResult {
    success: boolean;
    pid?: number;
    error?: string;
}
/**
 * ClaudeLauncher handles launching and managing Claude Code processes
 *
 * Provides methods to launch Claude Code with custom models,
 * check installation status, and retrieve version information.
 */
export declare class ClaudeLauncher {
    private claudePath;
    private timeoutMs;
    /**
     * Creates a new ClaudeLauncher instance
     *
     * @param options - Configuration options for the launcher
     * @param options.claudePath - Path to the claude executable (default: 'claude')
     * @param options.timeoutMs - Timeout for command execution in milliseconds (default: 5000)
     */
    constructor(options?: LauncherOptions);
    /**
     * Launches Claude Code with the specified options
     *
     * Sets up environment variables for custom model integration
     * and spawns a new Claude Code process.
     *
     * @param options - Launch options for Claude Code
     * @param options.model - The model to use
     * @param options.claudePath - Optional custom path to claude executable
     * @param options.additionalArgs - Additional command-line arguments to pass
     * @param options.env - Additional environment variables
     * @param options.thinkingModel - Optional thinking model for reasoning tasks
     * @param options.maxTokenSize - Optional max token size (default: 128000)
     * @returns Promise resolving to the launch result
     */
    launchClaudeCode(options: LaunchOptions): Promise<LaunchResult>;
    private createClaudeEnvironment;
    /**
     * Checks if Claude Code is installed and accessible
     *
     * Attempts to spawn Claude Code with --version flag.
     *
     * @returns Promise resolving to true if Claude is installed, false otherwise
     */
    checkClaudeInstallation(): Promise<boolean>;
    /**
     * Gets the installed Claude Code version
     *
     * Attempts to retrieve the version string by running Claude Code
     * with the --version flag and parsing the output.
     *
     * @returns Promise resolving to version string (e.g., "2.0.76"), or null if unavailable
     */
    getClaudeVersion(): Promise<string | null>;
    /**
     * Sets the path to the Claude executable
     *
     * @param path - The path to the claude executable
     */
    setClaudePath(path: string): void;
    /**
     * Gets the current path to the Claude executable
     *
     * @returns The current claude path
     */
    getClaudePath(): string;
}
//# sourceMappingURL=claude-launcher.d.ts.map