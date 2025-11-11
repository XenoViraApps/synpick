#!/usr/bin/env node

// Set up module resolution before anything else
const path = require('path');
const fs = require('fs');

// Find the package directory by looking for package.json
let packageDir = __dirname;
while (packageDir !== '/' && !fs.existsSync(path.join(packageDir, 'package.json'))) {
  packageDir = path.dirname(packageDir);
}

// Additional search for npm global installations
if (packageDir === '/') {
  // Try common npm global installation directories
  const npmPrefix = process.env.npm_config_prefix || '';
  const homeDir = require('os').homedir();

  const possiblePrefixes = [
    npmPrefix,
    path.join(homeDir, '.local'),
    path.join(homeDir, '.npm-global'),
    '/usr/local',
    '/usr'
  ];

  for (const prefix of possiblePrefixes) {
    const possiblePackageDir = path.join(prefix, 'lib', 'node_modules', 'synclaude');
    if (fs.existsSync(path.join(possiblePackageDir, 'package.json'))) {
      packageDir = possiblePackageDir;
      break;
    }
  }
}

// Add all possible node_modules directories to module search paths
const addNodeModulesToPath = (baseDir) => {
  const nodeModulesPath = path.join(baseDir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    const Module = require('module');

    // Add to global paths if not already there
    if (!Module.globalPaths.includes(nodeModulesPath)) {
      Module.globalPaths.unshift(nodeModulesPath);
    }

    // Add to current module paths if not already there
    if (!module.paths.includes(nodeModulesPath)) {
      module.paths.unshift(nodeModulesPath);
    }
  }
};

// Add node_modules from current directory and all parent directories
let currentDir = packageDir;
while (currentDir !== path.dirname(currentDir)) {
  addNodeModulesToPath(currentDir);
  currentDir = path.dirname(currentDir);
}

// Set NODE_PATH environment variable
const nodeModulesPath = path.join(packageDir, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  process.env.NODE_PATH = process.env.NODE_PATH
    ? `${nodeModulesPath}${path.delimiter}${process.env.NODE_PATH}`
    : nodeModulesPath;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const commands_1 = require("./commands");
async function main() {
    try {
        const program = (0, commands_1.createProgram)();
        // Parse command line arguments
        program.parse(process.argv);
    }
    catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
// Run main function
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map