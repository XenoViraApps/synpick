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
# Specify version to install from GitHub releases
SYNCLAUDE_VERSION="${SYNCLAUDE_VERSION:-1.6.0}"
# Use GitHub releases instead of main branch to get specific version
TARBALL_URL="https://github.com/jeffersonwarrior/synclaude/archive/refs/tags/v${SYNCLAUDE_VERSION}.tar.gz"

# Script variables
VERBOSE="${VERBOSE:-false}"
LOCAL="${LOCAL:-false}"
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
    # Flush stdout so progress is visible immediately
    if [ -n "$ZSH_VERSION" ]; then
        # Zsh flush
        builtin echo -n "" >/dev/stderr
    else
        # Bash flush
        (>&2 echo -n "")
    fi
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Clean up old synclaude installations from NVM and other locations
cleanup_old_installations() {
    info "Cleaning up old synclaude installations..."

    local found_old=0

    # Remove from NVM versions
    if [ -d "$HOME/.nvm" ]; then
        for NVM_DIR in "$HOME/.nvm/versions/node"/*/lib/node_modules/synclaude; do
            if [ -d "$NVM_DIR" ]; then
                info "Removing NVM installation: $NVM_DIR"
                rm -rf "$NVM_DIR" || true
                found_old=1
            fi
        done
        for SYMLINK in "$HOME/.nvm/versions/node"/*/bin/synclaude; do
            if [ -L "$SYMLINK" ]; then
                info "Removing NVM symlink: $SYMLINK"
                rm -f "$SYMLINK" || true
            fi
        done
    fi

    # Remove from npm global locations
    NPM_PREFIX=$(npm config get prefix 2>/dev/null || echo "")
    if [ -n "$NPM_PREFIX" ]; then
        for DIR in \
            "$NPM_PREFIX/lib/node_modules/synclaude" \
            "$NPM_PREFIX/bin/synclaude"
        do
            if [ -e "$DIR" ]; then
                info "Removing npm global: $DIR"
                rm -rf "$DIR" 2>/dev/null || true
                found_old=1
            fi
        done
    fi

    # Remove from common local bin directories
    for BIN_DIR in \
        "$HOME/.local/bin/synclaude" \
        "$HOME/.npm-local/bin/synclaude" \
        "/usr/local/bin/synclaude" \
        "/usr/bin/synclaude"
    do
        if [ -e "$BIN_DIR" ]; then
            info "Removing from bin dir: $BIN_DIR"
            rm -f "$BIN_DIR" 2>/dev/null || sudo rm -f "$BIN_DIR" 2>/dev/null || true
            found_old=1
        fi
    done

    # Find and remove all synclaude executables from PATH directories
    IFS=':' read -ra PATHDirs <<< "$PATH"
    for PDIR in "${PATHDirs[@]}"; do
        if [ -e "$PDIR/synclaude" ]; then
            info "Found synclaude in PATH: $PDIR/synclaude"
            rm -f "$PDIR/synclaude" 2>/dev/null || sudo rm -f "$PDIR/synclaude" 2>/dev/null || true
        fi
    done

    # Clear any old PATH entries in shell configs
    SED_PATTERN='/# Synclaude PATH configuration/,/# End Synclaude PATH configuration/d'
    for CONFIG in "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.zshrc" "$HOME/.config/fish/config.fish"; do
        if [ -f "$CONFIG" ]; then
            sed -i "$SED_PATTERN" "$CONFIG" 2>/dev/null || true
        fi
    done

    if [ "$found_old" = "1" ]; then
        info "Removed old synclaude installations"
    else
        info "No old installations found"
    fi

    return 0
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
        info "Using user-level npm installation"
    elif npm ls -g synclaude >/dev/null 2>&1 || [ -w "$(npm config get prefix)" ]; then
        NPM_CAN_INSTALL_USER=true
        info "Using system-level npm installation"
    fi

    if [ "$NPM_CAN_INSTALL_USER" = true ]; then
        # Clean up old installations first
        cleanup_old_installations || {
            warn "Cleanup had some issues, continuing..."
        }

        if [ "$LOCAL" = "true" ]; then
            # Local installation from current directory
            info "Installing synclaude from local directory: $(pwd)"
            progress

            NPM_PREFIX=$(npm config get prefix)
            NPM_GLOBAL_DIR="$NPM_PREFIX/lib/node_modules/synclaude"
            NPM_BIN_DIR="$NPM_PREFIX/bin"

            # Remove any existing installation
            rm -rf "$NPM_GLOBAL_DIR"
            rm -f "$NPM_BIN_DIR/synclaude"

            info "Installing dependencies..."
            progress
            # Build from source in current directory
            if npm install --silent >/dev/null 2>&1 && npm run build >/dev/null 2>&1; then
                progress
                # Copy everything to global location
                cp -r "$(pwd)" "$NPM_GLOBAL_DIR"

                # Create symlink in bin
                ln -sf "$NPM_GLOBAL_DIR/dist/cli/index.js" "$NPM_BIN_DIR/synclaude"

                # Set executable permissions
                chmod +x "$NPM_GLOBAL_DIR/dist/cli/index.js"
                chmod +x "$NPM_BIN_DIR/synclaude"

                progress
                NPM_GLOBAL_INSTALL=true
                info "Package installed from local directory"
            else
                error "Failed to build synclaude from local directory"
                exit 1
            fi
        else
            # Try npm registry first, then fallback to building from source
            info "Installing synclaude package from GitHub..."
            progress

            # For development/direct installation, build from source first
            # Fallback to registry if source build fails
            info "Downloading from source repository..."
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
            info "Installing dependencies (this may take a minute)..."
            progress
            npm install --silent >/dev/null 2>&1
            progress

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
            info "Installing..."
            progress
            NPM_GLOBAL_INSTALL=true
            info "Package installed from source"

            # If the above failed for any reason, fallback to npm registry
            if [ ! -f "$NPM_BIN_DIR/synclaude" ] || [ ! -x "$NPM_BIN_DIR/synclaude" ]; then
                warn "Source build failed, trying npm registry fallback"
                if npm install -g git+https://github.com/jeffersonwarrior/synclaude.git#main >/dev/null 2>&1; then
                    progress
                    NPM_GLOBAL_INSTALL=true
                    info "Package installed globally via git repository"
                else
                    error "Both source build and npm registry install failed"
                    exit 1
                fi
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
        # npm bin -g was removed in npm v9+, use prefix instead
        NPM_BIN_DIR="$(npm config get prefix)/bin"

        if ! echo "$PATH" | grep -q "$NPM_BIN_DIR"; then
            # Detect shell and update appropriate config file
            SHELL_NAME=$(basename "$SHELL")
            case "$SHELL_NAME" in
                bash)
                    local BASHRC="$HOME/.bashrc"
                    if [ -f "$BASHRC" ]; then
                        # Remove old synclaude PATH entries first
                        sed -i '/# Synclaude PATH configuration/,/# End Synclaude PATH configuration/d' "$BASHRC" 2>/dev/null || true
                        # Add new PATH entry with clear markers
                        cat >> "$BASHRC" << 'EOF'

