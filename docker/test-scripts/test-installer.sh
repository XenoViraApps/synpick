#!/bin/bash

# Test script for the one-line installer
set -e

echo "=== Synclaude One-Line Installer Test ==="
echo "Working Directory: $(pwd)"
echo "Node Version: $(node --version)"
echo "NPM Version: $(npm --version)"
echo "User: $(whoami)"
echo "Home Directory: $HOME"
echo "PATH: $PATH"
echo ""

# Clean up any existing installation
echo "Step 1: Cleaning up any existing installation..."
rm -rf ~/.local/share/synclaude 2>/dev/null || true
rm -f ~/.local/bin/synclaude 2>/dev/null || true
npm uninstall -g synclaude 2>/dev/null || true
echo "✓ Cleanup completed"
echo ""

echo "Step 2: Testing local installer script..."
if [ -f "scripts/install.sh" ]; then
    echo "Running local installer script..."
    chmod +x scripts/install.sh
    bash scripts/install.sh --verbose
    echo "✓ Local installer completed"
else
    echo "Local installer script not found, skipping..."
fi
echo ""

echo "Step 3: Testing installed synclaude..."
which synclaude || echo "❌ 'which synclaude' failed"
synclaude --version || echo "❌ synclaude --version failed"
echo ""

echo "Step 4: Testing manual installation (simulating installer steps)..."
INSTALL_DIR="$HOME/.local/share/synclaude-manual"
BIN_DIR="$HOME/.local/bin"

echo "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"

echo "Copying source files..."
cp -r /home/testuser/workspace/synclaude/* "$INSTALL_DIR/"
cd "$INSTALL_DIR"

echo "Installing dependencies..."
npm install

echo "Building project..."
npm run build

echo "Creating symlink..."
ln -sf "$INSTALL_DIR/dist/cli/index.js" "$BIN_DIR/synclaude"
chmod +x "$BIN_DIR/synclaude"

echo "Testing manual installation..."
export PATH="$BIN_DIR:$PATH"
synclaude --version || echo "❌ Manual installation test failed"
echo ""

echo "=== One-Line Installer Test Complete ==="