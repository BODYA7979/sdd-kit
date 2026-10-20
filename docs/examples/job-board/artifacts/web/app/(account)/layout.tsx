import Link from 'next/link';

import { logoutAction } from '@/app/(account)/actions';
import { requireUser } from '@/lib/session';
import type { UserRole } from '@/types/api/auth';

const NAV: Record<UserRole, { href: string; label: string }[]> = {
  candidate: [
    { href: '/profile', label: 'Profile' },
    { href: '/applications', label: 'Applications' },
  ],
  employer: [{ href: '/employer/applications', label: 'Applications' }],
  admin: [{ href: '/admin/reviews', label: 'Review queue' }],
};

export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav aria-label="Account" className="mb-8 flex flex-wrap items-center gap-4 border-b border-zinc-200 pb-4 text-sm">
        <Link href="/dashboard" className="font-medium text-zinc-900">
          Dashboard
        </Link>
        {NAV[user.role].map((item) => (
          <Link key={item.href} href={item.href} className="text-zinc-700 hover:text-zinc-900">
            {item.label}
          </Link>
        ))}
        <span className="flex-1" />
        <span className="text-zinc-500">
          {user.name} · {user.role}
        </span>
        <form action={logoutAction}>
          <button type="submit" className="text-zinc-700 underline hover:text-zinc-900">
            Sign out
          </button>
        </form>
      </nav>
      <main>{children}</main>
    </div>
  );
}
