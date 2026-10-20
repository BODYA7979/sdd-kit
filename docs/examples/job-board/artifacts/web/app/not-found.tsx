import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-gray-500">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-gray-600">
        This page does not exist, or the job is no longer open.
      </p>
      <Link href="/jobs" className="mt-6 inline-block font-medium text-blue-700 hover:underline">
        Browse open jobs
      </Link>
    </main>
  );
}