# Synclaude PATH configuration
export PATH="/home/agent/.npm-local/bin:$PATH"
# End Synclaude PATH configuration
EOF
                        # Fix the hardcoded path to use actual npm bin dir
                        sed -i "s|=\"/home/agent/.npm-local/bin:\$PATH\"|=\"$NPM_BIN_DIR:\$PATH\"|" "$BASHRC"
                        SHELL_CONFIG="$BASHRC"
                    elif [ -f "$HOME/.bash_profile" ]; then
                        local BASH_PROFILE="$HOME/.bash_profile"
                        sed -i '/# Synclaude PATH configuration/,/# End Synclaude PATH configuration/d' "$BASH_PROFILE" 2>/dev/null || true
                        cat >> "$BASH_PROFILE" << 'EOF'

# Synclaude PATH configuration
export PATH="/home/agent/.npm-local/bin:$PATH"
# End Synclaude PATH configuration
EOF
                        sed -i "s|=\"/home/agent/.npm-local/bin:\$PATH\"|=\"$NPM_BIN_DIR:\$PATH\"|" "$BASH_PROFILE"
                        SHELL_CONFIG="$BASH_PROFILE"
                    fi
                    ;;
                zsh)
                    local ZSHRC="$HOME/.zshrc"
                    sed -i '/# Synclaude PATH configuration/,/# End Synclaude PATH configuration/d' "$ZSHRC" 2>/dev/null || true
                    cat >> "$ZSHRC" << 'EOF'

