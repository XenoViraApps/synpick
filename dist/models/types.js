import { z } from 'zod';
export const ModelInfoSchema = z.object({
    id: z.string().describe('Model identifier'),
    object: z.string().default('model').describe('Object type'),
    created: z.number().optional().describe('Creation timestamp'),
    owned_by: z.string().optional().describe('Model owner'),
    provider: z.string().optional().describe('Model provider'),
    always_on: z.boolean().optional().describe('Always available'),
    hugging_face_id: z.string().optional().describe('Hugging Face model ID'),
    name: z.string().optional().describe('Model display name'),
    input_modalities: z.array(z.string()).optional().describe('Supported input modalities'),
    output_modalities: z.array(z.string()).optional().describe('Supported output modalities'),
    context_length: z.number().optional().describe('Context window size'),
    max_output_length: z.number().optional().describe('Maximum output tokens'),
    pricing: z
        .object({
        prompt: z.string().optional(),
        completion: z.string().optional(),
        image: z.string().optional(),
        request: z.string().optional(),
        input_cache_reads: z.string().optional(),
        input_cache_writes: z.string().optional(),
    })
        .optional()
        .describe('Pricing information'),
    quantization: z.string().optional().describe('Model quantization'),
    supported_sampling_parameters: z
        .array(z.string())
        .optional()
        .describe('Supported sampling parameters'),
    supported_features: z.array(z.string()).optional().describe('Supported features'),
    openrouter: z
        .object({
        slug: z.string().optional(),
    })
        .optional()
        .describe('OpenRouter metadata'),
    datacenters: z
        .array(z.object({
        country_code: z.string().optional(),
    }))
        .optional()
        .describe('Available datacenters'),
});
export class ModelValidationError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'ModelValidationError';
    }
}
export class ApiError extends Error {
    constructor(message, status, response) {
        super(message);
        this.status = status;
        this.response = response;
        this.name = 'ApiError';
    }
}
//# sourceMappingURL=types.js.map