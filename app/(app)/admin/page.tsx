import { IssueType, Priority, TicketStatus } from "@prisma/client";

import { AdminTicketManagement } from "@/src/components/admin-ticket-management";
import { requireRole } from "@/src/server/auth/guards";
import {
  getAdminDashboardMetrics,
  listAdminTickets,
  listTechniciansForAdmin,
} from "@/src/server/services/tickets";

const metricLabels = {
  total: "All tickets",
  open: "Open workload",
  unassigned: "Unassigned",
  inProgress: "In progress",
} as const;

/**
 * Renders the protected administrative dashboard with server-authorized
 * operational metrics, technician roster, ticket management, and AI review.
 *
 * @returns The administrator workspace.
 */
export default async function AdminPage() {
  const session = await requireRole("ADMIN");
  const actor = { id: session.user.id, role: session.user.role };
  const [metrics, tickets, technicians] = await Promise.all([
    getAdminDashboardMetrics(actor),
    listAdminTickets(actor, {}),
    listTechniciansForAdmin(actor),
  ]);

  const metricValues = {
    total: metrics.total,
    open: metrics.open,
    unassigned: metrics.unassigned,
    inProgress: metrics.inProgress,
  } as const;

  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          MaintainIQ · Administration
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Operational control center
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Review work queues, assign qualified technicians, and retain an
          auditable human review whenever AI triage is overridden.
        </p>
      </section>

      <section
        aria-label="Operational metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {Object.entries(metricLabels).map(([key, label]) => (
          <article
            key={key}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {metricValues[key as keyof typeof metricValues]}
            </p>
          </article>
        ))}
      </section>

      <section
        aria-labelledby="technician-roster-title"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
              Eligible assignment roster
            </p>
            <h2
              id="technician-roster-title"
              className="mt-2 text-2xl font-bold text-slate-950"
            >
              Technicians
            </h2>
          </div>
          <p className="text-sm text-slate-600">
            {technicians.length} available technician
            {technicians.length === 1 ? "" : "s"}
          </p>
        </div>

        <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {technicians.map((technician) => (
            <li
              key={technician.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p className="font-semibold text-slate-950">{technician.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {technician.jobTitle ?? technician.email}
              </p>
              <p className="mt-3 text-sm font-medium text-sky-800">
                {technician._count.assignedTickets} open assignment
                {technician._count.assignedTickets === 1 ? "" : "s"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <AdminTicketManagement
        tickets={tickets}
        technicians={technicians}
        issueTypes={Object.values(IssueType)}
        priorities={Object.values(Priority)}
        statuses={Object.values(TicketStatus)}
      />
    </div>
  );
}
