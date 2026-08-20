"use client";

import type { Role } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface ApplicationShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  children: React.ReactNode;
}

const roleNavigation: Record<
  Role,
  Array<{ href: string; label: string; icon: string }>
> = {
  ADMIN: [
    { href: "/admin", label: "Operations Overview", icon: "⬡" },
  ],
  TECHNICIAN: [
    { href: "/technician", label: "My Workload", icon: "⬡" },
  ],
  REPORTER: [
    { href: "/reporter", label: "Report Issue", icon: "⬡" },
  ],
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  TECHNICIAN: "Technician",
  REPORTER: "Reporter",
};

/**
 * Renders the authenticated workspace chrome with a fixed sidebar and top bar.
 *
 * @param user - Server-authenticated user identity and persisted role.
 * @param children - Protected workspace content.
 * @returns The shared application shell.
 */
export function ApplicationShell({ user, children }: ApplicationShellProps) {
  const pathname = usePathname();
  const navigation = roleNavigation[user.role];
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n.charAt(0))
    .join("");

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0f1a] font-sans text-slate-100 antialiased">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-[#0d1120]">
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-slate-800 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-display text-sm font-black text-white">
            M
          </span>
          <span className="font-display text-base font-black tracking-tight text-white">
            Maintain<span className="text-indigo-400">IQ</span>
          </span>
        </div>

        {/* Nav links */}
        <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Navigation
          </p>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                }`}
              >
                <span className="text-[10px] opacity-50">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User card at bottom */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 font-display text-sm font-bold text-indigo-300 ring-1 ring-indigo-500/30">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-200">{user.name}</p>
              <p className="truncate text-[10px] text-slate-500">{roleLabels[user.role]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800/60 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-[#0d1120]/80 px-6 backdrop-blur-xl">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-500 w-56">
            <span>🔍</span>
            <span>Search tickets…</span>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-4">
            {/* Notification bell placeholder */}
            <button
              type="button"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 transition"
              aria-label="Notifications"
            >
              🔔
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-indigo-500" />
            </button>

            {/* Avatar */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/20 font-display text-sm font-bold text-indigo-300 ring-1 ring-indigo-500/30">
                {initials}
              </div>
              <span className="hidden text-xs font-semibold text-slate-300 sm:block">{user.name}</span>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
