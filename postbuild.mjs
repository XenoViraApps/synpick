#!/usr/bin/env node
// Post-build script to add .js extensions to imports for ESM compatibility

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveImportToJsExtension(importPath, currentFileDir) {
  // If import path already has .js extension, return as-is
  if (importPath.endsWith('.js')) {
    return importPath;
  }

  // Try with .js extension first
  let withJsExt = `${importPath}.js`;
  let fullPath = path.resolve(currentFileDir, withJsExt);
  let exists = await fileExists(fullPath);

  console.log(`  Checking: ${importPath} + .js -> ${fullPath} exists: ${exists}`);

  if (exists) {
    return withJsExt;
  }

  // Try as directory import with index.js
  let indexPath = path.join(importPath, 'index.js');
  let fullIndexPath = path.resolve(currentFileDir, indexPath);
  exists = await fileExists(fullIndexPath);

  console.log(`  Checking: ${importPath}/index.js -> ${fullIndexPath} exists: ${exists}`);

  if (exists) {
    return indexPath;
  }

  // Fallback: just add .js extension (Node will handle the error if wrong)
  return withJsExt;
}

async function processFile(filePath) {
  let content = await fs.readFile(filePath, 'utf-8');
  const fileDir = path.dirname(filePath);
  const processedImports = new Set();

  console.log(`Processing: ${filePath} (dir: ${fileDir})`);

  // Process static imports
  const importRegex = /from\s+['"](\.{1,2}\/[^'"\s]+)['"]/g;
  let match;
  let importReplacements = [];

  // First, collect all imports to replace
  while ((match = importRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const importPath = match[1];

    if (/\.(js|mjs|json|cjs)$/.test(importPath)) {
      continue;
    }

    if (processedImports.has(importPath)) {
      continue;
    }
    processedImports.add(importPath);

    console.log(`  Found import: ${importPath}`);
    const resolved = await resolveImportToJsExtension(importPath, fileDir);
    console.log(`  Resolved to: ${resolved}`);

    importReplacements.push({ from: fullMatch, to: `from '${resolved}'` });
  }

  // Apply all replacements
  for (const replacement of importReplacements) {
    content = content.replace(replacement.from, replacement.to);
  }

  // Process dynamic imports (same logic)
  const dynamicImportRegex = /import\s*\(\s*['"](\.{1,2}\/[^'"\s]+)['"]\s*\)/g;
  importReplacements = [];

  while ((match = dynamicImportRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const importPath = match[1];

    if (/\.(js|mjs|json|cjs)$/.test(importPath)) {
      continue;
    }

    if (processedImports.has(importPath)) {
      continue;
    }
    processedImports.add(importPath);

    const resolved = await resolveImportToJsExtension(importPath, fileDir);
    importReplacements.push({ from: fullMatch, to: `import('${resolved}')` });
  }

  for (const replacement of importReplacements) {
    content = content.replace(replacement.from, replacement.to);
  }

  await fs.writeFile(filePath, content, 'utf-8');
}

async function processDir(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await processDir(fullPath);
    } else if (entry.name.endsWith('.js')) {
      await processFile(fullPath);
    }
  }
}

// Process the dist directory
await processDir(distDir);
console.log('Post-build: Added .js extensions to imports');
