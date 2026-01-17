import { z } from 'zod';

/**
 * Schema for synpick full-install configuration
 * This file defines the expected format of synpick-config.yaml
 */

export const ClaudeCodeConfigSchema = z.object({
  version: z.string().optional().describe('Claude Code version (default: latest)'),
  channel: z.enum(['stable', 'beta', 'canary']).default('stable').describe('Release channel'),
});

export const McpServerPackageSchema = z.object({
  type: z.enum(['npm', 'go', 'python', 'builtin', 'command']).describe('Package type'),
  package: z.string().optional().describe('Package name (for npm/go/python)'),
  url: z.string().url().optional().describe('URL for custom installations'),
  command: z.string().optional().describe('Command to run'),
  args: z.array(z.string()).default([]).describe('Command arguments'),
  env: z.record(z.string(), z.string()).optional().describe('Environment variables'),
  enabled: z.boolean().default(true).describe('Whether this server is enabled'),
});

export type McpServerConfig = z.infer<typeof McpServerPackageSchema>;

export const McpConfigSchema = z.record(z.string(), McpServerPackageSchema);

export const ContinuousConfigSchema = z.object({
  enabled: z.boolean().default(false),
  version: z.string().optional().describe('Continuous Claude version'),
});

export const ClaudeSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  disableTelemetry: z.boolean().optional().describe('Disable Claude Code telemetry'),
  autoUpdate: z.boolean().optional().describe('Auto-update Claude Code'),
  maxHistorySize: z.number().int().positive().optional().describe('Max history file size in MB'),
});

export const InstallScriptSchema = z.object({
  name: z.string().describe('Script name/description'),
  path: z.string().describe('Path to script file relative to config root'),
  shell: z.enum(['bash', 'sh', 'zsh', 'fish', 'node', 'python']).default('bash'),
  required: z.boolean().default(false).describe('Fail full-install if this script fails'),
  description: z.string().optional().describe('User-friendly description'),
});

export const SkillConfigSchema = z.object({
  name: z.string().describe('Skill identifier'),
  url: z.string().url().optional().describe('URL to fetch skill from'),
  file: z.string().optional().describe('Local file path'),
  enabled: z.boolean().default(true),
});

export type SkillConfig = z.infer<typeof SkillConfigSchema>;

/**
 * Main configuration schema for synpick full-install
 */
export const SynpickConfigSchema = z.object({
  version: z
    .union([z.string(), z.number()])
    .transform(v => String(v))
    .default('1')
    .describe('Config file format version'),
  name: z.string().describe('Configuration name'),
  description: z.string().optional().describe('Configuration description'),

  Claude: ClaudeCodeConfigSchema.optional(),
  mcp: McpConfigSchema.optional(),
  continuous: ContinuousConfigSchema.optional(),
  settings: ClaudeSettingsSchema.optional(),

  skills: z
    .union([z.array(SkillConfigSchema), z.null()])
    .default([])
    .optional(),

  scripts: z
    .union([z.array(InstallScriptSchema), z.null()])
    .default([])
    .optional(),

  // Synpick-specific settings
  synpick: z
    .object({
      model: z.string().optional().describe('Default model for synpick'),
      apiKey: z.string().optional().describe('Synthetic API key'),
      systemPrompt: z.string().optional().describe('System prompt'),
    })
    .optional(),
});

export type SynpickConfig = z.infer<typeof SynpickConfigSchema>;

export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodError | null = null
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}
