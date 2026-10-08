import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type {
  UserSignupInput,
  UserLoginInput,
  UserUpdateProfileInput,
  UpdatePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  User,
  UserRole,
} from "@repo/types";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: Omit<User, "passwordHash">;
  tokens: AuthTokens;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

const SERVER_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.SERVER_API_URL ||
  "http://localhost:3001";

export const apiClient: AxiosInstance = axios.create({
  baseURL: SERVER_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Set or clear the authorization Bearer token for client requests
export function setAuthToken(token?: string | null) {
  if (token) {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common["Authorization"];
  }
}

// Request interceptor helper to unwrap data and handle standardized API responses
async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.request<ApiResponse<T>>(config);
    if (response.data && response.data.success && response.data.data !== undefined) {
      return response.data.data;
    }
    return response.data as unknown as T;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";
    throw new Error(errorMessage);
  }
}

// ============================================================================
// AUTH API
// ============================================================================

export const authApi = {
  async signup(data: UserSignupInput): Promise<AuthResponse> {
    return request<AuthResponse>({
      url: "/api/v1/auth/signup",
      method: "POST",
      data,
    });
  },

  async login(data: UserLoginInput): Promise<AuthResponse> {
    return request<AuthResponse>({
      url: "/api/v1/auth/login",
      method: "POST",
      data,
    });
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return request<AuthResponse>({
      url: "/api/v1/auth/refresh",
      method: "POST",
      data: { refreshToken },
    });
  },

  async getMe(accessToken?: string): Promise<{ user: Omit<User, "passwordHash"> }> {
    return request<{ user: Omit<User, "passwordHash"> }>({
      url: "/api/v1/auth/me",
      method: "GET",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
  },

  async logout(accessToken?: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>({
      url: "/api/v1/auth/logout",
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
  },

  async forgotPassword(data: ForgotPasswordInput | { email: string }): Promise<{ success: boolean; message: string; resetToken?: string }> {
    return request<{ success: boolean; message: string; resetToken?: string }>({
      url: "/api/v1/auth/forgot-password",
      method: "POST",
      data,
    });
  },

  async resetPassword(data: ResetPasswordInput): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>({
      url: "/api/v1/auth/reset-password",
      method: "POST",
      data,
    });
  },
};

export const inspectionApi = {
  async createInspection(): Promise<{ id: string; status: string }> {
    return request<{ id: string; status: string }>({
      url: "/api/v1/inspections",
      method: "POST",
    });
  },

  async requestUploadUrl(inspectionId: string, filename: string, contentType: string): Promise<{ mediaId: string; uploadUrl: string; key: string }> {
    return request<{ mediaId: string; uploadUrl: string; key: string }>({
      url: `/api/v1/inspections/${inspectionId}/media/upload-url`,
      method: "POST",
      data: { filename, contentType },
    });
  },

  async analyze(inspectionId: string): Promise<{ inspectionId: string; status: string }> {
    return request<{ inspectionId: string; status: string }>({
      url: `/api/v1/inspections/${inspectionId}/analyze`,
      method: "POST",
    });
  }
};

export const mediaApi = {
  async completeUpload(mediaId: string, inspectionId: string, key: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>({
      url: `/api/v1/media/${mediaId}/complete`,
      method: "POST",
      data: { inspectionId, key },
    });
  }
};

export const api = {
  auth: authApi,
  inspection: inspectionApi,
  media: mediaApi,
  client: apiClient,
  setAuthToken,
};

export default api;
