"use client";

interface AuthenticatedErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Displays a controlled recovery UI when an authenticated workspace fails to render.
 *
 * @param error - Error boundary payload for diagnostics.
 * @param reset - Next.js retry callback.
 * @returns A recoverable error state.
 */
export default function AuthenticatedError({
  error,
  reset,
}: AuthenticatedErrorProps) {
  return (
    <section
      aria-labelledby="workspace-error-title"
      className="max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-6"
    >
      <h1 id="workspace-error-title" className="text-xl font-bold text-rose-950">
        We couldn’t load this workspace
      </h1>
      <p className="mt-2 text-sm leading-6 text-rose-900">
        Your account remains protected. Please try loading the workspace again.
      </p>
      {error.digest ? (
        <p className="mt-3 text-xs text-rose-800">Reference: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-700 focus:ring-offset-2"
      >
        Try again
      </button>
    </section>
  );
}
