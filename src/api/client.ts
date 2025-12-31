import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiModelsResponse, ApiError } from '../models/types';

export interface ApiClientOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class ApiClient {
  private axios: AxiosInstance;
  private defaultHeaders: Record<string, string>;

  /**
   * Creates a new ApiClient instance
   *
   * @param options - Configuration options for the API client
   * @param options.baseURL - Base URL for API requests (default: https://api.synthetic.new)
   * @param options.timeout - Request timeout in milliseconds (default: 30000)
   * @param options.headers - Additional headers to include in all requests
   */
  constructor(options: ApiClientOptions = {}) {
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'synclaude/1.0.0',
      ...options.headers,
    };

    this.axios = axios.create({
      baseURL: options.baseURL || 'https://api.synthetic.new',
      timeout: options.timeout || 30000,
      headers: this.defaultHeaders,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use(
      config => {
        console.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      response => {
        console.debug(`API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      error => {
        if (axios.isAxiosError(error)) {
          if (error.response) {
            console.error(
              `API Error Response: ${error.response.status} ${error.response.statusText}`
            );
          } else if (error.request) {
            console.error('API Network Error: No response received');
          } else {
            console.error('API Request Setup Error:', error.message);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Sets the API key for authorization
   *
   * @param apiKey - The API key to use for authentication
   */
  setApiKey(apiKey: string): void {
    this.axios.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;
  }

  /**
   * Sets the base URL for all API requests
   *
   * @param baseURL - The new base URL to use
   */
  setBaseURL(baseURL: string): void {
    this.axios.defaults.baseURL = baseURL;
  }

  /**
   * Performs an HTTP GET request
   *
   * @template T - Type of the response data
   * @param url - The URL to request
   * @param config - Optional Axios configuration
   * @returns Promise with the Axios response
   * @throws ApiError if the request fails
   */
  async get<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    try {
      return await this.axios.get<T>(url, config);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Performs an HTTP POST request
   *
   * @template T - Type of the response data
   * @param url - The URL to request
   * @param data - Optional request body data
   * @param config - Optional Axios configuration
   * @returns Promise with the Axios response
   * @throws ApiError if the request fails
   */
  async post<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    try {
      return await this.axios.post<T>(url, data, config);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Performs an HTTP PUT request
   *
   * @template T - Type of the response data
   * @param url - The URL to request
   * @param data - Optional request body data
   * @param config - Optional Axios configuration
   * @returns Promise with the Axios response
   * @throws ApiError if the request fails
   */
  async put<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    try {
      return await this.axios.put<T>(url, data, config);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Performs an HTTP DELETE request
   *
   * @template T - Type of the response data
   * @param url - The URL to request
   * @param config - Optional Axios configuration
   * @returns Promise with the Axios response
   * @throws ApiError if the request fails
   */
  async delete<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    try {
      return await this.axios.delete<T>(url, config);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async fetchModels(apiKey: string, modelsUrl: string): Promise<ApiModelsResponse> {
    this.setApiKey(apiKey);

    try {
      const response = await this.get<ApiModelsResponse>(modelsUrl);
      return response.data;
    } catch (error) {
      // Check if this is already an ApiError to avoid double-wrapping
      // We check for the ApiError constructor name and presence of status property
      const isError = error as Error;
      const isAlreadyApiError =
        error instanceof ApiError ||
        isError?.name === 'ApiError' ||
        isError?.constructor?.name === 'ApiError';

      if (isAlreadyApiError) {
        throw error;
      }
      throw new ApiError(`Failed to fetch models: ${isError?.message || 'Unknown error'}`);
    }
  }

  private handleError(error: any): ApiError {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        const message = data?.message || data?.error || error.response.statusText;

        return new ApiError(`API error ${status}: ${message}`, status, data);
      } else if (error.request) {
        return new ApiError('Network error: No response received from API');
      } else {
        return new ApiError(`Request error: ${error.message}`);
      }
    }

    return new ApiError(`Unknown error: ${(error as Error).message}`);
  }

  /**
   * Gets the underlying Axios instance for advanced use cases
   *
   * This method provides direct access to the configured Axios instance
   * for custom request configurations or interceptor modifications.
   *
   * @returns The Axios instance used by this client
   */
  getAxiosInstance(): AxiosInstance {
    return this.axios;
  }
}
