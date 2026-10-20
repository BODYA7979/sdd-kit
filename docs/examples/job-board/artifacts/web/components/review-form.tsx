'use client';

import { useActionState, useState } from 'react';

import { submitReviewAction, type ReviewFormState } from '@/app/companies/[slug]/reviews/actions';

interface ReviewFormProps {
  slug: string;
  companyName: string;
}

const initialState: ReviewFormState = { status: 'idle', message: null, fieldErrors: {} };

const inputClass =
  'mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm aria-[invalid=true]:border-red-600';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="mt-1 text-sm text-red-700">
      {message}
    </p>
  );
}

export function ReviewForm({ slug, companyName }: ReviewFormProps) {
  const [state, formAction, pending] = useActionState(submitReviewAction.bind(null, slug), initialState);
  const errors = state.fieldErrors;
  // Controlled fields: React 19 resets uncontrolled inputs after every form action, including one that returns a validation error.
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  if (state.status === 'success') {
    return (
      <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="max-w-xl space-y-5" noValidate>
      <h2 className="text-lg font-semibold">Review {companyName}</h2>

      {state.message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </p>
      )}

      <fieldset aria-describedby={errors.rating ? 'rating-error' : undefined}>
        <legend className="block text-sm font-medium">Rating</legend>
        <div className="mt-1 flex gap-4">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="rating"
                value={value}
                required
                checked={rating === value}
                onChange={() => setRating(value)}
              />
              {value}
            </label>
          ))}
        </div>
        <FieldError id="rating-error" message={errors.rating} />
      </fieldset>

      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={5}
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'title-error' : undefined}
          className={inputClass}
        />
        <FieldError id="title-error" message={errors.title} />
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-medium">
          Your review
        </label>
        <textarea
          id="body"
          name="body"
          rows={6}
          required
          minLength={20}
          maxLength={2000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-invalid={errors.body ? true : undefined}
          aria-describedby={errors.body ? 'body-hint body-error' : 'body-hint'}
          className={inputClass}
        />
        <p id="body-hint" className="mt-1 text-xs text-zinc-500">
          20 to 2000 characters. Your name is never shown publicly; reviews appear as &ldquo;Verified candidate&rdquo;
          after moderation.
        </p>
        <FieldError id="body-error" message={errors.body} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}
