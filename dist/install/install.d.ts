/**
 * Installation method that will be used
 */
export declare enum InstallMethodEnum {
    /** npm global install with user prefix (non-sudo) */
    NPM_USER_PREFIX = "npm-user-prefix",
    /** npm global install (requires write access to prefix) */
    NPM_GLOBAL = "npm-global",
    /** Manual local install */
    MANUAL_LOCAL = "manual-local"
}
export interface InstallOptions {
    /** Whether to show verbose output */
    verbose?: boolean;
    /** Force reinstallation even if already installed */
    force?: boolean;
    /** Skip PATH updates */
    skipPathUpdate?: boolean;
    /** Target installation method (auto-detected if not specified) */
    installMethod?: InstallMethodEnum;
}
export interface InstallResult {
    success: boolean;
    method: InstallMethodEnum;
    installedPath?: string;
    binPath?: string;
    version?: string;
    pathUpdated: boolean;
    pathConfigFile?: string;
    error?: string;
}
export interface PathUpdateResult {
    success: boolean;
    pathAdded: boolean;
    configFiles: string[];
    needsReload: boolean;
    error?: string;
}
/**
 * Check for and clean up stale synpick symlinks
 */
export declare function checkCleanStaleSymlinks(options?: {
    verbose?: boolean;
}): Promise<{
    cleaned: string[];
    failed: string[];
}>;
/**
 * Detects the best installation method for the current environment
 */
export declare function detectInstallMethod(): InstallMethodEnum;
/**
 * Configures npm user prefix for non-sudo installation
 */
export declare function configureNpmUserPrefix(): Promise<boolean>;
/**
 * Checks if a directory is already in PATH
 */
export declare function isPathInPath(directory: string): boolean;
/**
 * Adds a directory to PATH in shell config
 */
export declare function addToPathIfNotExists(directory: string, options?: {
    verbose?: boolean;
}): Promise<PathUpdateResult>;
/**
 * Gets the npm bin directory
 */
export declare function getNpmBinDir(): string;
/**
 * Verifies installation by checking if synpick command is available
 */
export declare function verifyInstallation(method: InstallMethodEnum): Promise<{
    success: boolean;
    version?: string;
    commandPath?: string;
    error?: string;
}>;
/**
 * Main installation function
 */
export declare function installSynclaude(options?: InstallOptions): Promise<InstallResult>;
/**
 * Uninstall function
 */
export declare function uninstallSynclaude(options?: {
    verbose?: boolean;
}): Promise<{
    success: boolean;
    error?: string;
}>;
//# sourceMappingURL=install.d.ts.map