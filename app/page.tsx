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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Background radial glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-emerald-500/10 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-bold text-sky-400 ring-1 ring-sky-500/20">
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          <span>MaintainIQ Operations Engine</span>
        </div>

        <h1 className="mt-8 font-display text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
          Maintenance work, <br />
          <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-sky-200 bg-clip-text text-transparent">
            organized from report to resolution.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Role-aware maintenance portal with AI issue triage, automated asset linking, real-time technician queue management, and durable audit history.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-sky-500/25 transition duration-300 hover:shadow-sky-500/40 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500"
            href="/login"
          >
            <span>Access Workspace Portal</span>
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid gap-6 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 font-bold text-sky-400">
              ⚡
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-white">AI Issue Triage</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Server-side classification automatically assigns priority and links relevant location assets.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 font-bold text-indigo-400">
              🛡️
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-white">Role Access Control</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Server-enforced boundaries tailored for Administrators, Technicians, and Reporters.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 font-bold text-emerald-400">
              📜
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-white">Durable Audit Trail</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Immutable timeline history tracking every state change, override, and resolution note.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
