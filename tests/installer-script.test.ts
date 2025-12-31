/**
 * Installer Script Tests
 *
 * Tests for the shell installer script at scripts/install.sh
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

// Path to install script - tests run from project root
const INSTALL_SCRIPT = process.cwd() + '/scripts/install.sh';

describe('Installer Script', () => {
  describe('Script Validation', () => {
    it('should exist', () => {
      expect(existsSync(INSTALL_SCRIPT)).toBe(true);
    });

    it('should have valid content', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('# Synclaude Installation Script');
      expect(scriptContent).toBeTruthy();
    });

    it('should contain nvm use --delete-prefix command', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('nvm use --delete-prefix');
      expect(scriptContent).toContain('v24.12.0');
    });

    it('should not contain npm registry fallback', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      // Should not have plain npm install -g synpick (without GitHub URL)
      const hasNpmRegistryFallback = scriptContent.includes('npm install -g synpick\n') ||
        scriptContent.includes('npm install -g synpick"') ||
        scriptContent.includes('npm install -g synpick;');
      expect(hasNpmRegistryFallback).toBe(false);
    });

    it('should have GitHub main branch fallback', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('main.tar.gz');
    });

    it('should have proper error handling for download failures', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('Failed to download from GitHub');
    });
  });

  describe('--help argument', () => {
    it('should display help message', () => {
      const output = execSync(`bash "${INSTALL_SCRIPT}" --help`, {
        encoding: 'utf8',
        timeout: 5000,
      });
      expect(output).toContain('Synclaude Installation Script');
      expect(output).toContain('Usage:');
      expect(output).toContain('--help');
      expect(output).toContain('--verbose');
      expect(output).toContain('--local');
    });

    it('should exit with code 0 when --help is provided', () => {
      try {
        execSync(`bash "${INSTALL_SCRIPT}" --help`);
        expect(true).toBe(true);
      } catch (error: any) {
        expect(error.status).not.toBeDefined();
      }
    });
  });

  describe('Script Functions', () => {
    it('should define main function', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/main\(\)\s*\{/);
    });

    it('should define verify_installation function', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/verify_installation\(\)\s*\{/);
    });

    it('should define install_package function', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/install_package\(\)\s*\{/);
    });

    it('should define update_path function', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/update_path\(\)\s*\{/);
    });

    it('should define show_final_message function', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/show_final_message\(\)\s*\{/);
    });

    it('should define check_dependencies function', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/check_dependencies\(\)\s*\{/);
    });

    it('should define fix_nvm_conflict function', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/fix_nvm_conflict\(\)\s*\{/);
    });
  });

  describe('Environment Variables', () => {
    it('should respect VERBOSE environment variable', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('VERBOSE=');
    });

    it('should respect LOCAL environment variable', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('LOCAL=');
    });

    it('should respect SYNCLAUDE_VERSION environment variable', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('SYNCLAUDE_VERSION=');
    });
  });

  describe('Download Logic', () => {
    it('should use curl if available', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/command_exists curl/);
    });

    it('should fallback to wget if curl not available', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/command_exists wget/);
    });

    it('should download from version-specific tarball first', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('TARBALL_URL=');
      expect(scriptContent).toContain('${SYNCLAUDE_VERSION}');
    });

    it('should fallback to main branch if version tag fails', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('MAIN_TARBALL_URL=');
      expect(scriptContent).toContain('DOWNLOAD_SUCCESS=false');
    });
  });

  describe('Cleanup Functions', () => {
    it('should define cleanup_old_installations function', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/cleanup_old_installations\(\)\s*\{/);
    });

    it('should clean up NVM installations', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('.nvm');
    });

    it('should clean up npm global installations', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('lib/node_modules/synpick');
    });

    it('should clean up symlinks', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('rm -f');
    });
  });

  describe('Path Configuration', () => {
    it('should define add_path_entry function', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/add_path_entry\(\)\s*\{/);
    });

    it('should handle bash configuration', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('.bashrc');
      expect(scriptContent).toContain('.bash_profile');
    });

    it('should handle zsh configuration', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('.zshrc');
    });

    it('should handle fish configuration', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('config.fish');
    });
  });

  describe('Node Version Configuration', () => {
    it('should configure nvm to use v24.12.0 at the end', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('nvm use --delete-prefix v24.12.0 --silent');
    });

    it('should only call nvm use when nvm command exists', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/command_exists nvm/);
    });

    it('should handle nvm use failure gracefully', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('Could not set nvm to v24.12.0');
    });
  });

  describe('Error Messages', () => {
    it('should have defined helper functions for output', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/^log\(\)/m);
      expect(scriptContent).toMatch(/^warn\(\)/m);
      expect(scriptContent).toMatch(/^error\(\)/m);
      expect(scriptContent).toMatch(/^success\(\)/m);
      expect(scriptContent).toMatch(/^info\(\)/m);
    });

    it('should define progress function', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/^progress\(\)/m);
    });
  });

  describe('Script Structure', () => {
    it('should set -e for error handling', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain('set -e');
    });

    it('should define colors for output', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toContain("RED='");
      expect(scriptContent).toContain("GREEN='");
      expect(scriptContent).toContain("YELLOW='");
      expect(scriptContent).toContain("BLUE='");
    });

    it('should have a case statement for handling arguments', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/^case "\$\{1:-\}" in/m);
    });

    it('should call main at the end for default execution', () => {
      const scriptContent = readFileSync(INSTALL_SCRIPT, 'utf8');
      expect(scriptContent).toMatch(/^\s*main/m);
    });
  });
});
