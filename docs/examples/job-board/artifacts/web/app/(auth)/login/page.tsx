import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/login-form';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Sign in',
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getCurrentUser()) {
    redirect('/dashboard');
  }

  const { next } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-600">
        New to Hireboard?{' '}
        <Link href="/register" className="font-medium text-blue-700 hover:underline">
          Create an account
        </Link>
      </p>
      <LoginForm next={typeof next === 'string' ? next : undefined} />
    </main>
  );
}
