#!/bin/bash

# Synclaude Installation Script
# One-line installer: curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synpick/main/scripts/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default installation directory
INSTALL_DIR="$HOME/.local/share/synpick"
BIN_DIR="$HOME/.local/bin"
REPO_URL="https://github.com/jeffersonwarrior/synpick"
# Specify version to install from GitHub releases
# Read from version.txt if available in the source directory, otherwise use default
if [ -f "$(dirname "$0")/version.txt" ]; then
    SYNCLAUDE_VERSION="${SYNCLAUDE_VERSION:-$(cat "$(dirname "$0")/version.txt" | tr -d '[:space:]')}"
elif [ -f "version.txt" ]; then
    SYNCLAUDE_VERSION="${SYNCLAUDE_VERSION:-$(cat version.txt | tr -d '[:space:]')}"
else
    SYNCLAUDE_VERSION="${SYNCLAUDE_VERSION:-1.6.1}"
fi
# Use GitHub releases instead of main branch to get specific version
TARBALL_URL="https://github.com/jeffersonwarrior/synpick/archive/refs/tags/v${SYNCLAUDE_VERSION}.tar.gz"

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

# Clean up old synpick installations from NVM and other locations
cleanup_old_installations() {
    info "Cleaning up old synpick installations..."

    local found_old=0

    # Remove from NVM versions
    if [ -d "$HOME/.nvm" ]; then
        for NVM_DIR in "$HOME/.nvm/versions/node"/*/lib/node_modules/synpick; do
            if [ -d "$NVM_DIR" ]; then
                info "Removing NVM installation: $NVM_DIR"
                rm -rf "$NVM_DIR" || true
                found_old=1
            fi
        done
        for SYMLINK in "$HOME/.nvm/versions/node"/*/bin/synpick; do
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
            "$NPM_PREFIX/lib/node_modules/synpick" \
            "$NPM_PREFIX/bin/synpick"
        do
            if [ -e "$DIR" ]; then
                info "Removing npm global: $DIR"
                rm -rf "$DIR" 2>/dev/null || true
                found_old=1
            fi
        done
    fi

    # Remove from common local bin directories
    for BIN_DIR_TO_CLEAN in \
        "$HOME/.local/bin/synpick" \
        "$HOME/.npm-local/bin/synpick" \
        "/usr/local/bin/synpick" \
        "/usr/bin/synpick"
    do
        if [ -e "$BIN_DIR_TO_CLEAN" ]; then
            info "Removing from bin dir: $BIN_DIR_TO_CLEAN"
            rm -f "$BIN_DIR_TO_CLEAN" 2>/dev/null || sudo rm -f "$BIN_DIR_TO_CLEAN" 2>/dev/null || true
            found_old=1
        fi
    done

    # Find and remove all synpick executables from PATH directories
    IFS=':' read -ra PATHDirs <<< "$PATH"
    for PDIR in "${PATHDirs[@]}"; do
        if [ -e "$PDIR/synpick" ]; then
            info "Found synpick in PATH: $PDIR/synpick"
            rm -f "$PDIR/synpick" 2>/dev/null || sudo rm -f "$PDIR/synpick" 2>/dev/null || true
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
        info "Removed old synpick installations"
    else
        info "No old installations found"
    fi

    return 0
}

# Add PATH entry to shell config
add_path_entry() {
    local config_file="$1"
    local bin_dir="$2"
    local shell_type="$3"

    # Remove old entries first
    sed -i '/# Synclaude PATH configuration/,/# End Synclaude PATH configuration/d' "$config_file" 2>/dev/null || true

    # Add newline if file doesn't end with one
    if [ -s "$config_file" ] && [ "$(tail -c 1 "$config_file" | wc -l)" -eq 0 ]; then
        echo "" >> "$config_file"
    fi

    # Add PATH entry with proper shell syntax
    case "$shell_type" in
        fish)
            echo "" >> "$config_file"
            echo "# Synclaude PATH configuration" >> "$config_file"
            echo "set -gx PATH $bin_dir \$PATH" >> "$config_file"
            echo "# End Synclaude PATH configuration" >> "$config_file"
            ;;
        *)
            echo "" >> "$config_file"
            echo "# Synclaude PATH configuration" >> "$config_file"
            echo "export PATH=\"$bin_dir:\$PATH\"" >> "$config_file"
            echo "# End Synclaude PATH configuration" >> "$config_file"
            ;;
    esac
}

