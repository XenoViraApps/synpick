#!/bin/bash

# Test script for global npm installation
set -e

echo "=== Synclaude Global Installation Test ==="
echo "Working Directory: $(pwd)"
echo "Node Version: $(node --version)"
echo "NPM Version: $(npm --version)"
echo "User: $(whoami)"
echo "Home Directory: $HOME"
echo "PATH: $PATH"
echo ""

# Clean up any existing installation
echo "Step 1: Cleaning up any existing installation..."
npm uninstall -g synclaude 2>/dev/null || true
rm -rf ~/.local/share/synclaude 2>/dev/null || true
rm -f ~/.local/bin/synclaude 2>/dev/null || true
echo "✓ Cleanup completed"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found in current directory"
    exit 1
fi

echo "Step 2: Installing project dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

echo "Step 3: Building project..."
npm run build
echo "✓ Project built"
echo ""

echo "Step 4: Installing globally with npm install -g ."
echo "Command: npm install -g ."
npm install -g .
echo "✓ Global installation completed"
echo ""

echo "Step 5: Checking installation location..."
echo " npm global prefix: $(npm config get prefix)"
echo " npm global bin: $(npm config get prefix)/bin"
ls -la $(npm config get prefix)/bin/ | grep synclaude || echo "synclaude not found in global bin"
echo ""

echo "Step 6: Testing synclaude command..."
which synclaude || echo "❌ 'which synclaude' failed"
echo "Direct execution: $(npm config get prefix)/bin/synclaude --version || echo '❌ Direct execution failed'"
echo ""

echo "Step 7: Testing with full PATH..."
export PATH="$(npm config get prefix)/bin:$PATH"
echo "PATH updated: $PATH"
synclaude --version || echo "❌ synclaude --version failed"
echo ""

echo "Step 8: Checking for 'ink' dependency issue..."
echo "Testing node directly:"
node -e "console.log('Testing require chalk...'); try { require('chalk'); console.log('✓ chalk OK'); } catch(e) { console.log('❌ chalk failed:', e.message); }"
node -e "console.log('Testing require commander...'); try { require('commander'); console.log('✓ commander OK'); } catch(e) { console.log('❌ commander failed:', e.message); }"
node -e "console.log('Testing require ink...'); try { require('ink'); console.log('✓ ink OK'); } catch(e) { console.log('❌ ink failed:', e.message); }"
node -e "console.log('Testing require react...'); try { require('react'); console.log('✓ react OK'); } catch(e) { console.log('❌ react failed:', e.message); }"
echo ""

echo "Step 9: Executing the compiled CLI file directly..."
echo "File: $(pwd)/dist/cli/index.js"
node dist/cli/index.js --version || echo "❌ Direct execution of CLI failed"
echo ""

echo "=== Global Installation Test Complete ==="