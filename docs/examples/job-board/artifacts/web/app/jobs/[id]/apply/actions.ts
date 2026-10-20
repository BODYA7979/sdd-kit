'use server';

import { redirect } from 'next/navigation';

import { submitApplication } from '@/lib/api/applications';
import { ApiError } from '@/lib/api/client';

export interface ApplyFormState {
  status: 'idle' | 'error';
  code?: string;
  message?: string;
  fieldErrors?: { cover_letter?: string };
  coverLetter?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  profile_required: 'Create your candidate profile before you apply.',
  job_not_open: 'This job is no longer accepting applications.',
  already_applied: 'You have already applied to this job.',
  job_not_found: 'This job no longer exists.',
  forbidden: 'Only candidate accounts can apply to jobs.',
};

export async function submitApplicationAction(_previous: ApplyFormState, formData: FormData): Promise<ApplyFormState> {
  const jobId = String(formData.get('job_id') ?? '');
  const coverLetter = String(formData.get('cover_letter') ?? '').trim();

  try {
    await submitApplication(jobId, coverLetter === '' ? {} : { cover_letter: coverLetter });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error;
    }

    if (error.status === 401) {
      redirect(`/login?next=${encodeURIComponent(`/jobs/${jobId}/apply`)}`);
    }

    return {
      status: 'error',
      code: error.code,
      message: ERROR_MESSAGES[error.code] ?? error.message,
      fieldErrors: { cover_letter: error.errors.cover_letter?.[0] },
      coverLetter,
    };
  }

  redirect('/applications?applied=1');
}
