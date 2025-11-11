#!/bin/bash

# Synclaude Installation Script
# One-line installer: curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synclaude/main/scripts/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default installation directory
INSTALL_DIR="$HOME/.local/share/synclaude"
BIN_DIR="$HOME/.local/bin"
REPO_URL="https://github.com/jeffersonwarrior/synclaude"
TARBALL_URL="$REPO_URL/archive/main.tar.gz"

# Script variables
VERBOSE="${VERBOSE:-false}"
PATH_UPDATED="${PATH_UPDATED:-false}"
PATH_IN_PATH="${PATH_IN_PATH:-false}"
NPM_GLOBAL_INSTALL="${NPM_GLOBAL_INSTALL:-false}"
NPM_CAN_INSTALL_USER="${NPM_CAN_INSTALL_USER:-false}"
SHELL_CONFIG="${SHELL_CONFIG:-}"
VERSION_INSTALLED="${VERSION_INSTALLED:-unknown}"
NPM_BIN_DIR_USED="${NPM_BIN_DIR_USED:-}"

# Helper functions
log() {
    [ "$VERBOSE" = "true" ] && echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

progress() {
    echo -n "."
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system dependencies
check_dependencies() {
    # Check for Node.js and npm
    if ! command_exists node; then
        error "Node.js is not installed. Please install Node.js first."
        echo "Visit: https://nodejs.org/ or use your package manager:"
        echo "  macOS: brew install node"
        echo "  Windows: Download from https://nodejs.org/"
        echo "  Linux (Ubuntu/Debian): sudo apt-get install nodejs npm"
        echo "  Linux (RedHat/CentOS): sudo yum install nodejs npm"
        exit 1
    fi

    if ! command_exists npm; then
        error "npm is not installed. Please install npm first."
        echo "npm usually comes with Node.js. If not available:"
        echo "  Linux (Ubuntu/Debian): sudo apt-get install npm"
        echo "  Linux (RedHat/CentOS): sudo yum install npm"
        exit 1
    fi

    # Check for curl or wget for downloading
    if ! command_exists curl && ! command_exists wget; then
        error "Neither curl nor wget is available for downloading."
        echo "Please install one of them:"
        echo "  curl: sudo apt-get install curl (Ubuntu/Debian)"
        echo "  wget: sudo apt-get install wget (Ubuntu/Debian)"
        exit 1
    fi

 progress
}

# Create directories
create_directories() {
    progress
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$BIN_DIR"
}

# Install synclaude package
install_package() {
    progress

    # Determine if we can install globally without sudo
    NPM_GLOBAL_INSTALL=false
    NPM_CAN_INSTALL_USER=false

    # Test if we can install globally without sudo
    if npm config get prefix | grep -q "^$HOME\|^/home"; then
        NPM_CAN_INSTALL_USER=true
        log "Using user-level npm installation"
    elif npm ls -g synclaude >/dev/null 2>&1 || [ -w "$(npm config get prefix)" ]; then
        NPM_CAN_INSTALL_USER=true
        log "Using system-level npm installation"
    fi

    if [ "$NPM_CAN_INSTALL_USER" = true ]; then
        # Try npm registry first, then fallback to building from source
        log "Installing synclaude package"
        progress

        # For development/direct installation, build from source first
        # Fallback to registry if source build fails
        log "Building from source"
        rm -rf "$INSTALL_DIR"
        mkdir -p "$INSTALL_DIR"

        # Download and extract
        cd "$INSTALL_DIR"
        if command_exists curl; then
            if curl -sL "$TARBALL_URL" | tar -xz --strip-components=1 >/dev/null 2>&1; then
                progress
            else
                error "Failed to download repository with curl"
                exit 1
            fi
        elif command_exists wget; then
            if wget -qO- "$TARBALL_URL" | tar -xz --strip-components=1 >/dev/null 2>&1; then
                progress
            else
                error "Failed to download repository with wget"
                exit 1
            fi
        fi

        # Install dependencies
        npm install --silent >/dev/null 2>&1

        # Since npm install -g might fail due to build scripts,
        # let's use a more robust manual approach
        # Create the package structure in global node_modules
        NPM_PREFIX=$(npm config get prefix)
        NPM_GLOBAL_DIR="$NPM_PREFIX/lib/node_modules/synclaude"
        NPM_BIN_DIR="$NPM_PREFIX/bin"

        # Remove any existing installation
        rm -rf "$NPM_GLOBAL_DIR"
        rm -f "$NPM_BIN_DIR/synclaude"

        # Copy everything to global location
        cp -r "$INSTALL_DIR" "$NPM_GLOBAL_DIR"

        # Create symlink in bin
        ln -sf "$NPM_GLOBAL_DIR/dist/cli/index.js" "$NPM_BIN_DIR/synclaude" >/dev/null 2>&1

        # Set executable permissions
        chmod +x "$NPM_GLOBAL_DIR/dist/cli/index.js" >/dev/null 2>&1
        chmod +x "$NPM_BIN_DIR/synclaude" >/dev/null 2>&1

        progress
        NPM_GLOBAL_INSTALL=true
        log "Package installed manually via built-from-source method"

        # If the above failed for any reason, fallback to npm registry
        if [ ! -f "$NPM_BIN_DIR/synclaude" ] || [ ! -x "$NPM_BIN_DIR/synclaude" ]; then
            log "Source build failed, trying npm registry fallback"
            if npm install -g synclaude >/dev/null 2>&1; then
                progress
                NPM_GLOBAL_INSTALL=true
                log "Package installed globally via npm (fallback)"
            else
                error "Both source build and npm registry install failed"
                exit 1
            fi
        fi
    else
        # Fallback to manual installation (requires PATH setup)
        log "Falling back to manual installation"
        progress

        # Clean up any existing installation
        rm -rf "$INSTALL_DIR"
        mkdir -p "$INSTALL_DIR"

        # Download and extract repository
        cd "$INSTALL_DIR"
        progress
        if command_exists curl; then
            if curl -sL "$TARBALL_URL" | tar -xz --strip-components=1 >/dev/null 2>&1; then
                progress
            else
                error "Failed to download repository with curl"
                exit 1
            fi
        elif command_exists wget; then
            if wget -qO- "$TARBALL_URL" | tar -xz --strip-components=1 >/dev/null 2>&1; then
                progress
            else
                error "Failed to download repository with wget"
                exit 1
            fi
        fi

        # Install dependencies and build
        progress
        if npm install --silent >/dev/null 2>&1 && npm run build >/dev/null 2>&1; then
            progress
            ln -sf "$INSTALL_DIR/dist/cli/index.js" "$BIN_DIR/synclaude"
            chmod +x "$BIN_DIR/synclaude"
        else
            error "Failed to install dependencies or build project"
            exit 1
        fi
    fi
}

# Update PATH
update_path() {
    # Only update PATH for manual installations or if npm global install failed
    if [ "$NPM_GLOBAL_INSTALL" = "true" ]; then
        # For npm global install, determine the actual npm bin directory
        NPM_BIN_DIR=$(npm bin -g 2>/dev/null)
        if [ -z "$NPM_BIN_DIR" ]; then
            NPM_BIN_DIR=$(dirname $(dirname $(npm config get prefix)))/bin
        fi

        if ! echo "$PATH" | grep -q "$NPM_BIN_DIR"; then
            # Detect shell and update appropriate config file
            SHELL_NAME=$(basename "$SHELL")
            case "$SHELL_NAME" in
                bash)
                    if [ -f "$HOME/.bashrc" ]; then
                        echo "export PATH=\"\$PATH:$NPM_BIN_DIR\"" >> "$HOME/.bashrc"
                        SHELL_CONFIG="$HOME/.bashrc"
                    elif [ -f "$HOME/.bash_profile" ]; then
                        echo "export PATH=\"\$PATH:$NPM_BIN_DIR\"" >> "$HOME/.bash_profile"
                        SHELL_CONFIG="$HOME/.bash_profile"
                    fi
                    ;;
                zsh)
                    echo "export PATH=\"\$PATH:$NPM_BIN_DIR\"" >> "$HOME/.zshrc"
                    SHELL_CONFIG="$HOME/.zshrc"
                    ;;
                fish)
                    echo "set -gx PATH \$PATH $NPM_BIN_DIR" >> "$HOME/.config/fish/config.fish"
                    SHELL_CONFIG="$HOME/.config/fish/config.fish"
                    ;;
                *)
                    warn "Unsupported shell: $SHELL_NAME"
                    warn "Please add $NPM_BIN_DIR to your PATH manually"
                    SHELL_CONFIG=""
                    ;;
            esac

            if [ -n "$SHELL_CONFIG" ]; then
                PATH_UPDATED=true
                NPM_BIN_DIR_USED="$NPM_BIN_DIR"
            fi
        else
            PATH_IN_PATH=true
            NPM_BIN_DIR_USED="$NPM_BIN_DIR"
        fi
    else
        # For manual installation, use our bin directory
        if ! echo "$PATH" | grep -q "$BIN_DIR"; then
            # Detect shell and update appropriate config file
            SHELL_NAME=$(basename "$SHELL")
            case "$SHELL_NAME" in
                bash)
                    if [ -f "$HOME/.bashrc" ]; then
                        echo "export PATH=\"\$PATH:$BIN_DIR\"" >> "$HOME/.bashrc"
                        SHELL_CONFIG="$HOME/.bashrc"
                    elif [ -f "$HOME/.bash_profile" ]; then
                        echo "export PATH=\"\$PATH:$BIN_DIR\"" >> "$HOME/.bash_profile"
                        SHELL_CONFIG="$HOME/.bash_profile"
                    fi
                    ;;
                zsh)
                    echo "export PATH=\"\$PATH:$BIN_DIR\"" >> "$HOME/.zshrc"
                    SHELL_CONFIG="$HOME/.zshrc"
                    ;;
                fish)
                    echo "set -gx PATH \$PATH $BIN_DIR" >> "$HOME/.config/fish/config.fish"
                    SHELL_CONFIG="$HOME/.config/fish/config.fish"
                    ;;
                *)
                    warn "Unsupported shell: $SHELL_NAME"
                    warn "Please add $BIN_DIR to your PATH manually"
                    SHELL_CONFIG=""
                    ;;
            esac

            if [ -n "$SHELL_CONFIG" ]; then
                PATH_UPDATED=true
            fi
        else
            PATH_IN_PATH=true
        fi
    fi
}

