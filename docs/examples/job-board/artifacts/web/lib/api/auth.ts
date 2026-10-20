import 'server-only';

import { apiFetch } from '@/lib/api/client';
import type { AuthResult, User } from '@/types/api/auth';
import type { ApiEnvelope } from '@/types/api/common';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: 'candidate' | 'employer';
  company_name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Throws ApiError 422 (validation_failed) or 429 (too_many_requests). */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const response = await apiFetch<ApiEnvelope<AuthResult>>('register', { body: input });
  return response.data;
}

/** Throws ApiError 422 (invalid_credentials or validation_failed) or 429 (too_many_requests). */
export async function login(input: LoginInput): Promise<AuthResult> {
  const response = await apiFetch<ApiEnvelope<AuthResult>>('login', { body: input });
  return response.data;
}

/** Revokes the token on the API. Resolves with no value (204). */
export async function logout(token: string): Promise<void> {
  await apiFetch<void>('logout', { token });
}

/** Throws ApiError 401 when the token is revoked or expired. */
export async function fetchMe(token: string): Promise<User> {
  const response = await apiFetch<ApiEnvelope<User>>('me', { token });
  return response.data;
}
