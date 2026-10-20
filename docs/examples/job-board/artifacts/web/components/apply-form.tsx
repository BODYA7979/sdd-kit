'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { submitApplicationAction, type ApplyFormState } from '@/app/jobs/[id]/apply/actions';

const initialState: ApplyFormState = { status: 'idle' };

export function ApplyForm({ jobId }: { jobId: string }) {
  const [state, formAction, pending] = useActionState(submitApplicationAction, initialState);
  const fieldError = state.fieldErrors?.cover_letter;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="job_id" value={jobId} />

      {state.code === 'profile_required' ? (
        <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {state.message}{' '}
          <Link href="/profile" className="font-medium underline">
            Go to your profile
          </Link>
        </div>
      ) : state.status === 'error' && !fieldError ? (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {state.message}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="cover_letter" className="block text-sm font-medium text-zinc-900">
          Cover letter <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="cover_letter"
          name="cover_letter"
          rows={8}
          maxLength={2000}
          defaultValue={state.coverLetter}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? 'cover_letter-error' : 'cover_letter-hint'}
          className="block w-full rounded-md border border-zinc-300 p-3 text-sm focus:border-zinc-900 focus:outline-none"
        />
        {fieldError ? (
          <p id="cover_letter-error" className="text-sm text-red-700">
            {fieldError}
          </p>
        ) : (
          <p id="cover_letter-hint" className="text-sm text-zinc-500">
            Up to 2,000 characters. The employer also sees your name, email and profile headline.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send application'}
      </button>
    </form>
  );
}
