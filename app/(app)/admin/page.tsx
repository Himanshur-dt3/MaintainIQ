import { IssueType, Priority, TicketStatus } from "@prisma/client";

import { AdminTicketManagement } from "@/src/components/admin-ticket-management";
import { requireRole } from "@/src/server/auth/guards";
import {
  getAdminDashboardMetrics,
  listAdminTickets,
  listTechniciansForAdmin,
} from "@/src/server/services/tickets";

const kpiCards = [
  {
    key: "total" as const,
    label: "Total Tickets",
    icon: "📋",
  },
  {
    key: "open" as const,
    label: "Open Workload",
    icon: "🔓",
  },
  {
    key: "unassigned" as const,
    label: "Unassigned",
    icon: "⏳",
  },
  {
    key: "inProgress" as const,
    label: "In Progress",
    icon: "⚙",
  },
];

/**
 * Renders the protected administrative dashboard with server-authorized
 * operational metrics, technician roster, ticket management, and AI review.
 */
export default async function AdminPage() {
  const session = await requireRole("ADMIN");
  const actor = { id: session.user.id, role: session.user.role };
  const [metrics, tickets, technicians] = await Promise.all([
    getAdminDashboardMetrics(actor),
    listAdminTickets(actor, {}),
    listTechniciansForAdmin(actor),
  ]);

  const kpiValues = {
    total: metrics.total,
    open: metrics.open,
    unassigned: metrics.unassigned,
    inProgress: metrics.inProgress,
  };

  // Recent activity — last 6 history events across all tickets
  const recentActivity = tickets
    .flatMap((t) =>
      (t.history ?? []).map((h) => ({
        ticketTitle: t.title,
        action: h.action,
        actorName: h.actor?.name ?? "System",
        createdAt: h.createdAt,
      })),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <div className="flex h-full gap-6 font-sans text-slate-100">
      {/* ── Main content column ──────────────────────────────────────── */}
      <div className="flex flex-1 min-w-0 flex-col gap-6">

        {/* Page header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Operations Control Center
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Welcome back, <span className="font-semibold text-slate-200">{session.user.name}</span>
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {kpiCards.map(({ key, label, icon }) => (
            <div
              key={key}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400">{label}</p>
                <span className="text-base">{icon}</span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-white">
                {kpiValues[key]}
              </p>
            </div>
          ))}
        </div>

        {/* Technician roster */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Assignment Roster
              </p>
              <h2 className="mt-0.5 font-display text-base font-bold text-white">
                Active Technicians
              </h2>
            </div>
            <span className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-400">
              {technicians.length} active
            </span>
          </div>
          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {technicians.map((technician) => (
              <li
                key={technician.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 font-display text-sm font-bold text-indigo-300 ring-1 ring-indigo-500/30">
                    {technician.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{technician.name}</p>
                    <p className="text-[10px] text-slate-500">{technician.jobTitle ?? technician.email}</p>
                  </div>
                </div>
                <span className="rounded-full bg-indigo-600/10 px-2.5 py-0.5 text-xs font-bold text-indigo-400 ring-1 ring-indigo-500/20">
                  {technician._count.assignedTickets} open
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Ticket management (full list) */}
        <AdminTicketManagement
          tickets={tickets}
          technicians={technicians}
          issueTypes={Object.values(IssueType)}
          priorities={Object.values(Priority)}
          statuses={Object.values(TicketStatus)}
        />
      </div>

      {/* ── Right: Recent Activity panel ─────────────────────────────── */}
      <aside className="hidden w-72 shrink-0 xl:block">
        <div className="sticky top-0 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Live Feed
          </p>
          <h2 className="mt-0.5 font-display text-base font-bold text-white">
            Recent Activity
          </h2>

          <ul className="mt-5 space-y-4">
            {recentActivity.length === 0 ? (
              <li className="text-xs text-slate-500">No recent activity yet.</li>
            ) : (
              recentActivity.map((event, i) => (
                <li key={i} className="flex gap-3 text-xs">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-[9px] font-bold text-indigo-400 ring-1 ring-indigo-500/20">
                    {event.actorName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{event.actorName}</p>
                    <p className="text-slate-500 truncate">
                      {event.action.replaceAll("_", " ").toLowerCase()} on{" "}
                      <span className="font-medium text-slate-400">{event.ticketTitle}</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                      {new Date(event.createdAt).toLocaleString("en-US", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </aside>
    </div>
  );
}
