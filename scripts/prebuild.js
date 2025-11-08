#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Checking if build is needed...');

const distDir = path.join(__dirname, '../dist');

// Check if dist directory exists and has files
try {
  const files = fs.readdirSync(distDir);
  const hasJsFiles = files.some(file => file.endsWith('.js'));

  if (hasJsFiles) {
    console.log('✅ Build artifacts already exist, skipping build');
    process.exit(0);
  }
} catch (error) {
  // dist directory doesn't exist, need to build
  console.log('ℹ️ No build artifacts found, building...');
}

try {
  // Try different ways to run TypeScript compiler
  const commands = [
    'npx tsc',
    'node_modules/.bin/tsc',
    'tsc'
  ];

  for (const cmd of commands) {
    try {
      console.log(`🔨 Running: ${cmd}`);
      execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      console.log('✅ Build successful');
      process.exit(0);
    } catch (e) {
      console.log(`⚠️ ${cmd} failed, trying next method...`);
    }
  }

  console.error('❌ All build methods failed');
  console.log('💡 You may need to install TypeScript: npm install -g typescript');
  process.exit(1);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}