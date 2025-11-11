#!/bin/bash

# Debug script to inspect module resolution
set -e

echo "=== Module Resolution Debug ==="
echo "Working Directory: $(pwd)"
echo "Node Version: $(node --version)"
echo "NPM Version: $(npm --version)"
echo "User: $(whoami)"
echo "Node Modules Paths:"
node -e "console.log(require('module').Module._nodeModulePaths(process.cwd()))"
echo ""

echo "Global npm prefix: $(npm config get prefix)"
echo "Global npm paths:"
node -e "console.log(require('module').Module._nodeModulePaths('$(npm config get prefix)/bin'))"
echo ""

echo "=== Checking package dependencies ==="
echo "Local package.json dependencies:"
grep -A 10 '"dependencies"' package.json
echo ""

echo "Local node_modules (synclaude):"
if [ -d "node_modules" ]; then
    echo "✓ Local node_modules exists"
    echo "Key dependencies:"
    for pkg in chalk commander ink react zod axios; do
        if [ -d "node_modules/$pkg" ]; then
            echo "  ✓ $pkg installed locally"
        else
            echo "  ❌ $pkg missing locally"
        fi
    done
else
    echo "❌ Local node_modules does not exist"
fi
echo ""

echo "Global node_modules (synclaude):"
GLOBAL_PREFIX=$(npm config get prefix)
if [ -d "$GLOBAL_PREFIX/lib/node_modules/synclaude" ]; then
    echo "✓ Global synclaude package exists"
    if [ -d "$GLOBAL_PREFIX/lib/node_modules/synclaude/node_modules" ]; then
        echo "✓ Global synclaude has node_modules"
        echo "Key global dependencies:"
        for pkg in chalk commander ink react zod axios; do
            if [ -d "$GLOBAL_PREFIX/lib/node_modules/synclaude/node_modules/$pkg" ]; then
                echo "  ✓ $pkg installed globally"
            else
                echo "  ❌ $pkg missing globally"
            fi
        done
    else
        echo "❌ Global synclaude missing node_modules"
    fi
else
    echo "❌ Global synclaude package not found"
fi
echo ""

echo "=== Testing require resolution ==="
cd /home/testuser/workspace/synclaude

echo "Testing from source directory with installed deps:"
for pkg in chalk commander ink react zod axios; do
    echo -n "  $pkg: "
    node -e "try { require('$pkg'); console.log('✓ OK'); } catch(e) { console.log('❌ FAIL:', e.message); }"
done
echo ""

echo "Testing CLI file dependency resolution:"
if [ -f "dist/cli/index.js" ]; then
    echo "CLI file exists, testing execution..."
    timeout 5 node dist/cli/index.js --version 2>&1 || echo "Execution timed out or failed"
else
    echo "❌ CLI file does not exist"
fi
echo ""

echo "=== Module Resolution Debug Complete ==="