'use server';

import { redirect } from 'next/navigation';

import { login, register, type RegisterInput } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { setSessionToken } from '@/lib/session';

export interface AuthFormState {
  message: string | null;
  fieldErrors: Record<string, string>;
}

const INTERNAL_ORIGIN = 'http://internal.invalid';

/**
 * Only same-site paths are allowed as a post-login target. The value is resolved with the same
 * URL parser the browser uses, because prefix checks miss inputs such as "/<TAB>/evil.example",
 * which the parser normalizes to the protocol-relative "//evil.example". The resolved path is
 * checked as well, because normalization itself can produce a leading "//".
 */
function safeNext(value: FormDataEntryValue | null): string {
  const fallback = '/dashboard';
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return fallback;
  }

  try {
    const url = new URL(value, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN) {
      return fallback;
    }
    // Dot-segment removal can leave a path that starts with "//" (for example "/.//evil.example"),
    // which browsers treat as a protocol-relative URL pointing at another host.
    const target = url.pathname + url.search + url.hash;
    return target.startsWith('//') || target.includes('\\') ? fallback : target;
  } catch {
    return fallback;
  }
}

function firstErrors(errors: Record<string, string[]>): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(errors)) {
    if (messages.length > 0) {
      fieldErrors[field] = messages[0];
    }
  }
  return fieldErrors;
}

function toFormState(error: unknown, fallback: string): AuthFormState {
  if (error instanceof ApiError) {
    if (error.code === 'invalid_credentials') {
      return { message: 'Email or password is incorrect.', fieldErrors: {} };
    }
    if (error.code === 'too_many_requests') {
      return { message: 'Too many attempts. Wait a minute and try again.', fieldErrors: {} };
    }
    if (error.code === 'validation_failed') {
      return { message: 'Please fix the highlighted fields.', fieldErrors: firstErrors(error.errors) };
    }
  }
  return { message: fallback, fieldErrors: {} };
}

export async function loginAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  try {
    const result = await login({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    });
    await setSessionToken(result.token);
  } catch (error) {
    return toFormState(error, 'Sign-in failed. Please try again.');
  }

  redirect(safeNext(formData.get('next')));
}

export async function registerAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const role = formData.get('role') === 'employer' ? 'employer' : 'candidate';
  const input: RegisterInput = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    password_confirmation: String(formData.get('password_confirmation') ?? ''),
    role,
  };

  if (role === 'employer') {
    input.company_name = String(formData.get('company_name') ?? '');
  }

  try {
    const result = await register(input);
    await setSessionToken(result.token);
  } catch (error) {
    return toFormState(error, 'Registration failed. Please try again.');
  }

  redirect('/dashboard');
}
