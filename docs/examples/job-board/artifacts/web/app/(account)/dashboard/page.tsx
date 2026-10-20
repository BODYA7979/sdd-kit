import type { Metadata } from 'next';
import Link from 'next/link';

import { requireUser } from '@/lib/session';
import type { UserRole } from '@/types/api/auth';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export const dynamic = 'force-dynamic';

const NEXT_STEPS: Record<UserRole, { href: string; label: string; text: string }[]> = {
  candidate: [
    { href: '/profile', label: 'Complete your profile', text: 'You need a profile before you can apply.' },
    { href: '/jobs', label: 'Browse open jobs', text: 'Search by keyword, location and job type.' },
    { href: '/applications', label: 'Your applications', text: 'See every job you have applied to.' },
  ],
  employer: [
    { href: '/employer/applications', label: 'Applications', text: "Candidates who applied to your company's jobs." },
  ],
  admin: [{ href: '/admin/reviews', label: 'Review queue', text: 'Approve or reject pending company reviews.' }],
};

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-zinc-600">Signed in as {user.email}.</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {NEXT_STEPS[user.role].map((step) => (
          <li key={step.href} className="rounded-lg border border-zinc-200 p-4">
            <Link href={step.href} className="font-medium text-blue-700 hover:underline">
              {step.label}
            </Link>
            <p className="mt-1 text-sm text-zinc-600">{step.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
