'use server';

import { redirect } from 'next/navigation';

import { ApiError } from '@/lib/api/client';
import { saveMyProfile } from '@/lib/api/profiles';
import type { CandidateProfileInput } from '@/types/api/profiles';

export type ProfileField = 'headline' | 'location' | 'bio' | 'skills' | 'years_experience' | 'open_to_work';

export interface ProfileFormState {
  status: 'idle' | 'success' | 'error';
  message: string | null;
  fieldErrors: Partial<Record<ProfileField, string>>;
  values: CandidateProfileInput | null;
}

const FIELDS: readonly ProfileField[] = ['headline', 'location', 'bio', 'skills', 'years_experience', 'open_to_work'];

function optionalText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? null : text;
}

function readInput(formData: FormData): CandidateProfileInput {
  const skills = String(formData.get('skills') ?? '')
    .split(',')
    .map((skill) => skill.trim())
    .filter((skill) => skill !== '');

  return {
    headline: String(formData.get('headline') ?? '').trim(),
    location: optionalText(formData.get('location')),
    bio: optionalText(formData.get('bio')),
    skills,
    years_experience: Number(formData.get('years_experience') ?? 0),
    open_to_work: formData.get('open_to_work') === 'on',
  };
}

/**
 * Maps API field errors onto form fields. Item errors such as "skills.3" belong to the
 * single comma-separated skills input, so the first message per field wins.
 */
function toFieldErrors(errors: Record<string, string[]> | undefined): ProfileFormState['fieldErrors'] {
  const fieldErrors: ProfileFormState['fieldErrors'] = {};

  for (const [key, messages] of Object.entries(errors ?? {})) {
    const field = key.split('.')[0] as ProfileField;
    if (FIELDS.includes(field) && fieldErrors[field] === undefined && messages.length > 0) {
      fieldErrors[field] = messages[0];
    }
  }

  return fieldErrors;
}

export async function saveProfileAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const input = readInput(formData);

  try {
    const profile = await saveMyProfile(input);

    return {
      status: 'success',
      message: 'Profile saved',
      fieldErrors: {},
      values: {
        headline: profile.headline,
        location: profile.location,
        bio: profile.bio,
        skills: profile.skills,
        years_experience: profile.years_experience,
        open_to_work: profile.open_to_work,
      },
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login?next=/profile');
    }

    if (error instanceof ApiError && error.status === 422) {
      return {
        status: 'error',
        message: 'Please fix the highlighted fields.',
        fieldErrors: toFieldErrors(error.errors),
        values: input,
      };
    }

    return {
      status: 'error',
      message: 'Your profile could not be saved. Please try again.',
      fieldErrors: {},
      values: input,
    };
  }
}
