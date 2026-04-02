import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAppStore } from '../store/index';

interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const setupAITokenInterceptor = (axiosInstance: AxiosInstance, appId: string) => {
  // Request interceptor - add token to headers
  axiosInstance.interceptors.request.use(
    (config) => {
      // Always use the latest token from store
      const store = useAppStore();
      const token = store.ai.token;
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  // Response interceptor - handle token expiration
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as RetryableAxiosRequestConfig;

      // Check if the error is 401 (token expired) and we haven't already retried
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          console.log('Token expired, refreshing token...');
          const store = useAppStore();
          await store.getAIToken();

          // Update the authorization header with the new token
          const newToken = store.ai.token;
          if (newToken) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          }

          console.log('Token refreshed, retrying request...');
          return axiosInstance(originalRequest);
        } catch (tokenError) {
          console.error('Token refresh failed:', tokenError);

          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    },
  );
};

export const createAIFetch = () => {
  async function refreshTokenAndRetry(url: string, requestOptions: RequestInit, headers: Headers): Promise<Response> {
    try {
      const store = useAppStore();
      await store.getAIToken();
      const newToken = store.ai.token;
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
      }
      console.log('Fetch: Token refreshed, retrying request...');
      const retryResponse = await fetch(url, { ...requestOptions, headers });
      if (retryResponse.status === 401) {
        return Promise.reject(new Error(`Retry after token refresh still 401: ${retryResponse.status} ${retryResponse.statusText}`));
      }
      if (!retryResponse.ok) {
        return Promise.reject(new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`));
      }
      return retryResponse;
    } catch (tokenError) {
      console.error('Fetch: Token refresh failed:', tokenError);

      return Promise.reject(new Error('Token refresh failed'));
    }
  }

  return async (url: string, options: RequestInit & { _retry?: boolean; } = {}): Promise<Response> => {
    const store = useAppStore();
    const headers = new Headers((options.headers as HeadersInit) || {});
    const token = store.ai.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const requestOptions: RequestInit = { ...options, headers };
    try {
      const response = await fetch(url, requestOptions);
      if (response.status === 401 && !options._retry) {
        console.log('Fetch: Token expired, refreshing token...');
        return await refreshTokenAndRetry(url, requestOptions, headers);
      }
      if (!response.ok) {
        return Promise.reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
      }
      return response;
    } catch (networkError) {
      return Promise.reject(networkError);
    }
  };
};
