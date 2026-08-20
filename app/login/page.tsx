import Link from "next/link";

import { LoginForm } from "@/src/components/auth/login-form";

interface LoginPageProps {
  searchParams?: {
    callbackUrl?: string;
  };
}

function getSafeCallbackUrl(candidate?: string): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/";
  }

  return candidate;
}

/**
 * Renders the public credentials sign-in route with a modern, high-end visual layout.
 *
 * @param searchParams - Optional Auth.js callback destination from middleware.
 * @returns The sleek login screen with the credential form.
 */
export default function LoginPage({ searchParams }: LoginPageProps) {
  const callbackUrl = getSafeCallbackUrl(searchParams?.callbackUrl);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-16 font-sans">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-sky-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-[120px]" />

      <section className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="text-center">
          <Link
            className="group inline-flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            href="/"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-sky-400 text-xl font-black text-white shadow-lg shadow-sky-500/20 transition-transform duration-300 group-hover:scale-105">
              M
            </span>
            <div>
              <span className="block font-display text-2xl font-black tracking-tight text-white">
                Maintain<span className="text-sky-400">IQ</span>
              </span>
              <span className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
                Operations Platform
              </span>
            </div>
          </Link>

          <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in with your operational credentials to access your workspace.
          </p>
        </div>

        <div className="mt-8">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </section>
    </main>
  );
}
