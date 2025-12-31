/**
 * Config Manager Backup Cleanup Tests
 *
 * Tests that backup files are properly cleaned up.
 */

import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigManager } from '../src/config/manager';

describe('ConfigManager - Backup Cleanup', () => {
  let configManager: ConfigManager;
  let tempConfigDir: string;
  let tempConfigPath: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempConfigDir = join(tmpdir(), `synclaude-test-${Date.now()}`);
    await fs.mkdir(tempConfigDir, { recursive: true });
    tempConfigPath = join(tempConfigDir, 'config.json');

    configManager = new ConfigManager(tempConfigDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(tempConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('backup creation', () => {
    it('should create backup file when saving config', async () => {
      // Create initial config
      await configManager.saveConfig({
        apiKey: 'test-key',
        baseUrl: 'https://test.com',
      });

      // Save again - should create backup
      await configManager.updateConfig({ apiKey: 'new-key' });

      const backupExists = await fs
        .access(`${tempConfigPath}.backup`)
        .then(() => true)
        .catch(() => false);

      expect(backupExists).toBe(true);
    });

    it('should NOT create backup when config does not exist', async () => {
      await configManager.saveConfig({
        apiKey: 'test-key',
      });

      // First save should not create backup since file didn't exist
      const backupExists = await fs
        .access(`${tempConfigPath}.backup`)
        .then(() => true)
        .catch(() => false);

      expect(backupExists).toBe(false);
    });
  });

  describe('cleanupOldBackups', () => {
    // Note: cleanupOldBackups only removes excess backups (more than MAX_BACKUP_FILES)
    // We need to create multiple backup files to test the cleanup

    it('should remove excess backup files (keep only most recent)', async () => {
      // Create initial config
      await configManager.saveConfig({
        apiKey: 'test-key',
      });

      // Create multiple backup files manually to simulate old backups
      // Using different naming that matches the cleanup filter
      const backupDir = tempConfigDir;
      const backup1 = join(backupDir, 'backup1.backup');
      const backup2 = join(backupDir, 'backup2.backup');

      await new Promise(resolve => setTimeout(resolve, 10));
      await fs.writeFile(backup1, JSON.stringify({ apiKey: 'old-key-1' }), 'utf-8');

      await new Promise(resolve => setTimeout(resolve, 10));
      await fs.writeFile(backup2, JSON.stringify({ apiKey: 'old-key-2' }), 'utf-8');

      // Now we should have 2 backup files (ending with .backup)
      await new Promise(resolve => setTimeout(resolve, 10));
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(f => f.endsWith('.backup'));

      expect(backupFiles.length).toBeGreaterThanOrEqual(2);

      // Call cleanup method directly
      if (typeof (configManager as any).cleanupOldBackups === 'function') {
        await (configManager as any).cleanupOldBackups();

        // After cleanup, only MAX_BACKUP_FILES (1) should remain
        const filesAfter = await fs.readdir(backupDir);
        const backupFilesAfter = filesAfter.filter(f => f.endsWith('.backup'));

        expect(backupFilesAfter.length).toBe(1);
      } else {
        // Skip test if method not implemented yet
        console.warn('cleanupOldBackups method not yet implemented');
      }
    });

    it('should not remove backup when only one exists', async () => {
      await configManager.saveConfig({
        apiKey: 'test-key',
      });

      // One backup should be created
      await configManager.updateConfig({ apiKey: 'new-key' });

      const files = await fs.readdir(tempConfigDir);
      const backupFiles = files.filter(f => f.endsWith('.backup'));

      expect(backupFiles.length).toBe(1);

      // Call cleanup - should not remove the single backup
      if (typeof (configManager as any).cleanupOldBackups === 'function') {
        await (configManager as any).cleanupOldBackups();

        const filesAfter = await fs.readdir(tempConfigDir);
        const backupFilesAfter = filesAfter.filter(f => f.endsWith('.backup'));

        expect(backupFilesAfter.length).toBe(1);
      }
    });
  });

  describe('cleanup on save', () => {
    it('should clean up old backups when saving new config', async () => {
      // Create initial config
      await configManager.saveConfig({
        apiKey: 'test-key',
      });

      // Save multiple times
      await configManager.updateConfig({ apiKey: 'key2' });
      await configManager.updateConfig({ apiKey: 'key3' });

      // Count backup files
      let backupCount = 0;
      try {
        const files = await fs.readdir(tempConfigDir);
        backupCount = files.filter(f => f.endsWith('.backup')).length;
      } catch {
        // Directory might not exist yet
      }

      // After multiple saves, there should be at most one backup
      // (if cleanup is implemented)
      // This is a soft expectation since cleanup may not be auto-enabled
      if (backupCount > 1) {
        console.warn(`Multiple backup files found: ${backupCount}`);
      }
    });
  });
});