# Synclaude PATH configuration
export PATH="/home/agent/.npm-local/bin:$PATH"
# End Synclaude PATH configuration
EOF
                    sed -i "s|=\"/home/agent/.npm-local/bin:\$PATH\"|=\"$NPM_BIN_DIR:\$PATH\"|" "$ZSHRC"
                    SHELL_CONFIG="$ZSHRC"
                    ;;
                fish)
                    local FISH_CONFIG="$HOME/.config/fish/config.fish"
                    mkdir -p "$(dirname "$FISH_CONFIG")" 2>/dev/null || true
                    sed -i '/# Synclaude PATH configuration/,/# End Synclaude PATH configuration/d' "$FISH_CONFIG" 2>/dev/null || true
                    cat >> "$FISH_CONFIG" << 'EOF'

# Synclaude PATH configuration
set -gx PATH /home/agent/.npm-local/bin $PATH
# End Synclaude PATH configuration
EOF
                    sed -i "s|/home/agent/.npm-local/bin|$NPM_BIN_DIR|" "$FISH_CONFIG"
                    SHELL_CONFIG="$FISH_CONFIG"
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
                    local BASHRC="$HOME/.bashrc"
                    if [ -f "$BASHRC" ]; then
                        sed -i '/# Synclaude PATH configuration/,/# End Synclaude PATH configuration/d' "$BASHRC" 2>/dev/null || true
                        cat >> "$BASHRC" << 'EOF'

# Synclaude PATH configuration
export PATH="/home/agent/.local/bin:$PATH"
# End Synclaude PATH configuration
EOF
                        sed -i "s|=\"/home/agent/.local/bin:\$PATH\"|=\"$BIN_DIR:\$PATH\"|" "$BASHRC"
                        SHELL_CONFIG="$BASHRC"
                    elif [ -f "$HOME/.bash_profile" ]; then
                        local BASH_PROFILE="$HOME/.bash_profile"
                        sed -i '/# Synclaude PATH configuration/,/# End Synclaude PATH configuration/d' "$BASH_PROFILE" 2>/dev/null || true
                        cat >> "$BASH_PROFILE" << 'EOF'

# Synclaude PATH configuration
export PATH="/home/agent/.local/bin:$PATH"
# End Synclaude PATH configuration
EOF
                        sed -i "s|=\"/home/agent/.local/bin:\$PATH\"|=\"$BIN_DIR:\$PATH\"|" "$BASH_PROFILE"
                        SHELL_CONFIG="$BASH_PROFILE"
                    fi
                    ;;
                zsh)
                    local ZSHRC="$HOME/.zshrc"
                    sed -i '/# Synclaude PATH configuration/,/# End Synclaude PATH configuration/d' "$ZSHRC" 2>/dev/null || true
                    cat >> "$ZSHRC" << 'EOF'

# Synclaude PATH configuration
export PATH="/home/agent/.local/bin:$PATH"
# End Synclaude PATH configuration
EOF
                    sed -i "s|=\"/home/agent/.local/bin:\$PATH\"|=\"$BIN_DIR:\$PATH\"|" "$ZSHRC"
                    SHELL_CONFIG="$ZSHRC"
                    ;;
                fish)
                    local FISH_CONFIG="$HOME/.config/fish/config.fish"
                    mkdir -p "$(dirname "$FISH_CONFIG")" 2>/dev/null || true
                    sed -i '/# Synclaude PATH configuration/,/# End Synclaude PATH configuration/d' "$FISH_CONFIG" 2>/dev/null || true
                    cat >> "$FISH_CONFIG" << 'EOF'

