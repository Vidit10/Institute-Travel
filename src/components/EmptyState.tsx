// Small shared "nothing here yet" treatment — a simple line icon plus a
// caller-supplied message, replacing the plain-text-only empty states that
// used to sit on their own. Deliberately just an icon, no illustration
// asset, so it stays lightweight.
export default function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 py-8 text-center dark:border-gray-800">
      <svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden className="text-gray-300 dark:text-gray-700">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>
    </div>
  );
}
