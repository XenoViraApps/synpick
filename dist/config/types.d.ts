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
}, "strip", z.ZodTypeAny, {
    apiKey: string;
    baseUrl: string;
    anthropicBaseUrl: string;
    modelsApiUrl: string;
    cacheDurationHours: number;
    selectedModel: string;
    selectedThinkingModel: string;
    firstRunCompleted: boolean;
}, {
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
    anthropicBaseUrl?: string | undefined;
    modelsApiUrl?: string | undefined;
    cacheDurationHours?: number | undefined;
    selectedModel?: string | undefined;
    selectedThinkingModel?: string | undefined;
    firstRunCompleted?: boolean | undefined;
}>;
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