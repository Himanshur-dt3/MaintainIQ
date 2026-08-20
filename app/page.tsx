import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, getRoleHomePath } from "@/src/auth";

/**
 * Renders the public MaintainIQ entry point or sends signed-in users to their
 * role-specific workspace.
 *
 * @returns A concise landing page for unauthenticated visitors.
 */
export default async function HomePage() {
  const session = await auth();

  if (session?.user?.role) {
    redirect(getRoleHomePath(session.user.role));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16">
      <section className="max-w-2xl space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          MaintainIQ
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Maintenance work, organized from report to resolution.
        </h1>
        <p className="text-lg leading-8 text-slate-700">
          Sign in to access the maintenance workspace and the workflow
          appropriate to your role.
        </p>
        <Link
          className="inline-flex rounded-md bg-sky-700 px-4 py-2 font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2"
          href="/login"
        >
          Go to sign in
        </Link>
      </section>
    </main>
  );
}
