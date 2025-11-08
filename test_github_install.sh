#!/bin/bash

# Synclaude Installation Test Script
# Tests the GitHub release installation method

echo "🧪 Testing Synclaude GitHub Release Installation..."

# Clean up any existing installation
echo "🧹 Cleaning up previous installation..."
npm uninstall -g synclaude 2>/dev/null || true
rm -rf ~/.npm/_cacache/tmp/git-* 2>/dev/null || true

# Test GitHub release installation
echo "📦 Installing from GitHub Release (simulated)..."
echo "Note: This simulates: npm install -g https://github.com/jeffersonwarrior/synclaude/releases/latest/download/synclaude.tgz"

# For now, test using local tarball
echo "📦 Using local tarball as test..."
npm install -g ./synclaude-1.4.5.tgz

# Test the installation
echo "🧪 Testing installation..."

if command -v synclaude &> /dev/null; then
    echo "✅ SUCCESS: synclaude command is available!"

    echo "📋 Testing basic functionality..."
    synclaude --version
    synclaude --help | head -10

    echo "🎉 Installation test PASSED!"
    echo ""
    echo "📝 Installation commands for users:"
    echo "npm install -g https://github.com/jeffersonwarrior/synclaude/releases/latest/download/synclaude.tgz"
    echo ""
    echo "Alternative (GitHub releases page):"
    echo "1. Visit: https://github.com/jeffersonwarrior/synclaude/releases"
    echo "2. Download latest synclaude-X.Y.Z.tgz"
    echo "3. Run: npm install -g synclaude-X.Y.Z.tgz"

    exit 0
else
    echo "❌ FAILED: synclaude command not found after installation"
    echo "🔍 Debugging info:"

    # Check what npm installed
    if npm list -g | grep -q synclaude; then
        echo "📦 Package installed but command missing - symlink issue"
        npm list -g synclaude
        ls -la $(npm config get prefix)/bin/ | grep -i synclaude || echo "No binary found in npm bin directory"
    else
        echo "❌ Package not installed at all"
        npm list -g
    fi

    exit 1
fi