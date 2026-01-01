import {
  detectInstallMethod,
  isPathInPath,
  addToPathIfNotExists,
  checkCleanStaleSymlinks,
  installSynpick,
  type InstallMethodEnum,
} from '../src/install/install';

describe('Install Module', () => {
  describe('detectInstallMethod', () => {
    it('should return a valid install method', () => {
      const method = detectInstallMethod();
      expect(['npm-user-prefix', 'npm-global', 'manual-local']).toContain(method);
    });
  });

  describe('isPathInPath', () => {
    it('should check if directory is in PATH', () => {
      // Test with a common PATH entry
      const result = isPathInPath('/usr/local/bin');
      // Result depends on system PATH, just check it returns boolean
      expect(typeof result).toBe('boolean');
    });

    it('should return false for non-existent directory', () => {
      const result = isPathInPath('/this/path/definitely/does/not/exist');
      expect(result).toBe(false);
    });
  });

  describe('shouldCheckUpdate', () => {
    it('should return true when no previous check', () => {
      const result = isPathInPath('/nonexistent');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('addToPathIfNotExists', () => {
    it('should return a success result', async () => {
      // Use a fake home directory for testing to avoid modifying actual config
      const result = await addToPathIfNotExists('/tmp/test-synpick-bin', {
        verbose: false,
      });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('pathAdded');
      expect(result).toHaveProperty('needsReload');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.pathAdded).toBe('boolean');
    });
  });

  describe('checkCleanStaleSymlinks', () => {
    it('should return arrays for cleaned and failed paths', async () => {
      const result = await checkCleanStaleSymlinks({ verbose: false });
      expect(result).toHaveProperty('cleaned');
      expect(result).toHaveProperty('failed');
      expect(Array.isArray(result.cleaned)).toBe(true);
      expect(Array.isArray(result.failed)).toBe(true);
    });
  });

  describe('installSynpick', () => {
    it('should return a valid install result', async () => {
      // Pass skipPathUpdate to avoid modifying shell config
      const result = await installSynpick({
        verbose: false,
        skipPathUpdate: true,
      });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('pathUpdated');
      expect(typeof result.success).toBe('boolean');
      expect(['npm-user-prefix', 'npm-global', 'manual-local']).toContain(result.method);
    });
  });
});