# Synclaude PATH configuration
set -gx PATH /home/agent/.local/bin $PATH
# End Synclaude PATH configuration
EOF
                    sed -i "s|/home/agent/.local/bin|$BIN_DIR|" "$FISH_CONFIG"
                    SHELL_CONFIG="$FISH_CONFIG"
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
    info "Verifying installation..."

    # Determine which bin directory to use for verification
    if [ "$NPM_GLOBAL_INSTALL" = "true" ]; then
        # npm bin -g was removed in npm v9+, use prefix instead
        VERIFY_BIN_DIR="$(npm config get prefix)/bin"
    else
        VERIFY_BIN_DIR="$BIN_DIR"
    fi

    # For manual install where PATH not yet updated, prepend our bin directory
    if [ "$PATH_IN_PATH" != "true" ]; then
        export PATH="$VERIFY_BIN_DIR:$PATH"
    fi

    # Clear shell hash table before checking for synclaude
    hash -r 2>/dev/null || true

    if command_exists synclaude; then
        progress
        SYNCLAUDE_VERSION=$(synclaude --version 2>/dev/null || echo "unknown")
        VERSION_INSTALLED="$SYNCLAUDE_VERSION"
        info "Detected version: $VERSION_INSTALLED"

        # Test that it actually works
        if ! synclaude --help >/dev/null 2>&1; then
            warn "synclaude --help failed, but installed version detected"
            # Don't exit on this, just warn
        fi
    else
        error "synclaude command not found after installation"
        error "Bin directory: $VERIFY_BIN_DIR"
        error "Current PATH: $PATH"
        error ""
        error "Please add $VERIFY_BIN_DIR to your PATH manually:"
        error "  export PATH=\"\$PATH:$VERIFY_BIN_DIR\""
        exit 1
    fi
}

# Show final message
show_final_message() {
    echo ""
    success "synclaude installed successfully!"
    echo "Version: $VERSION_INSTALLED"

    if [ "$NPM_GLOBAL_INSTALL" = "true" ]; then
        if [ "$LOCAL" = "true" ]; then
            echo "Installation method: npm global install from local directory"
        else
            echo "Installation method: npm global install from source"
        fi
        NPM_BIN_DIR_USED=${NPM_BIN_DIR_USED:-"$(npm config get prefix)/bin"}
        if [ "$PATH_UPDATED" = "true" ]; then
            echo ""
            echo "=================================================================="
            warn "IMPORTANT: PATH was updated. Please run:"
            warn ""
            warn "  source ${SHELL_CONFIG}"
            warn ""
            warn "Or restart your terminal to use the new PATH."
            warn ""
            warn "Path added: $NPM_BIN_DIR_USED"
            warn "=================================================================="
        fi
        echo ""
        echo "synclaude command location: $NPM_BIN_DIR_USED/synclaude"
    else
        echo "Installation method: manual install"
        if [ "$PATH_UPDATED" = "true" ]; then
            echo ""
            echo "=================================================================="
            warn "IMPORTANT: PATH was updated. Please run:"
            warn ""
            warn "  source ${SHELL_CONFIG}"
            warn ""
            warn "Or restart your terminal to use the new PATH."
            warn ""
            warn "Path added: $BIN_DIR"
            warn "=================================================================="
        fi
        echo ""
        echo "synclaude command location: $BIN_DIR/synclaude"
    fi

    echo ""
    echo "Getting started:"
    echo "  synclaude setup    # First-time configuration"
    echo "  synclaude          # Launch Claude Code"
    echo "  synclaude --help   # Show all commands"
    echo ""
    echo "If you encounter issues:"
    echo "1. Restart your terminal or run: source ~/.bashrc (or your shell config)"
    echo "2. Run 'synclaude doctor' for diagnostics"
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
        echo "  --local         Install from the current directory (development mode)"
        echo ""
        echo "This script will:"
        echo "1. Check for Node.js and npm installation"
        echo "2. Download and install the synclaude package (or use local if --local)"
        echo "3. Clean up old installations"
        echo "4. Set up PATH if needed"
        echo "5. Verify the installation"
        exit 0
        ;;
    --local)
        LOCAL=true
        main
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