import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <nav aria-label="Main" className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3 text-sm">
        <Link href="/jobs" className="text-base font-semibold tracking-tight text-gray-900">
          Hireboard
        </Link>
        <Link href="/jobs" className="text-gray-700 hover:text-gray-900">
          Jobs
        </Link>
        <span className="flex-1" />
        <Link href="/login" className="text-gray-700 hover:text-gray-900">
          Sign in
        </Link>
        <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
          Dashboard
        </Link>
      </nav>
    </header>
  );
}
