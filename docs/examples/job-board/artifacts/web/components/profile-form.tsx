'use client';

import { useActionState } from 'react';

import { saveProfileAction, type ProfileFormState } from '@/app/(account)/profile/actions';
import type { CandidateProfile } from '@/types/api/profiles';

interface ProfileFormProps {
  profile: CandidateProfile | null;
}

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

export function ProfileForm({ profile }: ProfileFormProps) {
  const initialState: ProfileFormState = { status: 'idle', message: null, fieldErrors: {}, values: profile };
  const [state, formAction, pending] = useActionState(saveProfileAction, initialState);

  const values = state.values;
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="max-w-xl space-y-5" noValidate>
      {state.message && (
        <p
          role="status"
          className={
            state.status === 'success'
              ? 'rounded-md bg-green-50 px-3 py-2 text-sm text-green-800'
              : 'rounded-md bg-red-50 px-3 py-2 text-sm text-red-800'
          }
        >
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="headline" className="block text-sm font-medium">
          Headline
        </label>
        <input
          id="headline"
          name="headline"
          required
          minLength={3}
          maxLength={120}
          defaultValue={values?.headline ?? ''}
          aria-invalid={errors.headline ? true : undefined}
          aria-describedby={errors.headline ? 'headline-error' : undefined}
          className={inputClass}
        />
        <FieldError id="headline-error" message={errors.headline} />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium">
          Location
        </label>
        <input
          id="location"
          name="location"
          maxLength={120}
          defaultValue={values?.location ?? ''}
          aria-invalid={errors.location ? true : undefined}
          aria-describedby={errors.location ? 'location-error' : undefined}
          className={inputClass}
        />
        <FieldError id="location-error" message={errors.location} />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={5}
          maxLength={2000}
          defaultValue={values?.bio ?? ''}
          aria-invalid={errors.bio ? true : undefined}
          aria-describedby={errors.bio ? 'bio-error' : undefined}
          className={inputClass}
        />
        <FieldError id="bio-error" message={errors.bio} />
      </div>

      <div>
        <label htmlFor="skills" className="block text-sm font-medium">
          Skills
        </label>
        <input
          id="skills"
          name="skills"
          defaultValue={values?.skills.join(', ') ?? ''}
          aria-invalid={errors.skills ? true : undefined}
          aria-describedby={errors.skills ? 'skills-hint skills-error' : 'skills-hint'}
          className={inputClass}
        />
        <p id="skills-hint" className="mt-1 text-xs text-zinc-500">
          Comma-separated, up to 20. &ldquo;PHP&rdquo; and &ldquo;php&rdquo; count as the same skill.
        </p>
        <FieldError id="skills-error" message={errors.skills} />
      </div>

      <div>
        <label htmlFor="years_experience" className="block text-sm font-medium">
          Years of experience
        </label>
        <input
          id="years_experience"
          name="years_experience"
          type="number"
          min={0}
          max={60}
          required
          defaultValue={values?.years_experience ?? 0}
          aria-invalid={errors.years_experience ? true : undefined}
          aria-describedby={errors.years_experience ? 'years_experience-error' : undefined}
          className={inputClass}
        />
        <FieldError id="years_experience-error" message={errors.years_experience} />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="open_to_work"
          name="open_to_work"
          type="checkbox"
          defaultChecked={values?.open_to_work ?? true}
          className="h-4 w-4"
        />
        <label htmlFor="open_to_work" className="text-sm">
          Open to work
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