# Verify installation
verify_installation() {
    # For npm global install, the command should be available immediately
    # For manual install, we need to add the bin directory to PATH temporarily for verification
    if [ "$NPM_GLOBAL_INSTALL" != "true" ] && [ "$PATH_IN_PATH" != "true" ]; then
        export PATH="$PATH:$BIN_DIR"
    fi

    if command_exists synclaude; then
        progress
        SYNCLAUDE_VERSION=$(synclaude --version 2>/dev/null || echo "unknown")
        VERSION_INSTALLED="$SYNCLAUDE_VERSION"

        # Test that it actually works
        if ! synclaude --help >/dev/null 2>&1; then
            error "synclaude command found but failed to execute correctly"
            error "This may indicate a module resolution issue"
            exit 1
        fi
    else
        if [ "$NPM_GLOBAL_INSTALL" = "true" ]; then
            NPM_BIN_DIR=$(npm bin -g 2>/dev/null)
            if [ -z "$NPM_BIN_DIR" ]; then
                NPM_BIN_DIR=$(dirname $(dirname $(npm config get prefix)))/bin
            fi
            error "synclaude command not found after installation"
            error "Please ensure $NPM_BIN_DIR is in your PATH"
        else
            error "synclaude command not found after installation"
            error "Please ensure $BIN_DIR is in your PATH"
        fi
        exit 1
    fi
}

