/**
 * Axios Mock Setup
 *
 * Provides mocking utilities for axios HTTP client.
 */

import axios from 'axios';

// Mock axios module at the top level
jest.mock('axios');

// Track the most recent axios instance created
let lastMockAxiosInstance: any = null;

// Create a mock axios instance with all necessary methods
const createMockAxiosInstance = (options: any = {}) => {
  const instance = {
    defaults: {
      baseURL: options.baseURL || 'https://api.synthetic.new',
      timeout: options.timeout !== undefined ? options.timeout : 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'synpick/1.0.0',
        common: {},
        ...(options.headers || {}),
      },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
        eject: jest.fn(),
      },
      response: {
        use: jest.fn(),
        eject: jest.fn(),
      },
    },
  };
  lastMockAxiosInstance = instance;
  return instance;
};

// Mock axios.isAxiosError to detect axios error objects
(axios.isAxiosError as jest.Mock).mockImplementation((error: any) => {
  return error?.isAxiosError === true;
});

// Mock axios.create to return a mock instance
(axios.create as jest.Mock).mockImplementation(createMockAxiosInstance);

// Type assertion for mocked axios
export const mockAxios = axios as jest.Mocked<typeof axios>;
export const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper function to create mock axios responses
export function mockAxiosResponse<T>(data: T, status = 200) {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: {},
  };
}

// Helper function to create mock axios error
export function mockAxiosError(message: string, status?: number, hasRequest = !status) {
  const error: any = new Error(message);
  error.isAxiosError = true;
  error.response = status ? { status, data: { error: message } } : undefined;
  error.request = hasRequest ? {} : undefined;
  error.config = {};
  return error;
}

// Helper to setup default mock response
export function setupAxiosMock(response: any) {
  const instance = createMockAxiosInstance();
  mockAxios.get.mockResolvedValue(response);
  mockAxios.post.mockResolvedValue(response);
  mockAxios.put.mockResolvedValue(response);
  mockAxios.delete.mockResolvedValue(response);
  return instance;
}

// Helper to reset all axios mocks
export function resetAxiosMocks() {
  lastMockAxiosInstance = null;
  mockAxios.get.mockReset();
  mockAxios.post.mockReset();
  mockAxios.put.mockReset();
  mockAxios.delete.mockReset();
  (axios.isAxiosError as jest.Mock).mockReset();
  (axios.isAxiosError as jest.Mock).mockImplementation((error: any) => {
    return error?.isAxiosError === true;
  });
  (axios.create as jest.Mock).mockReset();
  (axios.create as jest.Mock).mockImplementation(createMockAxiosInstance);
}

// Helper to get the mock instance created by axios.create
export function getMockAxiosInstance() {
  return lastMockAxiosInstance;
}

// Helper to setup axios error
export function setupAxiosError(message: string, status?: number) {
  const error = mockAxiosError(message, status);
  mockAxios.get.mockRejectedValue(error);
  mockAxios.post.mockRejectedValue(error);
  mockAxios.put.mockRejectedValue(error);
  mockAxios.delete.mockRejectedValue(error);
}

// Helper to get the mock instance created by axios.create
export function getMockAxiosInstance() {
  return (axios.create as jest.Mock).mock.results[0]?.value;
}