# Install synpick package
install_package() {
    progress

    # Determine if we can install globally without sudo
    NPM_GLOBAL_INSTALL=false
    NPM_CAN_INSTALL_USER=false

    # Test if we can install globally without sudo
    if npm config get prefix | grep -q "^$HOME\|^/home"; then
        NPM_CAN_INSTALL_USER=true
        info "Using user-level npm installation"
    elif npm ls -g synpick >/dev/null 2>&1 || [ -w "$(npm config get prefix)" ]; then
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
            info "Installing synpick from local directory: $(pwd)"
            progress

            NPM_PREFIX=$(npm config get prefix)
            NPM_GLOBAL_DIR="$NPM_PREFIX/lib/node_modules/synpick"
            NPM_BIN_DIR="$NPM_PREFIX/bin"

            # Remove any existing installation
            rm -rf "$NPM_GLOBAL_DIR"
            rm -f "$NPM_BIN_DIR/synpick"

            info "Installing dependencies..."
            progress
            # Build from source in current directory
            if npm install --silent >/dev/null 2>&1 && npm run build >/dev/null 2>&1; then
                progress
                # Copy everything to global location
                cp -r "$(pwd)" "$NPM_GLOBAL_DIR"

                # Create symlink in bin
                ln -sf "$NPM_GLOBAL_DIR/dist/cli/index.js" "$NPM_BIN_DIR/synpick"

                # Set executable permissions
                chmod +x "$NPM_GLOBAL_DIR/dist/cli/index.js"
                chmod +x "$NPM_BIN_DIR/synpick"

                progress
                NPM_GLOBAL_INSTALL=true
                info "Package installed from local directory"
            else
                error "Failed to build synpick from local directory"
                exit 1
            fi
        else
            # Try npm registry first, then fallback to building from source
            info "Installing synpick package from GitHub..."
            progress

            # For development/direct installation, build from source first
            # Fallback to registry if source build fails
            info "Downloading from source repository..."
            rm -rf "$INSTALL_DIR"
            mkdir -p "$INSTALL_DIR"

            # Download and extract
            cd "$INSTALL_DIR"
            DOWNLOAD_SUCCESS=false

            # Try GitHub tarball first
            if command_exists curl; then
                if curl -sL "$TARBALL_URL" | tar -xz --strip-components=1 >/dev/null 2>&1; then
                    progress
                    DOWNLOAD_SUCCESS=true
                else
                    warn "Failed to download version $SYNCLAUDE_VERSION from GitHub, trying main branch..."
                fi
            elif command_exists wget; then
                if wget -qO- "$TARBALL_URL" | tar -xz --strip-components=1 >/dev/null 2>&1; then
                    progress
                    DOWNLOAD_SUCCESS=true
                else
                    warn "Failed to download version $SYNCLAUDE_VERSION from GitHub, trying main branch..."
                fi
            fi

            # Fallback: download from main branch if version specific failed
            if [ "$DOWNLOAD_SUCCESS" = false ]; then
                MAIN_TARBALL_URL="https://github.com/jeffersonwarrior/synpick/archive/refs/heads/main.tar.gz"
                if command_exists curl; then
                    if curl -sL "$MAIN_TARBALL_URL" | tar -xz --strip-components=1 >/dev/null 2>&1; then
                        progress
                        DOWNLOAD_SUCCESS=true
                        info "Downloaded from main branch"
                    else
                        error "Failed to download from GitHub"
                        exit 1
                    fi
                elif command_exists wget; then
                    if wget -qO- "$MAIN_TARBALL_URL" | tar -xz --strip-components=1 >/dev/null 2>&1; then
                        progress
                        DOWNLOAD_SUCCESS=true
                        info "Downloaded from main branch"
                    else
                        error "Failed to download from GitHub"
                        exit 1
                    fi
                fi
            fi

            if [ "$DOWNLOAD_SUCCESS" = false ]; then
                error "Failed to download from GitHub repository"
                exit 1
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
            NPM_GLOBAL_DIR="$NPM_PREFIX/lib/node_modules/synpick"
            NPM_BIN_DIR="$NPM_PREFIX/bin"

            # Remove any existing installation
            rm -rf "$NPM_GLOBAL_DIR"
            rm -f "$NPM_BIN_DIR/synpick"

            # Copy everything to global location
            cp -r "$INSTALL_DIR" "$NPM_GLOBAL_DIR"

            # Create symlink in bin
            ln -sf "$NPM_GLOBAL_DIR/dist/cli/index.js" "$NPM_BIN_DIR/synpick" >/dev/null 2>&1

            # Set executable permissions
            chmod +x "$NPM_GLOBAL_DIR/dist/cli/index.js" >/dev/null 2>&1
            chmod +x "$NPM_BIN_DIR/synpick" >/dev/null 2>&1

            progress
            info "Installing..."
            progress
            NPM_GLOBAL_INSTALL=true
            info "Package installed from source"

            # Verify installation was successful
            if [ ! -f "$NPM_BIN_DIR/synpick" ] || [ ! -x "$NPM_BIN_DIR/synpick" ]; then
                error "Installation failed - synpick not found at $NPM_BIN_DIR/synpick"
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
        DOWNLOAD_SUCCESS=false

        # Try GitHub tarball first
        if command_exists curl; then
            if curl -sL "$TARBALL_URL" | tar -xz --strip-components=1 >/dev/null 2>&1; then
                progress
                DOWNLOAD_SUCCESS=true
            else
                warn "Failed to download version $SYNCLAUDE_VERSION from GitHub, trying main branch..."
            fi
        elif command_exists wget; then
            if wget -qO- "$TARBALL_URL" | tar -xz --strip-components=1 >/dev/null 2>&1; then
                progress
                DOWNLOAD_SUCCESS=true
            else
                warn "Failed to download version $SYNCLAUDE_VERSION from GitHub, trying main branch..."
            fi
        fi

        # Fallback: download from main branch if version specific failed
        if [ "$DOWNLOAD_SUCCESS" = false ]; then
            MAIN_TARBALL_URL="https://github.com/jeffersonwarrior/synpick/archive/refs/heads/main.tar.gz"
            if command_exists curl; then
                if curl -sL "$MAIN_TARBALL_URL" | tar -xz --strip-components=1 >/dev/null 2>&1; then
                    progress
                    DOWNLOAD_SUCCESS=true
                    info "Downloaded from main branch"
                fi
            elif command_exists wget; then
                if wget -qO- "$MAIN_TARBALL_URL" | tar -xz --strip-components=1 >/dev/null 2>&1; then
                    progress
                    DOWNLOAD_SUCCESS=true
                    info "Downloaded from main branch"
                else
                    error "Failed to download from GitHub"
                    exit 1
                fi
            fi
        fi

        if [ "$DOWNLOAD_SUCCESS" = false ]; then
            error "Failed to download from GitHub repository"
            exit 1
        fi

        # Install dependencies and build
        progress
        if npm install --silent >/dev/null 2>&1 && npm run build >/dev/null 2>&1; then
            progress
            ln -sf "$INSTALL_DIR/dist/cli/index.js" "$BIN_DIR/synpick"
            chmod +x "$BIN_DIR/synpick"
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
                    if [ -f "$HOME/.bashrc" ]; then
                        add_path_entry "$HOME/.bashrc" "$NPM_BIN_DIR" "bash"
                        SHELL_CONFIG="$HOME/.bashrc"
                    elif [ -f "$HOME/.bash_profile" ]; then
                        add_path_entry "$HOME/.bash_profile" "$NPM_BIN_DIR" "bash"
                        SHELL_CONFIG="$HOME/.bash_profile"
                    fi
                    ;;
                zsh)
                    if [ -f "$HOME/.zshrc" ]; then
                        add_path_entry "$HOME/.zshrc" "$NPM_BIN_DIR" "zsh"
                        SHELL_CONFIG="$HOME/.zshrc"
                    fi
                    ;;
                fish)
                    local FISH_CONFIG="$HOME/.config/fish/config.fish"
                    mkdir -p "$(dirname "$FISH_CONFIG")" 2>/dev/null || true
                    add_path_entry "$FISH_CONFIG" "$NPM_BIN_DIR" "fish"
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
                    if [ -f "$HOME/.bashrc" ]; then
                        add_path_entry "$HOME/.bashrc" "$BIN_DIR" "bash"
                        SHELL_CONFIG="$HOME/.bashrc"
                    elif [ -f "$HOME/.bash_profile" ]; then
                        add_path_entry "$HOME/.bash_profile" "$BIN_DIR" "bash"
                        SHELL_CONFIG="$HOME/.bash_profile"
                    fi
                    ;;
                zsh)
                    if [ -f "$HOME/.zshrc" ]; then
                        add_path_entry "$HOME/.zshrc" "$BIN_DIR" "zsh"
                        SHELL_CONFIG="$HOME/.zshrc"
                    fi
                    ;;
                fish)
                    local FISH_CONFIG="$HOME/.config/fish/config.fish"
                    mkdir -p "$(dirname "$FISH_CONFIG")" 2>/dev/null || true
                    add_path_entry "$FISH_CONFIG" "$BIN_DIR" "fish"
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

