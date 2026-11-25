// apps/web/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  isNetworkError: boolean;

  constructor(message: string, status = 0, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new ApiError('Terminal is currently offline.', 0, true);
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('servora_token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `API error: ${response.statusText}`,
        response.status,
        response.status >= 502
      );
    }

    return response.json();
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }
    const msg = error instanceof Error ? error.message : 'Network request failed';
    if (error instanceof TypeError || msg === 'Failed to fetch') {
      throw new ApiError(
        `Unable to connect to backend server at ${API_BASE_URL}. Verify backend status and network connection.`,
        0,
        true
      );
    }
    throw error;
  }
}