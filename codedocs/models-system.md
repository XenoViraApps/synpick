# Models System

## Table of Contents

- [Overview](#overview)
- [Model Data Structure](#model-data-structure)
- [ModelInfoImpl](#modelinfoimpl)
- [ModelCache](#modelcache)
- [ModelManager](#modelmanager)
- [Thinking Model Detection](#thinking-model-detection)
- [API Integration](#api-integration)

---

## Overview

The models system handles:

- Fetching model data from the Synthetic API
- Validating model data with Zod schemas
- Caching model data with configurable expiration
- Searching and filtering models
- Identifying thinking-capable models

### Architecture

```
┌─────────────────────────────────────────────────┐
│              ModelCoordinator                  │
│             (ModelManager)                      │
├─────────────────────────────────────────────────┤
│  ┌──────────────┐      ┌──────────────┐         │
│  │  ModelInfo   │      │  ModelCache  │         │
│  │    Schema    │      │              │         │
│  │  (Zod)       │      │  - isValid() │         │
│  │              │      │  - load()    │         │
│  └──────────────┘      │  - save()    │         │
│         │             │  - clear()   │         │
│         ▼             └──────────────┘         │
│  ┌──────────────┐              │                │
│  │ ModelInfoImpl│              │                │
│  │              │              │                │
│  │ - id        │              │                │
│  │ - provider  │              ▼                │
│  │ - name      │      ┌──────────────┐         │
│  │ - context   │      │   File I/O   │         │
│  │ - pricing   │      └──────────────┘         │
│  └──────────────┘                                 │
└─────────────────────────────────────────────────┘
```

---

## Model Data Structure

### ModelInfo Interface

**Location:** `src/models/types.ts:3`

```typescript
import { z } from 'zod';

export const ModelInfoSchema = z.object({
  // Identity
  id: z.string().describe('Model identifier'),
  object: z.string().default('model').describe('Object type'),
  created: z.number().optional().describe('Creation timestamp'),

  // Ownership
  owned_by: z.string().optional().describe('Model owner'),
  provider: z.string().optional().describe('Model provider'),
  always_on: z.boolean().optional().describe('Always available'),

  // Metadata
  hugging_face_id: z.string().optional().describe('Hugging Face model ID'),
  name: z.string().optional().describe('Model display name'),

  // Modalities
  input_modalities: z.array(z.string()).optional()
    .describe('Supported input modalities'),
  output_modalities: z.array(z.string()).optional()
    .describe('Supported output modalities'),

  // Context/Tokens
  context_length: z.number().optional()
    .describe('Context window size'),
  max_output_length: z.number().optional()
    .描述('Maximum output tokens'),

  // Pricing
  pricing: z.object({
    prompt: z.string().optional(),
    completion: z.string().optional(),
    image: z.string().optional(),
    request: z.string().optional(),
    input_cache_reads: z.string().optional(),
    input_cache_writes: z.string().optional(),
  }).optional().describe('Pricing information'),

  // Technical
  quantization: z.string().optional().describe('Model quantization'),
  supported_sampling_parameters: z.array(z.string()).optional()
    .describe('Supported sampling parameters'),
  supported_features: z.array(z.string()).optional()
    .describe('Supported features'),

  // Third-party metadata
  openrouter: z.object({
    slug: z.string().optional(),
  }).optional().describe('OpenRouter metadata'),

  // Availability
  datacenters: z.array(
    z.object({
      country_code: z.string().optional(),
    })
  ).optional().describe('Available datacenters'),
});

export type ModelInfo = z.infer<typeof ModelInfoSchema>;
```

### PricingInfo

```typescript
interface PricingInfo {
  prompt?: string;           // Price per prompt token
  completion?: string;       // Price per completion token
  image?: string;            // Price per image
  request?: string;          // Price per request
  input_cache_reads?: string; // Cache read price
  input_cache_writes?: string; // Cache write price
}
```

### Example Model Data

```json
{
  "id": "anthropic:claude-3-5-sonnet-20241022",
  "object": "model",
  "created": 1729584000,
  "owned_by": "anthropic",
  "provider": "anthropic",
  "always_on": true,
  "name": "Claude 3.5 Sonnet",
  "input_modalities": ["text", "image"],
  "output_modalities": ["text"],
  "context_length": 200000,
  "max_output_length": 8192,
  "pricing": {
    "prompt": "$0.003",
    "completion": "$0.015"
  },
  "quantization": "none",
  "supported_sampling_parameters": ["temperature", "top_p"],
  "supported_features": ["vision", "function_calling"],
  "datacenters": [
    { "country_code": "US" },
    { "country_code": "EU" }
  ]
}
```

---

## ModelInfoImpl

### Class Definition

**Location:** `src/models/info.ts:3`

```typescript
export class ModelInfoImpl implements ModelInfo {
  // All ModelInfo properties
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
  provider?: string;
  always_on?: boolean;
  hugging_face_id?: string;
  name?: string;
  input_modalities?: string[];
  output_modalities?: string[];
  context_length?: number;
  max_output_length?: number;
  pricing?: PricingInfo;
  quantization?: string;
  supported_sampling_parameters?: string[];
  supported_features?: string[];
  openrouter?: { slug?: string };
  datacenters?: Array<{ country_code?: string }>;

  constructor(data: ModelInfo);
  getDisplayName(): string;
  getProvider(): string;
  getModelName(): string;
  toJSON(): ModelInfo;
}
```

### Constructor

```typescript
constructor(data: ModelInfo)
```

Validates data with Zod schema and assigns properties.

**Throws:** `Error` if data is invalid

### Methods

#### `getDisplayName()`

```typescript
getDisplayName(): string
```

Returns the display name, preferring `name` over `id`.

**Example:**
```typescript
const model = new ModelInfoImpl({
  id: 'anthropic:claude-3-5-sonnet',
  name: 'Claude 3.5 Sonnet'
});
model.getDisplayName(); // "Claude 3.5 Sonnet"
```

#### `getProvider()`

```typescript
getProvider(): string
```

Extracts provider from model. Tries:
1. `provider` property
2. First part of `id` (before `:`)

**Example:**
```typescript
const model = new ModelInfoImpl({
  id: 'anthropic:claude-3-5-sonnet'
});
model.getProvider(); // "anthropic"
```

#### `getModelName()`

```typescript
getModelName(): string
```

Extracts model name from model. Tries:
1. `name` property
2. Second part of `id` (after first `:`)

**Example:**
```typescript
const model = new ModelInfoImpl({
  id: 'anthropic:claude-3-5-sonnet-20241022'
});
model.getModelName(); // "claude-3-5-sonnet-20241022"
```

#### `toJSON()`

```typescript
toJSON(): ModelInfo
```

Serializes model to plain object.

**Example:**
```typescript
const model = new ModelInfoImpl({ /* ... */ });
const data = model.toJSON();
console.log(JSON.stringify(data, null, 2));
```

### Factory Function

```typescript
export function createModelInfo(data: ModelInfo): ModelInfoImpl {
  return new ModelInfoImpl(data);
}
```

---

## ModelCache

### Class Definition

**Location:** `src/models/cache.ts:10`

```typescript
export interface ModelCacheOptions {
  cacheFile: string;
  cacheDurationHours: number;
}

export class ModelCache {
  constructor(options: ModelCacheOptions);

  async isValid(): Promise<boolean>;
  async load(): Promise<ModelInfoImpl[]>;
  async save(models: ModelInfoImpl[]): Promise<boolean>;
  async clear(): Promise<boolean>;
  async getInfo(): Promise<CacheInfo>;
}
```

### Constructor

```typescript
constructor(options: ModelCacheOptions)
```

**Parameters:**
- `cacheFile: string` - Path to cache file
- `cacheDurationHours: number` - Cache validity in hours

**Example:**
```typescript
const cache = new ModelCache({
  cacheFile: '~/.config/synclaude/models_cache.json',
  cacheDurationHours: 24
});
```

### Methods

#### `isValid()`

```typescript
async isValid(): Promise<boolean>
```

Checks if cache file exists and is within duration limit.

**Process:**
1. Get file stats
2. Calculate age
3. Compare with `cacheDurationMs`

**Returns:** `true` if valid, `false` otherwise

#### `load()`

```typescript
async load(): Promise<ModelInfoImpl[]>
```

Loads models from cache if valid.

**Returns:** Array of `ModelInfoImpl`, empty array if invalid

**Errors:** Returns empty array on any error

#### `save()`

```typescript
async save(models: ModelInfoImpl[]): Promise<boolean>
```

Saves models to cache file.

**Structure:**
```json
{
  "models": [
    { "id": "...", "name": "...", /* ... */ }
  ],
  "timestamp": "2024-12-31T12:34:56.789Z",
  "count": 42
}
```

**Process:**
1. Ensure parent directory exists
2. Serialize models with `toJSON()`
3. Write to file

**Returns:** `true` on success, `false` on failure

#### `clear()`

```typescript
async clear(): Promise<boolean>
```

Deletes cache file.

**Returns:** `true` on success, `false` on failure

#### `getInfo()`

```typescript
async getInfo(): Promise<CacheInfo>
```

Returns cache metadata and status.

**Returns:**
```typescript
{
  exists: boolean;
  filePath?: string;
  modifiedTime?: string;      // ISO-8601
  sizeBytes?: number;
  modelCount?: number;
  isValid?: boolean;
  error?: string;
}
```

### CacheInfo Interface

```typescript
export interface CacheInfo {
  exists: boolean;
  filePath?: string;
  modifiedTime?: string;
  sizeBytes?: number;
  modelCount?: number;
  isValid?: boolean;
  error?: string;
}
```

---

## ModelManager

### Class Definition

**Location:** `src/models/manager.ts:13`

```typescript
export interface ModelManagerOptions {
  apiKey: string;
  modelsApiUrl: string;
  cacheFile: string;
  cacheDurationHours?: number;
}

export class ModelManager {
  constructor(options: ModelManagerOptions);

  async fetchModels(forceRefresh?: boolean): Promise<ModelInfoImpl[]>;
  getModels(models?: ModelInfoImpl[]): ModelInfoImpl[];
  async searchModels(query: string, models?: ModelInfoImpl[]): Promise<ModelInfoImpl[]>;
  async getModelById(modelId: string, models?: ModelInfoImpl[]): Promise<ModelInfoImpl | null>;
  async clearCache(): Promise<boolean>;
  async getCacheInfo(): Promise<Record<string, any>>;
}
```

### Constructor

```typescript
constructor(options: ModelManagerOptions)
```

**Parameters:**
- `apiKey: string` - API authentication key
- `modelsApiUrl: string` - Models API endpoint URL
- `cacheFile: string` - Cache file path
- `cacheDurationHours?: number` - Cache duration (default: 24)

**Example:**
```typescript
const manager = new ModelManager({
  apiKey: 'sk-xxxxxxxxxx',
  modelsApiUrl: 'https://api.synthetic.new/openai/v1/models',
  cacheFile: '~/.config/synclaude/models_cache.json',
  cacheDurationHours: 24
});
```

### Methods

#### `fetchModels()`

```typescript
async fetchModels(forceRefresh: boolean = false): Promise<ModelInfoImpl[]>
```

Fetches models from API or cache.

**Parameters:**
- `forceRefresh: boolean` - Skip cache and fetch from API

**Process:**
1. If `!forceRefresh` and cache is valid → load from cache
2. If no API key → return empty array with warning
3. Fetch from API
4. Parse and validate each model
5. Save to cache (if results received)
6. Return models

**Returns:** Array of `ModelInfoImpl`

**Errors:**
- `ApiError` - API communication errors
- Skips invalid models (logs warning)

#### `getModels()`

```typescript
getModels(models?: ModelInfoImpl[]): ModelInfoImpl[]
```

Returns a sorted copy of the models array.

**Parameters:**
- `models?: ModelInfoImpl[]` - Models to sort

**Throws:** `Error` if models not provided

**Returns:** Models sorted by `id`

#### `searchModels()`

```typescript
async searchModels(
  query: string,
  models?: ModelInfoImpl[]
): Promise<ModelInfoImpl[]>
```

Searches models by ID, provider, or name.

**Parameters:**
- `query: string` - Search query (case-insensitive)
- `models?: ModelInfoImpl[]` - Models to search (fetches if omitted)

**Process:**
1. If no models provided → fetch from API
2. If no query → return all sorted models
3. Search in: `id`, `provider`, `model name`
4. Return sorted results

**Returns:** Matching models sorted by `id`

#### `getModelById()`

```typescript
async getModelById(
  modelId: string,
  models?: ModelInfoImpl[]
): Promise<ModelInfoImpl | null>
```

Finds a model by its ID.

**Parameters:**
- `modelId: string` - Model ID to find
- `models?: ModelInfoImpl[]` - Models to search (fetches if omitted)

**Returns:** `ModelInfoImpl` or `null` if not found

#### `clearCache()`

```typescript
async clearCache(): Promise<boolean>
```

Clears the model cache.

**Returns:** `true` on success, `false` on failure

#### `getCacheInfo()`

```typescript
async getCacheInfo(): Promise<Record<string, any>>
```

Returns cache information.

**Returns:** Object with cache stats and status

---

## Thinking Model Detection

The system identifies thinking-capable models based on their model ID patterns.

### Detection Function

**Location:** `src/ui/user-interface.tsx:9` and `src/ui/components/ModelSelector.tsx:6`

```typescript
function isThinkingModel(modelId: string): boolean {
  const id = modelId.toLowerCase();

  // Direct "thinking" keyword
  if (id.includes('thinking')) return true;

  // MiniMax thinking models
  if (id.includes('minimax') && (id.includes('2') || id.includes('3'))) return true;

  // DeepSeek reasoning models
  if (id.includes('deepseek-r1') || id.includes('deepseek-r2') || id.includes('deepseek-r3'))
    return true;
  if (id.includes('deepseek') && (id.includes('3.2') || id.includes('3-2'))) return true;

  // QwQ (reasoning)
  if (id.includes('qwq')) return true;

  // OpenAI o-series (reasoning)
  if (id.includes('o1')) return true;
  if (id.includes('o3')) return true;

  // Qwen 3 thinking variants
  if (id.includes('qwen3')) return true;

  return false;
}
```

### Recognized Thinking Model Patterns

| Pattern | Description |
|---------|-------------|
| `thinking` | Models with "thinking" in name |
| `minimax-[23]` | MiniMax reasoning models |
| `deepseek-r[123]` | DeepSeek reasoning series |
| `deepseek-[3.]` | DeepSeek 3.x reasoning |
| `qwq` | QwQ reasoning model |
| `o[13]` | OpenAI reasoning series |
| `qwen3` | Qwen 3 thinking variants |

### Usage in UI

Thinking models are tagged with a 🤔 emoji in the UI:

```typescript
// user-interface.tsx
const thoughtSuffix = isThinkingModel(model.id)
  ? ' ' + chalk.yellow('🤔 Thinking')
  : '';
```

---

## API Integration

### API Endpoint

```
GET https://api.synthetic.new/openai/v1/models
Authorization: Bearer <API_KEY>
```

### Request Headers

```typescript
{
  'Authorization': 'Bearer <API_KEY>',
  'Content-Type': 'application/json'
}
```

### Response Format

```typescript
interface ApiModelsResponse {
  data: ModelInfo[];
  object?: 'list';
}
```

### Example Response

```json
{
  "data": [
    {
      "id": "anthropic:claude-3-5-sonnet-20241022",
      "object": "model",
      "created": 1729584000,
      "provider": "anthropic",
      "name": "Claude 3.5 Sonnet",
      "context_length": 200000
    }
  ],
  "object": "list"
}
```

### Error Handling

#### Axios Error Handling

```typescript
try {
  const response = await axios.get(url, { headers, timeout: 30000 });

  if (response.status === 200) {
    // Process models
    const modelsData = response.data.data || [];
    return modelsData.map(data => new ModelInfoImpl(data));
  } else {
    throw new ApiError(
      `API error: ${response.status} - ${response.statusText}`,
      response.status,
      response.data
    );
  }
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      throw new ApiError(
        `API error: ${error.response.status}`,
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      throw new ApiError('Network error: No response received');
    }
  }
  throw new ApiError(`Error fetching models: ${(error as Error).message}`);
}
```

### ApiError Class

```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

---

## Usage Examples

### Basic Model Fetching

```typescript
import { ModelManager } from './models/manager';

const manager = new ModelManager({
  apiKey: 'sk-xxxxxxxxxx',
  modelsApiUrl: 'https://api.synthetic.new/openai/v1/models',
  cacheFile: '~/.config/synclaude/models_cache.json',
  cacheDurationHours: 24
});

// Fetch from API or cache
const models = await manager.fetchModels();
console.log(`Found ${models.length} models`);
```

### Forcing Cache Refresh

```typescript
// Force refresh from API
const freshModels = await manager.fetchModels(true);
```

### Searching Models

```typescript
// Search by name
const sonnetModels = await manager.searchModels('sonnet');

// Search by provider
const anthropicModels = await manager.searchModels('anthropic');

// Search both
const results = manager.searchModels('anthropic claude');
```

### Finding a Specific Model

```typescript
const modelId = 'anthropic:claude-3-5-sonnet-20241022';
const model = await manager.getModelById(modelId);

if (model) {
  console.log('Found:', model.getDisplayName());
  console.log('Context:', model.context_length, 'tokens');
}
```

### Working with Thinking Models

```typescript
import { isThinkingModel } from './ui/user-interface';

const models = await manager.fetchModels();

const thinkingModels = models.filter(m => isThinkingModel(m.id));
console.log(`Found ${thinkingModels.length} thinking models`);

thinkingModels.forEach(m => {
  console.log(`  🤔 ${m.getDisplayName()}`);
});
```

### Cache Management

```typescript
// Check cache info
const info = await manager.getCacheInfo();
console.log('Cache exists:', info.exists);
console.log('Cache valid:', info.isValid);
console.log('Model count:', info.modelCount);

// Clear cache
await manager.clearCache();

// Force refresh after clearing
const models = await manager.fetchModels(true);
```

### Sorting and Display

```typescript
const models = await manager.fetchModels();
const sorted = manager.getModels(models);

sorted.forEach((model, index) => {
  const displayName = model.getDisplayName();
  const provider = model.getProvider();
  const contextK = Math.round((model.context_length || 0) / 1024);

  console.log(`${index + 1}. ${displayName}`);
  console.log(`   Provider: ${provider}`);
  console.log(`   Context: ${contextK}K tokens`);
});
```
