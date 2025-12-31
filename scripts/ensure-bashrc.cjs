#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const lifecycleEvent = process.env.npm_lifecycle_event || '';
const isGlobalInstall = process.env.npm_config_global === 'true';
const shouldRun = isGlobalInstall || lifecycleEvent === 'postlink';

if (!shouldRun || process.platform === 'win32') {
  process.exit(0);
}

const homeDir = os.homedir();
if (!homeDir) {
  process.exit(0);
}

// Try to get npm global bin directory
let npmBinDir = '';
try {
  npmBinDir = execSync('npm bin -g', { encoding: 'utf-8', stdio: 'pipe' }).trim();
} catch {
  // Fallback to calculation
  try {
    const npmPrefix = execSync('npm config get prefix', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    npmBinDir = path.join(npmPrefix, 'bin');
  } catch {
    // Try user-local installation
    npmBinDir = path.join(homeDir, '.npm-local', 'bin');
  }
}

// Use npmBinDir if available, otherwise fall back to ~/.local/bin
const binDir = fs.existsSync(path.join(npmBinDir, 'synpick')) ? npmBinDir : path.join(homeDir, '.local', 'bin');

const blockStart = '# Synclaude PATH configuration';
const blockEnd = '# End Synclaude PATH configuration';
const block = `${blockStart}
export PATH="$PATH:${binDir}"
${blockEnd}`;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockRegex = new RegExp(`${escapeRegExp(blockStart)}[\\s\\S]*?${escapeRegExp(blockEnd)}`, 'm');

const logPrefix = '[synpick setup]';

// Detect shell and config file
const shellEnv = process.env.SHELL || '';
const shellName = path.basename(shellEnv);

function getConfigFile() {
  if (shellName === 'zsh') {
    return path.join(homeDir, '.zshrc');
  }
  if (shellName === 'fish') {
    const fishConfig = process.env.XDG_CONFIG_HOME
      ? path.join(process.env.XDG_CONFIG_HOME, 'fish', 'config.fish')
      : path.join(homeDir, '.config', 'fish', 'config.fish');
    return fishConfig;
  }
  // Default to bashrc or bash_profile
  const bashProfile = path.join(homeDir, '.bash_profile');
  const bashrc = path.join(homeDir, '.bashrc');
  if (fs.existsSync(bashProfile)) {
    return bashProfile;
  }
  return bashrc;
}

function getFishPathBlock() {
  return `${blockStart}
set -gx PATH $PATH ${binDir}
${blockEnd}`;
}

function updatePathInConfig() {
  const configFile = getConfigFile();

  // For fish shell, use different syntax
  if (shellName === 'fish') {
    return updateFishConfig(configFile);
  }

  return updateShellConfig(configFile, block);
}

function updateFishConfig(configFile, newBlock) {
  try {
    // Ensure directory exists
    fs.mkdirSync(path.dirname(configFile), { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });

    let configContent = '';
    try {
      configContent = fs.readFileSync(configFile, 'utf8');
    } catch (readError) {
      if (readError.code !== 'ENOENT') {
        throw readError;
      }
    }

    const fishBlock = getFishPathBlock();
    const fishBlockRegex = new RegExp(
      `${escapeRegExp(blockStart)}[\\s\\S]*?${escapeRegExp(blockEnd)}`,
      'm'
    );

    let updatedContent;
    if (fishBlockRegex.test(configContent)) {
      updatedContent = configContent.replace(fishBlockRegex, fishBlock);
    } else {
      const separator = configContent.length > 0 && !configContent.endsWith('\n') ? '\n' : '';
      updatedContent = `${configContent}${separator}${fishBlock}\n`;
    }

    if (updatedContent !== configContent) {
      fs.writeFileSync(configFile, updatedContent, 'utf8');
      console.log(`${logPrefix} Updated ${configFile} with Synclaude PATH guard.`);
      return true;
    } else {
      console.log(`${logPrefix} ${configFile} already contains Synclaude PATH guard.`);
      return false;
    }
  } catch (error) {
    console.warn(`${logPrefix} Unable to update ${configFile}: ${error.message}`);
    return false;
  }
}

function updateShellConfig(configFile, newBlock) {
  try {
    // Ensure directory and bin directory exist
    fs.mkdirSync(path.dirname(configFile), { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });

    let bashrcContent = '';
    try {
      bashrcContent = fs.readFileSync(configFile, 'utf8');
    } catch (readError) {
      if (readError.code !== 'ENOENT') {
        throw readError;
      }
    }

    // Check if directory is already in PATH
    const isPathInPath = bashrcContent.includes(binDir) ||
      process.env.PATH.split(path.delimiter).some(p => path.resolve(p) === path.resolve(binDir));

    if (isPathInPath) {
      console.log(`${logPrefix} ${binDir} already in PATH.`);
      console.log(`${logPrefix} ${configFile} configuration skipped.`);
      return false;
    }

    let updatedContent;
    if (blockRegex.test(bashrcContent)) {
      // Replace existing block
      updatedContent = bashrcContent.replace(blockRegex, newBlock);
    } else if (bashrcContent.trim().length === 0) {
      updatedContent = `${newBlock}\n`;
    } else {
      const separator = bashrcContent.length > 0 && !bashrcContent.endsWith('\n') ? '\n' : '';
      updatedContent = `${bashrcContent}${separator}${newBlock}\n`;
    }

    if (updatedContent !== bashrcContent) {
      fs.writeFileSync(configFile, updatedContent, 'utf8');
      console.log(`${logPrefix} Updated ${configFile} with Synclaude PATH guard (${shellName}).`);
      console.log(`${logPrefix} Added ${binDir} to PATH.`);
      return true;
    } else {
      console.log(`${logPrefix} ${configFile} already contains Synclaude PATH guard.`);
      return false;
    }
  } catch (error) {
    console.warn(`${logPrefix} Unable to update ${configFile}: ${error.message}`);
    return false;
  }
}

function main() {
  const wasUpdated = updatePathInConfig();

  if (wasUpdated) {
    console.log(`${logPrefix} Please restart your terminal or source your config file.`);
  }

  // Display information
  console.log(`${logPrefix} Bin directory: ${binDir}`);
  console.log(`${logPrefix} Shell: ${shellName || 'unknown'}`);
  console.log(`${logPrefix} Config file: ${getConfigFile()}`);
}

main();
