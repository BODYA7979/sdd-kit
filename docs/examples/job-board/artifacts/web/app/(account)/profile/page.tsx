import type { Metadata } from 'next';

import { ProfileForm } from '@/components/profile-form';
import { getMyProfile } from '@/lib/api/profiles';
import { requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your profile',
};

export default async function ProfilePage() {
  await requireUser(['candidate']);
  const profile = await getMyProfile();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Only you can see this page. Employers see your name, email and headline when you apply to one of their jobs.
        </p>
      </header>
      {profile === null && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You need a profile before you can apply to jobs.
        </p>
      )}
      <ProfileForm profile={profile} />
    </section>
  );
}
