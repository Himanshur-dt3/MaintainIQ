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
  Array<{
    href: string;
    label: string;
  }>
> = {
  ADMIN: [{ href: "/admin", label: "Operations overview" }],
  TECHNICIAN: [{ href: "/technician", label: "My assigned work" }],
  REPORTER: [{ href: "/reporter", label: "Report an issue" }],
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  TECHNICIAN: "Technician",
  REPORTER: "Reporter",
};

/**
 * Renders the responsive authenticated workspace chrome and role-specific navigation.
 *
 * @param user - Server-authenticated user identity and persisted role.
 * @param children - Protected workspace content.
 * @returns The shared application shell.
 */
export function ApplicationShell({ user, children }: ApplicationShellProps) {
  const pathname = usePathname();
  const navigation = roleNavigation[user.role];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href={navigation[0].href}
            className="group flex items-center gap-3 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-700 text-lg font-bold text-white shadow-sm">
              M
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight text-slate-950">
                MaintainIQ
              </span>
              <span className="block text-xs font-medium text-slate-500">
                Maintenance operations
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{roleLabels[user.role]}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav
          aria-label="Primary navigation"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <ul className="flex gap-1 overflow-x-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 ${
                      isActive
                        ? "border-sky-700 text-sky-800"
                        : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
