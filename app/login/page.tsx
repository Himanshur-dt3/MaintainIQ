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
 * Renders the public credentials sign-in route.
 *
 * @param searchParams - Optional Auth.js callback destination from middleware.
 * @returns The login screen with the credential form.
 */
export default function LoginPage({ searchParams }: LoginPageProps) {
  const callbackUrl = getSafeCallbackUrl(searchParams?.callbackUrl);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
      <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link
          className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2"
          href="/"
        >
          MaintainIQ
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950">
          Sign in to your workspace
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Use your maintained account credentials to access the appropriate
          maintenance workflow.
        </p>

        <div className="mt-7">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </section>
    </main>
  );
}