# Fix nvm prefix conflict
fix_nvm_conflict() {
    # Check if nvm is loaded
    if [ -n "$NVM_DIR" ] || command_exists nvm; then
        # Check if .npmrc has prefix or globalconfig settings that conflict with nvm
        if [ -f "$HOME/.npmrc" ]; then
            if grep -q "^prefix=" "$HOME/.npmrc" || grep -q "^globalconfig=" "$HOME/.npmrc"; then
                # Get current nvm Node.js version
                local NVM_VERSION=""
                if [ -n "$NVM_INC" ]; then
                    # Extract version from NVM_INC path (e.g., ~/.nvm/versions/node/v24.12.0/include/node)
                    NVM_VERSION=$(echo "$NVM_INC" | sed -n 's|.*versions/node/\(v[0-9.]*\)/.*|\1|p')
                elif command -v node >/dev/null 2>&1; then
                    # Fallback: try to get version from node
                    NVM_VERSION=$(node -v 2>/dev/null || echo "")
                fi

                if [ -n "$NVM_VERSION" ]; then
                    # Try to run nvm use --delete-prefix to clear the prefix conflict
                    if nvm use --delete-prefix "$NVM_VERSION" --silent >/dev/null 2>&1; then
                        info "Fixed nvm prefix conflict for version $NVM_VERSION"
                        # Update VERIFY_BIN_DIR for further steps
                        VERIFY_BIN_DIR="$(npm config get prefix)/bin"
                    elif nvm use --delete-prefix --silent >/dev/null 2>&1; then
                        info "Fixed nvm prefix conflict"
                        VERIFY_BIN_DIR="$(npm config get prefix)/bin"
                    fi
                fi
            fi
        fi
    fi
}