# Show final message
show_final_message() {
    echo ""
    echo "✓ synclaude installed successfully!"
    echo "Version: $VERSION_INSTALLED"

    if [ "$NPM_GLOBAL_INSTALL" = "true" ]; then
        echo "Installation method: npm global install (recommended)"
        NPM_BIN_DIR_USED=${NPM_BIN_DIR_USED:-$(npm bin -g 2>/dev/null)}
        if [ "$PATH_UPDATED" = "true" ]; then
            echo "⚠️  Please restart your terminal or run 'source $SHELL_CONFIG'"
            echo "   Added $NPM_BIN_DIR_USED to PATH"
        fi
    else
        echo "Installation method: manual install"
        if [ "$PATH_UPDATED" = "true" ]; then
            echo "⚠️  Please restart your terminal or run 'source $SHELL_CONFIG'"
            echo "   Added $BIN_DIR to PATH"
        fi
    fi

    echo ""
    echo "Run 'synclaude setup' to configure, then 'synclaude' to start."
    echo ""
    echo "If you encounter MODULE_NOT_FOUND errors:"
    echo "1. Make sure the bin directory is in your PATH"
    echo "2. Try restarting your terminal"
    echo "3. Run 'synclaude doctor' for diagnostics"
}

# Main installation flow
main() {
    echo -n "Installing synclaude"

    # Pre-installation checks
    check_dependencies
    create_directories

    # Installation
    install_package
    update_path

    # Verification
    verify_installation

    echo ""
    show_final_message
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Synclaude Installation Script"
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h      Show this help message"
        echo "  --verbose, -v   Show detailed installation output"
        echo ""
        echo "This script will:"
        echo "1. Check for Node.js and npm installation"
        echo "2. Download and install the synclaude package"
        echo "3. Set up PATH if needed"
        echo "4. Verify the installation"
        exit 0
        ;;
    --verbose|-v)
        VERBOSE=true
        main
        ;;
    "")
        main
        ;;
    *)
        error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac