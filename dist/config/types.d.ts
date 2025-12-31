import { z } from 'zod';
export declare const AppConfigSchema: z.ZodObject<{
    apiKey: z.ZodDefault<z.ZodString>;
    baseUrl: z.ZodDefault<z.ZodString>;
    anthropicBaseUrl: z.ZodDefault<z.ZodString>;
    modelsApiUrl: z.ZodDefault<z.ZodString>;
    cacheDurationHours: z.ZodDefault<z.ZodNumber>;
    selectedModel: z.ZodDefault<z.ZodString>;
    selectedThinkingModel: z.ZodDefault<z.ZodString>;
    firstRunCompleted: z.ZodDefault<z.ZodBoolean>;
    autoUpdateClaudeCode: z.ZodDefault<z.ZodBoolean>;
    claudeCodeUpdateCheckInterval: z.ZodDefault<z.ZodNumber>;
    lastClaudeCodeUpdateCheck: z.ZodOptional<z.ZodString>;
    maxTokenSize: z.ZodDefault<z.ZodNumber>;
    apiTimeoutMs: z.ZodDefault<z.ZodNumber>;
    commandTimeoutMs: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export declare class ConfigValidationError extends Error {
    cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
export declare class ConfigLoadError extends Error {
    cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
export declare class ConfigSaveError extends Error {
    cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
//# sourceMappingURL=types.d.ts.map