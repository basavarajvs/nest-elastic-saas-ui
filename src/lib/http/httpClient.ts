import Axios, { AxiosRequestConfig, AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const AXIOS_INSTANCE = Axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

function clearAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('tenant_code');
}

AXIOS_INSTANCE.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const tenantCode = localStorage.getItem('tenant_code');
    if (tenantCode) {
      config.headers['X-Tenant-Code'] = tenantCode;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return AXIOS_INSTANCE(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      const { data } = await AXIOS_INSTANCE.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { refreshToken },
      );

      setToken(data.accessToken);
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
      }

      processQueue(null, data.accessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      }
      return AXIOS_INSTANCE(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAuth();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const customInstance = <T>(
  url: string,
  init?: RequestInit & { params?: Record<string, string> },
): Promise<T> => {
  const config: AxiosRequestConfig = {
    url,
    method: init?.method as AxiosRequestConfig['method'],
    headers: init?.headers as AxiosRequestConfig['headers'],
    data: init?.body,
    signal: init?.signal as AxiosRequestConfig['signal'],
    params: (init as { params?: Record<string, string> })?.params,
  };
  const promise = AXIOS_INSTANCE(config).then(({ data }) => data);
  return promise;
};

export default customInstance;
