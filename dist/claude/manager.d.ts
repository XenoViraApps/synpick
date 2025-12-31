/**
 * Result of a Claude Code update operation
 */
export interface UpdateResult {
    success: boolean;
    action: 'none' | 'installed' | 'updated' | 'failed';
    previousVersion?: string;
    newVersion?: string;
    error?: string;
}
/**
 * Options for installing or updating Claude Code
 */
export interface InstallOptions {
    /** Force update even if already up to date */
    force?: boolean;
    /** Whether to show verbose output */
    verbose?: boolean;
    /** Use specific npm command (defaults to 'npm') */
    npmCommand?: string;
}
/**
 * Manages Claude Code installation, updates, and version checking
 */
export declare class ClaudeCodeManager {
    private options;
    private static readonly CLAUDE_PACKAGE;
    private static readonly NPM_REGISTRY_URL;
    private static readonly UPDATE_CHECK_INTERVAL_MS;
    private static readonly OFFICIAL_INSTALL_URL;
    private timeoutMs;
    constructor(options?: {
        verbose?: boolean;
        timeoutMs?: number;
    });
    /**
     * Check if Claude Code is installed
     */
    checkInstallation(): Promise<boolean>;
    /**
     * Get the Claude Code executable path
     */
    getClaudePath(): Promise<string>;
    /**
     * Get current Claude Code version
     */
    getCurrentVersion(): Promise<string | null>;
    /**
     * Get the locally installed version from npm
     */
    getNpmInstalledVersion(): Promise<string | null>;
    /**
     * Get latest Claude Code version from npm registry
     */
    getLatestVersion(): Promise<string | null>;
    /**
     * Check if an update is needed
     */
    needsUpdate(): Promise<boolean>;
    /**
     * Compare two semantic version strings
     * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
     */
    private compareVersions;
    /**
     * Check if update check should run based on interval
     */
    shouldCheckUpdate(lastCheckTime?: string, intervalHours?: number): boolean;
    /**
     * Record that an update check was performed
     */
    static getCurrentTimestamp(): string;
    /**
     * Run npm install to install or update Claude Code
     */
    installOrUpdate(options?: InstallOptions): Promise<UpdateResult>;
    /**
     * Run the official Claude Code installer via curl
     */
    runOfficialInstaller(): Promise<UpdateResult>;
    /**
     * Check for updates without installing
     */
    checkForUpdates(options?: {
        useActualVersion?: boolean;
    }): Promise<{
        hasUpdate: boolean;
        currentVersion: string | null;
        latestVersion: string | null;
        isNpmInstalled: boolean;
    }>;
    /**
     * Get detailed information about Claude Code installation
     */
    getInstallationInfo(): Promise<{
        installed: boolean;
        path?: string;
        version?: string;
        isSymlink?: boolean;
        symlinkTarget?: string;
        isGlobal: boolean;
    }>;
    /**
     * Spawn a command and capture output
     *
     * @param command - Command to execute
     * @param args - Command arguments
     * @returns Promise with command result
     */
    private spawnCommand;
}
/**
 * Default singleton instance
 */
export declare const claudeCodeManager: ClaudeCodeManager;
//# sourceMappingURL=manager.d.ts.map