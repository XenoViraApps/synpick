import { z } from 'zod';

export const AppConfigSchema = z.object({
  apiKey: z.string().default('').describe('Synthetic API key'),
  baseUrl: z.string().default('https://api.synthetic.new').describe('Synthetic API base URL'),
  anthropicBaseUrl: z
    .string()
    .default('https://api.synthetic.new/anthropic')
    .describe('Anthropic-compatible API endpoint'),
  modelsApiUrl: z
    .string()
    .default('https://api.synthetic.new/openai/v1/models')
    .describe('OpenAI-compatible models endpoint'),
  cacheDurationHours: z
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24)
    .describe('Model cache duration in hours'),
  selectedModel: z.string().default('').describe('Last selected model'),
  selectedThinkingModel: z.string().default('').describe('Last selected thinking model'),
  firstRunCompleted: z
    .boolean()
    .default(false)
    .describe('Whether first-time setup has been completed'),
  autoUpdateClaudeCode: z
    .boolean()
    .default(true)
    .describe('Whether to automatically check for Claude Code updates'),
  claudeCodeUpdateCheckInterval: z
    .number()
    .int()
    .min(1)
    .max(720)
    .default(24)
    .describe('Hours between Claude Code update checks'),
  lastClaudeCodeUpdateCheck: z
    .string()
    .optional()
    .describe('Last Claude Code update check timestamp (ISO 8601)'),
  maxTokenSize: z
    .number()
    .int()
    .min(1000)
    .max(200000)
    .default(128000)
    .describe('Max token size for Claude Code context window'),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public override cause?: unknown
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export class ConfigLoadError extends Error {
  constructor(
    message: string,
    public override cause?: unknown
  ) {
    super(message);
    this.name = 'ConfigLoadError';
  }
}

export class ConfigSaveError extends Error {
  constructor(
    message: string,
    public override cause?: unknown
  ) {
    super(message);
    this.name = 'ConfigSaveError';
  }
}
