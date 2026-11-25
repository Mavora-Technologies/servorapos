// apps/web/lib/api.ts
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  isNetworkError: boolean;
  details?: unknown;

  constructor(message: string, status = 0, isNetworkError = false, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
    this.details = details;
  }
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new ApiError('Terminal is currently offline.', 0, true);
  }

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('servora_token') : null;
  const activeBranchId =
    typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = new Headers(options.headers || {});

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (activeBranchId && /^\d+$/.test(activeBranchId) && !headers.has('X-Branch-Id')) {
    headers.set('X-Branch-Id', activeBranchId);
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `API error: ${response.statusText}`,
        response.status,
        response.status >= 502,
        errorData.errors
      );
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return response.text();
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