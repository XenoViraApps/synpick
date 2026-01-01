import { spawn, execSync } from 'child_process';
import { promises as fsPromises, statSync } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Installation method that will be used
 */
export enum InstallMethodEnum {
  /** npm global install with user prefix (non-sudo) */
  NPM_USER_PREFIX = 'npm-user-prefix',
  /** npm global install (requires write access to prefix) */
  NPM_GLOBAL = 'npm-global',
  /** Manual local install */
  MANUAL_LOCAL = 'manual-local',
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
export async function checkCleanStaleSymlinks(options: { verbose?: boolean } = {}): Promise<{
  cleaned: string[];
  failed: string[];
}> {
  const { verbose = false } = options;
  const cleaned: string[] = [];
  const failed: string[] = [];

  // Check common system locations for stale symlinks
  const stalePaths = ['/usr/local/bin/synpick', '/usr/bin/synpick'];

  for (const checkPath of stalePaths) {
    try {
      // Check if path exists as a symlink
      const stat = await fsPromises.lstat(checkPath);

      if (stat.isSymbolicLink()) {
        // Check if the symlink target exists (broken link check)
        try {
          await fsPromises.stat(checkPath);
          // File exists, not a stale link
          continue;
        } catch {
          // Target doesn't exist, this is a stale symlink
          const target = await fsPromises.readlink(checkPath);
          if (verbose) {
            console.log(`Found stale symlink: ${checkPath} -> ${target}`);
          }

          // Try to remove it
          try {
            await fsPromises.unlink(checkPath);
            cleaned.push(checkPath);
            if (verbose) {
              console.log(`Removed stale symlink: ${checkPath}`);
            }
          } catch {
            failed.push(checkPath);
            console.warn(`Could not remove stale symlink: ${checkPath}`);
            console.warn(`  Please run: sudo rm -f ${checkPath}`);
          }
        }
      }
    } catch {
      // Path doesn't exist or other error, skip
      continue;
    }
  }

  if (cleaned.length > 0 && verbose) {
    console.log(`Cleaned ${cleaned.length} stale symlink(s)`);
  }

  return { cleaned, failed };
}

/**
 * Detects the best installation method for the current environment
 */
export function detectInstallMethod(): InstallMethodEnum {
  try {
    // Get npm prefix
    const npmPrefix = execSync('npm config get prefix', {
      encoding: 'utf-8',
    }).trim();

    // Check if prefix is in home directory (user-level, no sudo needed)
    const home = os.homedir();
    if (npmPrefix.startsWith(home) || npmPrefix.startsWith('/home/')) {
      return InstallMethodEnum.NPM_USER_PREFIX;
    }

    // Check if we can write to npm prefix
    fsPromises.stat(npmPrefix).catch(() => ({ mode: 0o755 }));

    // On Unix, check write permissions via a test
    try {
      // Try to see if we can access npm bin directory
      const npmPrefix = execSync('npm prefix -g', { encoding: 'utf-8' }).trim();
      const npmBin = path.join(npmPrefix, 'bin');
      const testFile = path.join(npmBin, '.synpick-test');
      execSync(`touch "${testFile}"`, { stdio: 'ignore' });
      execSync(`rm -f "${testFile}"`, { stdio: 'ignore' });
      return InstallMethodEnum.NPM_GLOBAL;
    } catch {
      // Fall back to manual local install
      return InstallMethodEnum.MANUAL_LOCAL;
    }
  } catch {
    return InstallMethodEnum.MANUAL_LOCAL;
  }
}

/**
 * Configures npm user prefix for non-sudo installation
 */
export async function configureNpmUserPrefix(): Promise<boolean> {
  try {
    const home = os.homedir();
    const localPrefix = path.join(home, '.npm-local');

    // Ensure the directory exists
    await fsPromises.mkdir(localPrefix, { recursive: true });

    // Configure npm to use the custom prefix
    execSync(`npm config set prefix "${localPrefix}"`, { stdio: 'pipe' });

    // Add to PATH if not already there
    const localBin = path.join(localPrefix, 'bin');
    await addToPathIfNotExists(localBin);

    return true;
  } catch (error) {
    console.error(
      `Failed to configure npm user prefix: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
}

/**
 * Runs a command and returns its output
 */
function runCommand(
  command: string,
  args: string[],
  options: { verbose?: boolean } = {}
): Promise<{ success: boolean; stdout: string; stderr: string; code: number | null }> {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      stdio: options.verbose ? 'inherit' : 'pipe',
      shell: true, // Ensure shell is available for proper command execution
    });

    let stdout = '';
    let stderr = '';

    if (!options.verbose) {
      child.stdout?.on('data', data => {
        stdout += data.toString();
      });

      child.stderr?.on('data', data => {
        stderr += data.toString();
      });
    }

    child.on('close', code => {
      resolve({ success: code === 0, stdout, stderr, code });
    });

    child.on('error', () => {
      resolve({ success: false, stdout, stderr, code: -1 });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      child.kill();
      resolve({ success: false, stdout, stderr, code: null });
    }, 300000);
  });
}

/**
 * Gets the shell type and its config file
 */
function getShellInfo(): { shell: string; configFile: string } {
  const shellEnv = process.env.SHELL || '';
  const shellName = path.basename(shellEnv);

  const home = os.homedir();

  if (shellName === 'zsh') {
    return { shell: 'zsh', configFile: path.join(home, '.zshrc') };
  }

  if (shellName === 'fish') {
    return {
      shell: 'fish',
      configFile: path.join(home, '.config', 'fish', 'config.fish'),
    };
  }

  // Default to bash
  if (shellName === 'bash') {
    // Check for bash_profile (login shell) or bashrc
    const bashProfile = path.join(home, '.bash_profile');
    const bashrc = path.join(home, '.bashrc');
    // Use existence check instead of async access
    try {
      statSync(bashProfile);
      return { shell: 'bash', configFile: bashProfile };
    } catch {
      return { shell: 'bash', configFile: bashrc };
    }
  }

  // Default to bashrc for unknown shells
  return { shell: 'bash', configFile: path.join(home, '.bashrc') };
}

/**
 * Gets current PATH environment variable
 */
function getPathValue(): string[] {
  return (process.env.PATH || '').split(path.delimiter).filter(Boolean);
}

/**
 * Checks if a directory is already in PATH
 */
export function isPathInPath(directory: string): boolean {
  const normalizedDir = path.resolve(directory);
  return getPathValue().some(p => path.resolve(p) === normalizedDir);
}

/**
 * Adds a directory to PATH in shell config
 */
export async function addToPathIfNotExists(
  directory: string,
  options: { verbose?: boolean } = {}
): Promise<PathUpdateResult> {
  const normalizedDir = path.resolve(directory);

  // Check if already in PATH
  if (isPathInPath(normalizedDir)) {
    return {
      success: true,
      pathAdded: false,
      configFiles: [],
      needsReload: false,
    };
  }

  const { configFile } = getShellInfo();
  const configFiles: string[] = [];

  try {
    // Ensure config directory exists
    const configDir = path.dirname(configFile);
    await fsPromises.mkdir(configDir, { recursive: true });

    // Read existing config
    let config = '';
    try {
      config = await fsPromises.readFile(configFile, 'utf-8');
    } catch {
      // File doesn't exist, start empty
    }

    // Check if PATH entry already exists
    const pathPattern = new RegExp(
      `export\\s+PATH=.*["']?.*${normalizedDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?.?`
    );

    if (pathPattern.test(config)) {
      return {
        success: true,
        pathAdded: false,
        configFiles: [],
        needsReload: false,
      };
    }

    // Check for our guard block to avoid duplicates
    const guardStart = '# SynPick PATH configuration';
    const guardEnd = '# End SynPick PATH configuration';

    if (config.includes(guardStart) && config.includes(guardEnd)) {
      // Update existing guard block
      const lines = config.split('\n');
      let inGuard = false;
      const newLines: string[] = [];
      let guardUpdated = false;

      for (const line of lines) {
        if (line.includes(guardStart)) {
          inGuard = true;
          newLines.push(line);
          newLines.push(`export PATH="$PATH:${normalizedDir}"`);
          guardUpdated = true;
        } else if (inGuard && line.includes(guardEnd)) {
          inGuard = false;
          newLines.push(line);
        } else if (!inGuard) {
          newLines.push(line);
        }
      }

      if (!guardUpdated) {
        // Guard exists but our path not in it
        const beforeGuard = config.substring(0, config.indexOf(guardStart));
        const afterGuard = config.substring(config.indexOf(guardEnd) + guardEnd.length);
        config = `${beforeGuard}${guardStart}\nexport PATH="$PATH:${normalizedDir}"\n${guardEnd}${afterGuard}`;
      } else {
        config = newLines.join('\n');
      }
    } else {
      // Add new guard block at end of file
      const separator = config.length > 0 && !config.endsWith('\n') ? '\n' : '';
      config += `${separator}${guardStart}\nexport PATH="$PATH:${normalizedDir}"\n${guardEnd}\n`;
    }

    // Write back
    await fsPromises.writeFile(configFile, config, 'utf-8');
    configFiles.push(configFile);

    if (options.verbose) {
      console.log(`Added ${normalizedDir} to PATH in ${configFile}`);
    }

    return {
      success: true,
      pathAdded: true,
      configFiles,
      needsReload: true,
    };
  } catch (error) {
    return {
      success: false,
      pathAdded: false,
      configFiles,
      needsReload: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Gets the npm bin directory
 */
export function getNpmBinDir(): string {
  try {
    const prefix = execSync('npm prefix -g', { encoding: 'utf-8' }).trim();
    return path.join(prefix, 'bin');
  } catch {
    // Fallback calculation
    const prefix = execSync('npm config get prefix', { encoding: 'utf-8' }).trim();
    return path.join(prefix, 'bin');
  }
}

/**
 * Verifies installation by checking if synpick command is available
 */
export async function verifyInstallation(
  method: InstallMethodEnum
): Promise<{ success: boolean; version?: string; commandPath?: string; error?: string }> {
  try {
    let commandPath = 'synpick';

    // For manual install, we need to use the full path
    if (method === InstallMethodEnum.MANUAL_LOCAL) {
      const binDir = path.join(os.homedir(), '.local', 'bin');
      commandPath = path.join(binDir, 'synpick');
    }

    // Try to get version
    const result = await runCommand(commandPath, ['--version']);

    if (result.success) {
      const version = result.stdout.trim();
      return {
        success: true,
        version,
        commandPath,
      };
    }

    return {
      success: false,
      error: `Command failed with code ${result.code}: ${result.stderr}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main installation function
 */
export async function installSynpick(options: InstallOptions = {}): Promise<InstallResult> {
  const { verbose = false, skipPathUpdate = false } = options;

  // Detect or use specified install method
  const method = options.installMethod || detectInstallMethod();

  if (verbose) {
    console.log(`Installing with method: ${method}`);
  }

  const result: InstallResult = {
    success: false,
    method,
    pathUpdated: false,
  };

  try {
    let binPath = '';

    switch (method) {
      case InstallMethodEnum.NPM_USER_PREFIX:
        // Configure npm user prefix if needed
        const configured = await configureNpmUserPrefix();
        if (verbose) {
          console.log(`NPM user prefix configured: ${configured}`);
        }

        // Install using npm with global flag
        if (verbose) {
          console.log('Installing via npm global (user prefix)...');
        }

        const npmResult = await runCommand('npm', ['install', '-g', '--unsafe-perm', 'synpick'], {
          verbose,
        });

        if (!npmResult.success) {
          throw new Error(`npm install failed: ${npmResult.stderr}`);
        }

        binPath = getNpmBinDir();
        result.installedPath = execSync('npm root -g', { encoding: 'utf-8' }).trim();
        break;

      case InstallMethodEnum.NPM_GLOBAL:
        // Direct npm global install
        if (verbose) {
          console.log('Installing via npm global (system-wide)...');
        }

        const npmGlobalResult = await runCommand(
          'npm',
          ['install', '-g', '--unsafe-perm', 'synpick'],
          {
            verbose,
          }
        );

        if (!npmGlobalResult.success) {
          throw new Error(`npm install failed: ${npmGlobalResult.stderr}`);
        }

        binPath = getNpmBinDir();
        result.installedPath = execSync('npm root -g', { encoding: 'utf-8' }).trim();

        // Update PATH if npm bin is not in PATH
        if (!skipPathUpdate && !isPathInPath(binPath)) {
          const pathResult = await addToPathIfNotExists(binPath, { verbose });
          result.pathUpdated = pathResult.pathAdded;
          result.pathConfigFile = pathResult.configFiles[0];
        }
        break;

      case InstallMethodEnum.MANUAL_LOCAL:
        // Manual local install
        if (verbose) {
          console.log('Installing via manual local install...');
        }

        const home = os.homedir();
        const installDir = path.join(home, '.local', 'share', 'synpick');
        const localBin = path.join(home, '.local', 'bin');

        // Create directories
        await fsPromises.mkdir(installDir, { recursive: true });
        await fsPromises.mkdir(localBin, { recursive: true });

        // Download and install via npm to install directory
        const npmLocalResult = runCommand(
          'npm',
          ['install', '-g', '--prefix', installDir, 'synpick'],
          {
            verbose,
          }
        );

        await npmLocalResult.then(async res => {
          if (!res.success) {
            throw new Error(`npm install failed: ${res.stderr}`);
          }

          // Create symlink
          const execPath = path.join(
            installDir,
            'lib',
            'node_modules',
            'synpick',
            'dist',
            'cli',
            'index.js'
          );
          const linkPath = path.join(localBin, 'synpick');

          // Remove existing link
          try {
            await fsPromises.unlink(linkPath);
          } catch {
            // Ignore if doesn't exist
          }

          // Create new symlink
          await fsPromises.symlink(execPath, linkPath, 'file');
          await fsPromises.chmod(execPath, 0o755);

          result.installedPath = execPath;
          binPath = localBin;
        });

        // Update PATH
        if (!skipPathUpdate && !isPathInPath(localBin)) {
          const pathResult = await addToPathIfNotExists(localBin, { verbose });
          result.pathUpdated = pathResult.pathAdded;
          result.pathConfigFile = pathResult.configFiles[0];
        }
        break;
    }

    result.binPath = binPath;

    // Verify installation
    const verifyResult = await verifyInstallation(method);

    if (!verifyResult.success) {
      throw new Error(verifyResult.error || 'Verification failed');
    }

    result.success = true;
    result.version = verifyResult.version;

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Uninstall function
 */
export async function uninstallSynpick(
  options: { verbose?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  const { verbose = false } = options;

  try {
    // Try npm uninstall first
    const npmResult = await runCommand('npm', ['uninstall', '-g', 'synpick'], { verbose });

    // If npm uninstall fails, try manual cleanup
    if (!npmResult.success) {
      if (verbose) {
        console.log('npm uninstall failed, trying manual cleanup...');
      }

      const home = os.homedir();

      // Remove local installation
      const installDir = path.join(home, '.local', 'share', 'synpick');
      const localBin = path.join(home, '.local', 'bin', 'synpick');

      try {
        await fsPromises.rm(installDir, { recursive: true, force: true });
      } catch {
        // Ignore errors
      }

      try {
        await fsPromises.unlink(localBin);
      } catch {
        // Ignore errors
      }

      // Clean up PATH entries
      const { configFile } = getShellInfo();
      try {
        let config = await fsPromises.readFile(configFile, 'utf-8');
        const guardStart = '# SynPick PATH configuration';
        const guardEnd = '# End SynPick PATH configuration';

        if (config.includes(guardStart) && config.includes(guardEnd)) {
          const beforeGuard = config.substring(0, config.indexOf(guardStart));
          const afterGuard = config.substring(config.indexOf(guardEnd) + guardEnd.length);
          config = `${beforeGuard.trim()}\n${afterGuard.trim()}\n`;
          await fsPromises.writeFile(configFile, config.trim() + '\n', 'utf-8');
          if (verbose) {
            console.log(`Cleaned up PATH entries in ${configFile}`);
          }
        }
      } catch {
        // Ignore errors
      }

      // Clean up config
      const configDir = path.join(home, '.config', 'synpick');
      try {
        await fsPromises.rm(configDir, { recursive: true, force: true });
      } catch {
        // Ignore errors
      }

      // Clean up npm cache
      const npmLocal = path.join(home, '.npm-local');
      try {
        const npmModules = path.join(npmLocal, 'lib', 'node_modules', 'synpick');
        await fsPromises.rm(npmModules, { recursive: true, force: true });
      } catch {
        // Ignore errors
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
