import Link from "next/link";
import { IssueType, Priority, TicketStatus } from "@prisma/client";

import { AdminTicketManagement } from "@/src/components/admin-ticket-management";
import { MaintenanceCopilot } from "@/src/components/maintenance-copilot";
import { AdminMaintenanceIntelligence } from "@/src/components/admin-maintenance-intelligence";
import { AdminDashboardAnalytics } from "@/src/components/admin-dashboard-analytics";
import { getAssetMaintenanceInsights } from "@/src/server/services/maintenance-intelligence";
import { getTechnicianAnalytics } from "@/src/server/services/technician-analytics";
import { generateMaintenanceAiBrief } from "@/src/server/services/claude";
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
    shortLabel: "Tickets",
    href: "/admin/tickets?scope=all",
  },
  {
    key: "open" as const,
    label: "Open Workload",
    shortLabel: "Open",
    href: "/admin/tickets?scope=open",
  },
  {
    key: "unassigned" as const,
    label: "Unassigned",
    shortLabel: "Unassigned",
    href: "/admin/tickets?scope=unassigned",
  },
  {
    key: "inProgress" as const,
    label: "In Progress",
    shortLabel: "Progress",
    href: "/admin/tickets?scope=in-progress",
  },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const session = await requireRole("ADMIN");
  const actor = {
    id: session.user.id,
    role: session.user.role,
  };

  const [metrics, allTickets, technicians, technicianAnalytics] = await Promise.all([
    getAdminDashboardMetrics(actor),
    listAdminTickets(actor, {}),
    listTechniciansForAdmin(actor),
    getTechnicianAnalytics(actor),
  ]);

  let maintenanceInsights: Awaited<
    ReturnType<typeof getAssetMaintenanceInsights>
  > = [];

  try {
    maintenanceInsights = await getAssetMaintenanceInsights();
  } catch (error) {
    console.error("Maintenance intelligence unavailable:", error);
  }

  const searchQuery = (searchParams?.q ?? "").trim();

  const normalizedSearch = searchQuery.toLowerCase();

  const filteredTickets = normalizedSearch
    ? allTickets.filter((ticket) => {
        const searchableText = [
          ticket.id,
          ticket.title,
          ticket.location,
          ticket.issueType,
          ticket.priority,
          ticket.status,
          ticket.asset?.name,
          ticket.reporter?.name,
          ticket.technician?.name,
          ticket.aiAnalysis?.issueType,
          ticket.aiAnalysis?.priority,
          ticket.aiAnalysis?.suggestedAction,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
    : allTickets;

  const tickets = filteredTickets.slice(0, 6);
  const priorityMaintenanceInsights = maintenanceInsights
    .filter((item) => item.riskLevel !== "LOW")
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      return b.healthScore - a.healthScore;
    })
    .slice(0, 4);
  let maintenanceAiBrief = {
    headline: "Maintenance intelligence unavailable",
    summary: "The maintenance intelligence service is temporarily unavailable. Review the asset risk signals and maintenance queue directly.",
    priorityAsset: "No AI priority available",
    priorityReason: "AI analysis could not be generated.",
    recommendedAction: "Review high-risk assets and overdue maintenance plans.",
    systemicPattern: "No systemic pattern available.",
  };

  try {
    maintenanceAiBrief = await generateMaintenanceAiBrief(maintenanceInsights);
  } catch (error) {
    console.error("Maintenance AI brief unavailable:", error);
  }

  // Mutually exclusive ticket-status groups for the dashboard pie chart.
  const openCount = allTickets.filter(
    (ticket) =>
      ticket.status === "REPORTED" ||
      ticket.status === "ASSIGNED",
  ).length;

  const inProgressCount = allTickets.filter(
    (ticket) => ticket.status === "IN_PROGRESS",
  ).length;

  const resolvedCount = allTickets.filter(
    (ticket) => ticket.status === "RESOLVED",
  ).length;

const kpiValues = {
    total: metrics.total,
    open: metrics.open,
    unassigned: metrics.unassigned,
    inProgress: metrics.inProgress,
  };

  const recentActivity = tickets
    .flatMap((t) =>
      (t.history ?? []).map((h) => ({
        ticketTitle: t.title,
        action: h.action,
        actorName: h.actor?.name ?? "System",
        createdAt: h.createdAt,
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
    .slice(0, 8);


  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">

      {/* PAGE HEADER */}
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737873]">
            Operations
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#f0f0ec]">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-[#8e938e]">
            Welcome back,{" "}
            <span className="font-semibold text-[#d8d9d4]">
              {session.user.name}
            </span>
            . Here is your current maintenance overview.
          </p>
        </div>

        <Link
          href="/admin/assets"
          className="inline-flex w-fit items-center rounded-md border border-[#35393c] bg-[#181b1d] px-3 py-2 text-xs font-semibold text-[#aeb3ae] transition hover:border-[#5b605c] hover:bg-[#202326] hover:text-[#f0f0ec]"
        >
          View Assets
        </Link>
      </section>

      {/* SEARCH RESULTS */}
      {searchQuery ? (
        <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#5f9eea]">
                Dashboard Search
              </p>
              <h2 className="mt-1 text-base font-bold text-[#ededE9]">
                Results for &quot;{searchQuery}&quot;
              </h2>
            </div>

            <Link
              href="/admin"
              className="inline-flex w-fit items-center rounded-md border border-[#35393c] bg-[#202326] px-3 py-1.5 text-[11px] font-semibold text-[#aeb3ae] transition hover:border-[#4b5563] hover:bg-[#272b2e] hover:text-[#f0f0ec]"
            >
              Clear search
            </Link>
          </div>

          <div className="mt-4">
            {filteredTickets.length > 0 ? (
              <div className="divide-y divide-[#2b2f32] rounded-md border border-[#2b2f32]">
                {filteredTickets.slice(0, 8).map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/admin/tickets/${ticket.id}`}
                    className="group block px-4 py-3 transition hover:bg-[#20262b]"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[#ededE9] group-hover:text-[#7db7f5]">
                            {ticket.title}
                          </span>

                          <span className="rounded-full border border-[#3a3e41] bg-[#222527] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#929792]">
                            {ticket.status.replaceAll("_", " ")}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-[11px] text-[#737873]">
                          {ticket.asset?.name} · {ticket.location} · {ticket.issueType.replaceAll("_", " ")}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 text-[10px]">
                        <span className="text-[#8e938e]">
                          #{ticket.id.slice(0, 8)}
                        </span>

                        <span className="font-semibold text-[#7db7f5]">
                          {ticket.priority}
                        </span>

                        <span className="text-[#737873] transition group-hover:translate-x-0.5">
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-[#35393c] bg-[#151718] px-4 py-8 text-center">
                <p className="text-sm font-semibold text-[#c7cac5]">
                  No matching dashboard records
                </p>
                <p className="mt-1 text-[11px] text-[#686d68]">
                  Try a ticket name, asset, location, technician, issue type, or status.
                </p>
              </div>
            )}

            {filteredTickets.length > 8 ? (
              <p className="mt-3 text-[10px] text-[#686d68]">
                Showing 8 of {filteredTickets.length} matching tickets.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* KPI OVERVIEW */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map(({ key, label, href }) => (
          <Link
            key={key}
            href={href}
            className="group rounded-lg border border-[#303438] bg-[#181b1d] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[#555a56] hover:bg-[#1d2022]"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#737873]">
                {label}
              </p>

              <span className="h-1.5 w-1.5 rounded-full bg-[#737873] transition group-hover:bg-[#f0f0ec]" />
            </div>

            <p className="mt-2 text-3xl font-bold tracking-tight text-[#f0f0ec]">
              {kpiValues[key]}
            </p>

            <p className="mt-2 text-[10px] text-[#686d68]">
              Current system count
            </p>
          </Link>
        ))}
      </section>

            {/* PRIORITY OVERVIEW + AI BRIEF */}
      <AdminMaintenanceIntelligence
        insights={priorityMaintenanceInsights}
        aiBrief={maintenanceAiBrief}
      />
{/* MAINTENANCE COPILOT */}
      <section>
        <MaintenanceCopilot />
      </section>

      {/* TICKET OPERATIONS */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Workload Management
            </p>

            <h2 className="mt-1 text-base font-bold text-[#ededE9]">
              Ticket Operations
            </h2>

            <p className="mt-1 text-[11px] text-[#686d68]">
              Review, classify, assign, and manage active maintenance tickets.
            </p>
          </div>

          <Link
            href="/admin/past-tickets"
            className="hidden rounded-md border border-[#35393c] bg-[#181b1d] px-3 py-1.5 text-[10px] font-semibold text-[#929792] transition hover:border-[#555a56] hover:text-[#f0f0ec] sm:block"
          >
            Past Tickets
          </Link>
        </div>

        <AdminTicketManagement
          tickets={tickets}
          technicians={technicians}
          issueTypes={Object.values(IssueType)}
          priorities={Object.values(Priority)}
          statuses={Object.values(TicketStatus)}
        />
      </section>

      {/* ANALYTICS + ACTIVITY */}
      <AdminDashboardAnalytics
        counts={{
          open: openCount,
          inProgress: inProgressCount,
          resolved: resolvedCount,
        }}
        recentActivity={recentActivity}
      />
      {/* TECHNICIAN PERFORMANCE */}
      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="flex items-center justify-between border-b border-[#2d3033] pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Workforce
            </p>

            <h2 className="mt-1 text-base font-bold text-[#ededE9]">
              Technician Performance
            </h2>

            <p className="mt-1 text-[11px] text-[#686d68]">
              Current workload and service performance.
            </p>
          </div>

          <span className="rounded-md border border-[#35393c] bg-[#202326] px-2.5 py-1 text-[10px] font-semibold text-[#929792]">
            {technicianAnalytics.length} active
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {technicianAnalytics.map((analytics) => {
            const resolutionHours =
              analytics.performance.averageResolutionHours;
            const responseRate =
              analytics.performance.firstResponseRate;
            const slaRate =
              analytics.performance.slaComplianceRate;

            return (
              <article
                key={analytics.technician.id}
                className="rounded-md border border-[#303438] bg-[#141718] p-4 transition hover:border-[#454a4d]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#272a2c] text-xs font-bold text-[#d1d3ce]">
                      {analytics.technician.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#e1e2dd]">
                        {analytics.technician.name}
                      </p>

                      <p className="truncate text-[10px] text-[#666b66]">
                        {analytics.technician.jobTitle ??
                          analytics.technician.email}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-md border border-[#383c3f] bg-[#202326] px-2 py-1 text-[10px] font-semibold text-[#aeb3ae]">
                    {analytics.workload.openTickets} open
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <div className="rounded-md border border-[#2c3032] bg-[#1b1e20] p-2">
                    <p className="text-[8px] uppercase tracking-wider text-[#666b66]">
                      Resolved
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#e1e2dd]">
                      {analytics.performance.resolvedTickets}
                    </p>
                  </div>

                  <div className="rounded-md border border-[#2c3032] bg-[#1b1e20] p-2">
                    <p className="text-[8px] uppercase tracking-wider text-[#666b66]">
                      Avg.
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#e1e2dd]">
                      {resolutionHours === null
                        ? "-"
                        : `${resolutionHours.toFixed(1)}h`}
                    </p>
                  </div>

                  <div className="rounded-md border border-[#2c3032] bg-[#1b1e20] p-2">
                    <p className="text-[8px] uppercase tracking-wider text-[#666b66]">
                      Response
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#e1e2dd]">
                      {responseRate === null
                        ? "-"
                        : `${Math.round(responseRate * 100)}%`}
                    </p>
                  </div>

                  <div className="rounded-md border border-[#2c3032] bg-[#1b1e20] p-2">
                    <p className="text-[8px] uppercase tracking-wider text-[#666b66]">
                      SLA
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#e1e2dd]">
                      {slaRate === null
                        ? "-"
                        : `${Math.round(slaRate * 100)}%`}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>    </div>
  );
}
