'use client';

import { useActionState, useState } from 'react';

import { registerAction, type AuthFormState } from '@/app/(auth)/actions';

const initialState: AuthFormState = { message: null, fieldErrors: {} };

const inputClass =
  'mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm aria-[invalid=true]:border-red-600';

interface FieldProps {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  hint?: string;
}

function Field({ name, label, type = 'text', autoComplete, error, hint }: FieldProps) {
  const describedBy = [hint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean).join(' ');

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={inputClass}
      />
      {hint && (
        <p id={`${name}-hint`} className="mt-1 text-xs text-zinc-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate');
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </p>
      )}

      <fieldset>
        <legend className="block text-sm font-medium">I am</legend>
        <div className="mt-2 flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              value="candidate"
              checked={role === 'candidate'}
              onChange={() => setRole('candidate')}
            />
            Looking for a job
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              value="employer"
              checked={role === 'employer'}
              onChange={() => setRole('employer')}
            />
            Hiring for my company
          </label>
        </div>
        {errors.role && <p className="mt-1 text-sm text-red-700">{errors.role}</p>}
      </fieldset>

      <Field name="name" label="Full name" autoComplete="name" error={errors.name} />
      <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />

      {role === 'employer' && (
        <Field
          name="company_name"
          label="Company name"
          autoComplete="organization"
          error={errors.company_name}
          hint="We create your company page from this name."
        />
      )}

      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password}
        hint="At least 8 characters."
      />
      <Field
        name="password_confirmation"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.password_confirmation}
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
