import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-brand-700 dark:text-brand-500">404</h1>
      <p className="mt-2 max-w-sm text-gray-600 dark:text-gray-400">
        This route doesn&apos;t exist — much like a direct bus from here to Hubli Airport at
        3 AM. Let&apos;s get you back.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
      >
        Back to Home
      </Link>
    </main>
  );
}
