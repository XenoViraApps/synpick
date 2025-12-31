/**
 * ApiClient Tests
 *
 * Tests the API client's HTTP methods, error handling, and configuration.
 */

import axios from 'axios';
jest.mock('axios');

import { ApiClient, ApiClientOptions } from '../../src/api';
import { ApiError } from '../../src/models/types';
import { mockAxios, mockAxiosResponse, mockAxiosError, resetAxiosMocks, getMockAxiosInstance } from '../mocks/axios.mock';

describe('ApiClient', () => {
  let client: ApiClient;
  let mockInstance: any;

  beforeEach(() => {
    client = new ApiClient();
    mockInstance = getMockAxiosInstance();
    jest.clearAllMocks();
    resetAxiosMocks();

    // Re-create client to get fresh mock instance
    client = new ApiClient();
    mockInstance = getMockAxiosInstance();

    // Mock console methods to reduce noise in test output
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create axios instance with default config', () => {
      const instance = client.getAxiosInstance();
      expect(instance).toBeDefined();
      expect(instance.defaults.baseURL).toBe('https://api.synthetic.new');
      expect(instance.defaults.timeout).toBe(30000);
    });

    it(' should create with custom baseURL', () => {
      const customClient = new ApiClient({ baseURL: 'https://custom.api.com' });
      const instance = customClient.getAxiosInstance();
      expect(instance.defaults.baseURL).toBe('https://custom.api.com');
    });

    it('should create with custom timeout', () => {
      const customClient = new ApiClient({ timeout: 60000 });
      const instance = customClient.getAxiosInstance();
      expect(instance.defaults.timeout).toBe(60000);
    });

    it('should create with custom headers', () => {
      const customClient = new ApiClient({
        headers: { 'X-Custom-Header': 'custom-value' },
      });
      const instance = customClient.getAxiosInstance();
      expect(instance.defaults.headers['X-Custom-Header']).toBe('custom-value');
    });

    it('should set default Content-Type header', () => {
      const instance = client.getAxiosInstance();
      expect(instance.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('should set default User-Agent header', () => {
      const instance = client.getAxiosInstance();
      expect(instance.defaults.headers['User-Agent']).toBe('synpick/1.0.0');
    });

    it('should merge custom headers with defaults', () => {
      const customClient = new ApiClient({
        headers: { 'X-Custom-Header': 'custom-value' },
      });
      const instance = customClient.getAxiosInstance();
      expect(instance.defaults.headers['Content-Type']).toBe('application/json');
      expect(instance.defaults.headers['X-Custom-Header']).toBe('custom-value');
    });
  });

  describe('setApiKey', () => {
    it('should set Authorization header with Bearer token', () => {
      client.setApiKey('sk-test-key');
      const instance = client.getAxiosInstance();
      expect(instance.defaults.headers.common['Authorization']).toBe('Bearer sk-test-key');
    });

    it('should overwrite existing Authorization header', () => {
      client.setApiKey('sk-key-1');
      client.setApiKey('sk-key-2');
      const instance = client.getAxiosInstance();
      expect(instance.defaults.headers.common['Authorization']).toBe('Bearer sk-key-2');
    });

    it('should handle empty API key', () => {
      client.setApiKey('');
      const instance = client.getAxiosInstance();
      expect(instance.defaults.headers.common['Authorization']).toBe('Bearer ');
    });

    it('should handle API key with spaces', () => {
      client.setApiKey('sk test key with spaces');
      const instance = client.getAxiosInstance();
      expect(instance.defaults.headers.common['Authorization']).toBe('Bearer sk test key with spaces');
    });
  });

  describe('setBaseURL', () => {
    it('should update baseURL', () => {
      client.setBaseURL('https://new.api.com');
      const instance = client.getAxiosInstance();
      expect(instance.defaults.baseURL).toBe('https://new.api.com');
    });

    it('should overwrite baseURL multiple times', () => {
      client.setBaseURL('https://first.com');
      client.setBaseURL('https://second.com');
      client.setBaseURL('https://third.com');
      const instance = client.getAxiosInstance();
      expect(instance.defaults.baseURL).toBe('https://third.com');
    });
  });

  describe('getAxiosInstance', () => {
    it('should return the axios instance', () => {
      const instance = client.getAxiosInstance();
      expect(instance).toBeDefined();
      expect(instance.get).toBeDefined();
      expect(instance.post).toBeDefined();
      expect(instance.put).toBeDefined();
      expect(instance.delete).toBeDefined();
    });
  });

  describe('fetchModels', () => {
    it('should fetch models successfully', async () => {
      const mockModelsResponse = {
        object: 'list',
        data: [
          { id: 'model-1', object: 'model', owned_by: 'provider-1' },
          { id: 'model-2', object: 'model', owned_by: 'provider-2' },
          { id: 'anthropic/claude-sonnet-4-20250514', object: 'model', owned_by: 'anthropic' },
        ],
      };

      mockInstance.get.mockResolvedValue(mockAxiosResponse(mockModelsResponse));

      const result = await client.fetchModels('sk-api-key', 'https://api.test.com/models');

      expect(result).toEqual(mockModelsResponse);
      expect(mockInstance.get).toHaveBeenCalledWith('https://api.test.com/models', undefined);
    });

    it('should set API key in Authorization header', async () => {
      mockInstance.get.mockResolvedValue(mockAxiosResponse({ object: 'list', data: [] }));

      await client.fetchModels('sk-test-key', 'https://api.test.com/models');

      expect(client.getAxiosInstance().defaults.headers.common['Authorization'])
        .toBe('Bearer sk-test-key');
    });

    it('should handle API URL with path', async () => {
      mockInstance.get.mockResolvedValue(mockAxiosResponse({ object: 'list', data: [] }));

      await client.fetchModels('sk-key', 'https://api.com/v1/models');

      expect(mockInstance.get).toHaveBeenCalledWith('https://api.com/v1/models', undefined);
    });

    it('should throw ApiError when fetch fails', async () => {
      mockInstance.get.mockRejectedValue(new Error('Network error'));

      await expect(
        client.fetchModels('sk-key', 'https://api.test.com/models')
      ).rejects.toThrow(ApiError);
    });

    it('should wrap non-ApiError errors in ApiError', async () => {
      // Create a standard Error object (not an ApiError)
      const plainError = new Error('Unexpected error');
      mockInstance.get.mockRejectedValue(plainError);

      // The error flows through handleError which creates "Unknown error: Unexpected error"
      // and since it IS an ApiError, fetchModels' check passes and rethrows it
      await expect(
        client.fetchModels('sk-key', 'https://api.test.com/models')
      ).rejects.toMatchObject({
        message: 'Unknown error: Unexpected error',
      });
    });

    it('should pass through ApiError from fetchModels', async () => {
      // When an ApiError is directly thrown (bypassing the get() method),
      // it should pass through fetchModels' check
      // This test demonstrates the fetchModels error handling behavior
      const testError = mockAxiosError('API error', 404, false);
      testError.response = { status: 404, data: { error: 'Not found' } };
      mockInstance.get.mockRejectedValue(testError);

      await expect(
        client.fetchModels('sk-key', 'https://api.test.com/models')
      ).rejects.toMatchObject({
        message: 'API error 404: Not found',
      });
    });
  });

  describe('HTTP Methods (get, post, put, delete)', () => {
    const mockData = { result: 'success' };

    it('GET should make request and return response', async () => {
      mockInstance.get.mockResolvedValue(mockAxiosResponse(mockData));

      const result = await client.get('/test');

      expect(result.data).toEqual(mockData);
      expect(mockInstance.get).toHaveBeenCalledWith('/test', undefined);
    });

    it('GET should pass config parameter', async () => {
      mockInstance.get.mockResolvedValue(mockAxiosResponse(mockData));

      const config = { timeout: 10000 };
      await client.get('/test', config);

      expect(mockInstance.get).toHaveBeenCalledWith('/test', config);
    });

    it('POST should make request and return response', async () => {
      mockInstance.post.mockResolvedValue(mockAxiosResponse(mockData));

      const result = await client.post('/test', { body: 'data' });

      expect(result.data).toEqual(mockData);
      expect(mockInstance.post).toHaveBeenCalledWith('/test', { body: 'data' }, undefined);
    });

    it('POST should pass config parameter', async () => {
      mockInstance.post.mockResolvedValue(mockAxiosResponse(mockData));

      const config = { timeout: 10000 };
      await client.post('/test', { body: 'data' }, config);

      expect(mockInstance.post).toHaveBeenCalledWith('/test', { body: 'data' }, config);
    });

    it('PUT should make request and return response', async () => {
      mockInstance.put.mockResolvedValue(mockAxiosResponse(mockData));

      const result = await client.put('/test', { body: 'data' });

      expect(result.data).toEqual(mockData);
      expect(mockInstance.put).toHaveBeenCalledWith('/test', { body: 'data' }, undefined);
    });

    it('PUT should pass config parameter', async () => {
      mockInstance.put.mockResolvedValue(mockAxiosResponse(mockData));

      const config = { timeout: 10000 };
      await client.put('/test', { body: 'data' }, config);

      expect(mockInstance.put).toHaveBeenCalledWith('/test', { body: 'data' }, config);
    });

    it('DELETE should make request and return response', async () => {
      mockInstance.delete.mockResolvedValue(mockAxiosResponse(mockData));

      const result = await client.delete('/test');

      expect(result.data).toEqual(mockData);
      expect(mockInstance.delete).toHaveBeenCalledWith('/test', undefined);
    });

    it('DELETE should pass config parameter', async () => {
      mockInstance.delete.mockResolvedValue(mockAxiosResponse(mockData));

      const config = { timeout: 10000 };
      await client.delete('/test', config);

      expect(mockInstance.delete).toHaveBeenCalledWith('/test', config);
    });
  });

  describe('Error Handling', () => {
    it('should throw ApiError on HTTP error response', async () => {
      const error = mockAxiosError('Not Found', 404, false);
      error.response = { status: 404, data: { error: 'Not found' } };
      mockInstance.get.mockRejectedValue(error);

      await expect(client.get('/test')).rejects.toThrow(ApiError);
    });

    it('should include status in ApiError for HTTP errors', async () => {
      const error = mockAxiosError('Bad Request', 400, false);
      error.response = { status: 400, data: { message: 'Invalid input' } };
      mockInstance.get.mockRejectedValue(error);

      try {
        await client.get('/test');
        fail('Should have thrown ApiError');
      } catch (e) {
        expect((e as ApiError).status).toBe(400);
      }
    });

    it('should parse error message from response data', async () => {
      const error = mockAxiosError('Unauthorized', 401, false);
      error.response = { status: 401, data: { error: 'Invalid API key' } };
      mockInstance.get.mockRejectedValue(error);

      try {
        await client.get('/test');
        fail('Should have thrown ApiError');
      } catch (e) {
        expect((e as ApiError).message).toContain('Invalid API key');
      }
    });

    it('should handle network error (no response, has request)', async () => {
      const error = mockAxiosError('Network Error', undefined, true);
      mockInstance.get.mockRejectedValue(error);

      await expect(
        client.get('/test')
      ).rejects.toMatchObject({
        message: 'Network error: No response received from API',
      });
    });

    it('should throw ApiError on unknown error', async () => {
      mockInstance.get.mockRejectedValue(new Error('Unknown error occurred'));

      await expect(
        client.get('/test')
      ).rejects.toMatchObject({
        message: 'Unknown error: Unknown error occurred',
      });
    });

    it('should handle error with custom message from request config', async () => {
      // Create an axios error with isAxiosError=true but no response or request
      // This simulates a config/setup error
      const error = mockAxiosError('Custom error message', undefined, false);
      mockInstance.get.mockRejectedValue(error);

      await expect(
        client.get('/test')
      ).rejects.toMatchObject({
        message: 'Request error: Custom error message',
      });
    });
  });
});
