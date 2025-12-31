import { ModelInfoImpl } from './info';
export interface ModelManagerOptions {
    apiKey: string;
    modelsApiUrl: string;
    cacheFile: string;
    cacheDurationHours?: number;
    /** API request timeout in milliseconds (default: 30000) */
    apiTimeoutMs?: number;
}
export declare class ModelManager {
    private apiKey;
    private modelsApiUrl;
    private cache;
    private apiTimeoutMs;
    /**
     * Creates a new ModelManager instance
     *
     * @param options - Configuration options for the model manager
     * @param options.apiKey - API key for authentication
     * @param options.modelsApiUrl - URL of the models API endpoint
     * @param options.cacheFile - Path to the cache file
     * @param options.cacheDurationHours - Cache duration in hours (default: 24)
     * @param options.apiTimeoutMs - API request timeout in milliseconds (default: 30000)
     */
    constructor(options: ModelManagerOptions);
    /**
     * Fetches models from the API or cache
     *
     * Uses cached models if available and valid, otherwise fetches from API.
     *
     * @param forceRefresh - If true, bypasses cache and fetches from API
     * @returns Promise resolving to the list of models
     */
    fetchModels(forceRefresh?: boolean): Promise<ModelInfoImpl[]>;
    private fetchFromApi;
    /**
     * Gets a sorted list of models
     *
     * @param models - Optional list of models to sort. If not provided, throws error
     * @returns Sorted list of models by ID
     * @throws Error if models parameter is not provided
     */
    getModels(models?: ModelInfoImpl[]): ModelInfoImpl[];
    /**
     * Searches for models matching the query
     *
     * Searches across model ID, provider, and model name.
     * If no models are provided, fetches them first.
     *
     * @param query - Search query string
     * @param models - Optional list of models to search. If not provided, fetches from cache/API
     * @returns Promise resolving to matching models sorted by ID
     */
    searchModels(query: string, models?: ModelInfoImpl[]): Promise<ModelInfoImpl[]>;
    /**
     * Finds a model by its ID
     *
     * @param modelId - The model ID to search for
     * @param models - Optional list of models to search. If not provided, fetches from cache/API
     * @returns Promise resolving to the model, or null if not found
     */
    getModelById(modelId: string, models?: ModelInfoImpl[]): Promise<ModelInfoImpl | null>;
    /**
     * Clears the model cache
     *
     * @returns Promise resolving to true if cache was cleared successfully
     */
    clearCache(): Promise<boolean>;
    /**
     * Gets information about the cache
     *
     * @returns Promise resolving to cache info object with details like age, size, etc.
     */
    getCacheInfo(): Promise<Record<string, any>>;
}
//# sourceMappingURL=manager.d.ts.map