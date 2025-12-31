#!/usr/bin/env node

// This wrapper uses ts-node to run the TypeScript source files in CommonJS mode
const { spawn } = require('child_process');
const path = require('path');

// Get the path to the ts-node executable
const tsNodePath = path.join(__dirname, '..', 'node_modules', '.bin', 'ts-node');
const cliPath = path.join(__dirname, '..', 'src', 'cli', 'index.ts');

// Environment to force CommonJS compilation
const env = {
  ...process.env,
  TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'commonjs' }),
  TS_NODE_PROJECT: path.join(__dirname, '..', 'tsconfig.json'),
};

// Spawn ts-node with the CLI
const child = spawn(process.execPath, [tsNodePath, cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('Failed to start synclaude:', err);
  process.exit(1);
});
