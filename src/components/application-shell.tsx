"use client";

import type { Role } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { NotificationButton } from "@/src/components/notification-button";

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
    { href: "/admin", label: "Dashboard", icon: "D" },
    { href: "/admin/maintenance-plans", label: "Maintenance Plans", icon: "M" },
    { href: "/admin/past-tickets", label: "Past Tickets", icon: "T" },
    { href: "/admin/reviews", label: "Reviews", icon: "★" },
  ],
  TECHNICIAN: [
    { href: "/technician", label: "My Workload", icon: "W" },
    { href: "/technician/reviews", label: "Reviews", icon: "★" },
  ],
  REPORTER: [
    { href: "/reporter", label: "Report Issue", icon: "R" },
    { href: "/reporter/reviews", label: "Reviews", icon: "★" },
  ],
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  TECHNICIAN: "Technician",
  REPORTER: "Reporter",
};

export function ApplicationShell({ user, children }: ApplicationShellProps) {
  const pathname = usePathname();
  const navigation = roleNavigation[user.role];

  const initials =
    user.name
      ?.split(" ")
      .slice(0, 2)
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="flex h-screen overflow-hidden bg-[#111315] font-sans text-[#f1f1ef] antialiased">

      {/* SIDEBAR */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#303438] bg-[#17191b] md:flex">

        {/* Logo */}
        <div className="flex h-[68px] items-center border-b border-[#303438] px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#e8e8e3] text-sm font-black text-[#17191b]">
              M
            </div>

            <span className="text-[17px] font-bold tracking-tight text-[#f4f4f0]">
              Maintain<span className="text-[#aeb3ad]">IQ</span>
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Primary navigation"
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-6"
        >
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
            Workspace
          </p>

          {navigation.map((item, index) => {
            const isFirst = index === 0;
            const isActive = isFirst && pathname === item.href;

            return (
              <Link
                key={`${item.label}-${index}`}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition ${
                  isActive
                    ? "bg-[#e8e8e3] text-[#17191b]"
                    : "text-[#9da29d] hover:bg-[#232628] hover:text-[#eeeeea]"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${
                    isActive
                      ? "bg-[#17191b] text-[#e8e8e3]"
                      : "bg-[#25282a] text-[#898e89] group-hover:text-[#d9d9d4]"
                  }`}
                >
                  {item.icon}
                </span>

                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-[#303438] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2a2d2f] text-xs font-bold text-[#e1e2dd] ring-1 ring-[#42464a]">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#e8e8e3]">
                {user.name}
              </p>
              <p className="truncate text-[10px] text-[#777c77]">
                {roleLabels[user.role]}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-3 w-full rounded-md border border-[#383c3f] bg-[#222527] py-2 text-xs font-semibold text-[#aeb3ae] transition hover:bg-[#2a2d30] hover:text-[#f1f1ed] focus:outline-none focus:ring-2 focus:ring-[#777c77]"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* TOP HEADER */}
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#303438] bg-[#151718] px-4 sm:px-6">

          {/* Mobile brand */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e8e8e3] text-xs font-black text-[#17191b]">
              M
            </div>
            <span className="text-sm font-bold">MaintainIQ</span>
          </div>

          {/* Search */}
          <div className="hidden w-full max-w-md md:flex">
            <div className="flex h-10 w-full items-center rounded-md border border-[#35393c] bg-[#1d2022] px-3 text-sm text-[#858a85] transition focus-within:border-[#5e635f]">
              <span className="mr-2 text-base text-[#858a85]">⌕</span>
              <span>Search...</span>
            </div>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3 sm:gap-5">

            <NotificationButton />

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a2d2f] text-xs font-bold text-[#e1e2dd] ring-1 ring-[#42464a]">
                {initials}
              </div>

              <div className="hidden sm:block">
                <p className="max-w-[140px] truncate text-xs font-semibold text-[#e8e8e3]">
                  {user.name}
                </p>
                <p className="text-[10px] text-[#777c77]">
                  {roleLabels[user.role]}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#111315] p-4 sm:p-6 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}