# Verify installation
verify_installation() {
    info "Verifying installation..."

    # Fix nvm prefix conflict before verification
    fix_nvm_conflict

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

    # Clear shell hash table before checking for synpick
    hash -r 2>/dev/null || true

    if command_exists synpick; then
        progress
        SYNCLAUDE_VERSION=$(synpick --version 2>/dev/null || echo "unknown")
        VERSION_INSTALLED="$SYNCLAUDE_VERSION"
        info "Detected version: $VERSION_INSTALLED"

        # Test that it actually works
        if ! synpick --help >/dev/null 2>&1; then
            warn "synpick --help failed, but installed version detected"
            # Don't exit on this, just warn
        fi
    else
        error "synpick command not found after installation"
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
    success "synpick installed successfully!"
    echo "Version: $VERSION_INSTALLED"

    # Set up nvm for Node.js v24.12.0 if nvm is available
    if command_exists nvm; then
        progress
        info "Configuring nvm for Node.js v24.12.0..."
        nvm use --delete-prefix v24.12.0 --silent 2>/dev/null || \
            warn "Could not set nvm to v24.12.0. Please run manually: nvm use v24.12.0"
    fi

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
        echo "synpick command location: $NPM_BIN_DIR_USED/synpick"
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
        echo "synpick command location: $BIN_DIR/synpick"
    fi

    echo ""
    echo "Getting started:"
    echo "  synpick setup    # First-time configuration"
    echo "  synpick          # Launch Claude Code"
    echo "  synpick --help   # Show all commands"
    echo ""
    echo "If you encounter issues:"
    echo "1. Restart your terminal or run: source ~/.bashrc (or your shell config)"
    echo "2. Run 'synpick doctor' for diagnostics"
}

# Main installation flow
main() {
    echo -n "Installing synpick"

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
        echo "2. Download and install the synpick package (or use local if --local)"
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
