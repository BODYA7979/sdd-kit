import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { RegisterForm } from '@/components/register-form';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Create an account',
};

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  if (await getCurrentUser()) {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-600">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-blue-700 hover:underline">
          Sign in
        </Link>
      </p>
      <RegisterForm />
    </main>
  );
}
