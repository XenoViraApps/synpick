#!/bin/bash

# Synclaude macOS Installation Script
# Handles macOS Homebrew permission issues automatically

set -e

echo "🍎 Synclaude macOS Installer"
echo "=================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Node.js and npm are installed
if ! command_exists npm; then
    echo "❌ npm is not installed. Please install Node.js first:"
    echo "   brew install node"
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Check if synpick is already installed
if command_exists synpick; then
    echo "⚠️  Synclaude is already installed. Uninstalling first..."
    npm uninstall -g synpick 2>/dev/null || true
fi

echo "📦 Installing Synclaude v1.6.1..."

# Try installation methods in order of preference

# Method 1: Try without sudo first
echo "🔧 Attempting installation without sudo..."
if npm install -g https://github.com/jeffersonwarrior/synpick/releases/download/v1.6.1/synpick-1.6.1.tgz 2>/dev/null; then
    echo "✅ Installation successful!"
else
    echo "⚠️  Permission denied. Trying alternative methods..."

    # Method 2: Try with sudo
    echo "🔧 Attempting installation with sudo..."
    if sudo npm install -g https://github.com/jeffersonwarrior/synpick/releases/download/v1.6.1/synpick-1.6.1.tgz; then
        echo "✅ Installation successful with sudo!"
    else
        echo "⚠️  Sudo installation failed. Setting up user npm directory..."

        # Method 3: Configure npm user directory
        echo "🔧 Setting up npm global directory for user..."
        mkdir -p ~/.npm-global
        npm config set prefix '~/.npm-global'

        # Add to PATH if not already there
        if ! grep -q 'npm-global/bin' ~/.zshrc 2>/dev/null; then
            echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
            echo "📝 Added npm-global to PATH in ~/.zshrc"
        fi

        if ! grep -q 'npm-global/bin' ~/.bash_profile 2>/dev/null; then
            echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bash_profile
            echo "📝 Added npm-global to PATH in ~/.bash_profile"
        fi

        # Source the appropriate shell config
        if [[ "$SHELL" == *"zsh"* ]]; then
            source ~/.zshrc
        else
            source ~/.bash_profile
        fi

        # Try installation again
        echo "🔧 Attempting installation with user npm directory..."
        if npm install -g https://github.com/jeffersonwarrior/synpick/releases/download/v1.6.1/synpick-1.6.1.tgz; then
            echo "✅ Installation successful with user directory!"
        else
            echo "❌ All installation methods failed."
            echo "💡 Manual installation instructions:"
            echo "   1. Download: https://github.com/jeffersonwarrior/synpick/releases/download/v1.6.1/synpick-1.6.1.tgz"
            echo "   2. Extract and run: sudo npm install -g ."
            exit 1
        fi
    fi
fi

# Verify installation
if command_exists synpick; then
    echo ""
    echo "🎉 Synclaude installed successfully!"
    echo "📋 Version: $(synpick --version)"
    echo ""
    echo "🚀 Try these commands:"
    echo "   synpick --help"
    echo "   synpick dangerously"
    echo "   synpick dangerous    # This typo now works!"
    echo "   synpick config show"
    echo ""
    echo "🔧 If you see 'command not found', restart your terminal or run:"
    if [[ "$SHELL" == *"zsh"* ]]; then
        echo "   source ~/.zshrc"
    else
        echo "   source ~/.bash_profile"
    fi
else
    echo "❌ Installation verification failed. Please restart your terminal and try 'synpick --version'."
fi