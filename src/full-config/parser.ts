import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as yamlParse } from 'yaml';
import { SynpickConfigSchema, SynpickConfig, ConfigValidationError } from './schema.js';

/**
 * Possible sources for configuration
 */
export type ConfigSource = {
  type: 'file' | 'github';
  path: string;
  owner?: string;
  repo?: string;
  branch?: string;
  pathInRepo?: string;
};

/**
 * Parse a YAML configuration file
 */
export function parseConfig(yamlContent: string): SynpickConfig {
  try {
    const parsed = yamlParse(yamlContent) as unknown;
    const result = SynpickConfigSchema.safeParse(parsed);

    if (!result.success) {
      throw new ConfigValidationError('Invalid configuration format', result.error);
    }

    return result.data;
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw error;
    }
    throw new ConfigValidationError(
      `Failed to parse configuration: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read and parse a local config file
 */
export function readConfigFile(configPath: string): SynpickConfig {
  if (!existsSync(configPath)) {
    throw new ConfigValidationError(`Config file not found: ${configPath}`);
  }

  const content = readFileSync(configPath, 'utf-8');
  return parseConfig(content);
}

/**
 * Find config file in a directory
 * Searches for: synpick-config.yaml, .synpick/config.yaml, .github/synpick/config.yaml
 */
export function findConfigInDirectory(dirPath: string): string | null {
  const possiblePaths = [
    join(dirPath, 'synpick-config.yaml'),
    join(dirPath, '.synpick', 'config.yaml'),
    join(dirPath, '.github', 'synpick', 'config.yaml'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Get config file content from GitHub
 * This uses the GitHub API to fetch raw file content
 */
export async function fetchConfigFromGitHub(
  owner: string,
  repo: string,
  branch: string = 'main',
  path: string = 'synpick-config.yaml'
): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new ConfigValidationError(
      `Failed to fetch config from GitHub: ${response.statusText} (${url})`
    );
  }

  return await response.text();
}

/**
 * Parse config from GitHub
 */
export async function parseConfigFromGitHub(
  owner: string,
  repo: string,
  branch?: string,
  path?: string
): Promise<SynpickConfig> {
  const content = await fetchConfigFromGitHub(owner, repo, branch, path);
  return parseConfig(content);
}
