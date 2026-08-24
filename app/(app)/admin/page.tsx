import Link from "next/link";
import { IssueType, Priority, TicketStatus } from "@prisma/client";

import { AdminTicketManagement } from "@/src/components/admin-ticket-management";
import { MaintenanceCopilot } from "@/src/components/maintenance-copilot";
import { getAssetMaintenanceInsights } from "@/src/server/services/maintenance-intelligence";
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

export default async function AdminPage() {
  const session = await requireRole("ADMIN");
  const actor = {
    id: session.user.id,
    role: session.user.role,
  };

  const [metrics, allTickets, technicians, maintenanceInsights] = await Promise.all([
    getAdminDashboardMetrics(actor),
    listAdminTickets(actor, {}),
    listTechniciansForAdmin(actor),
    getAssetMaintenanceInsights(),
  ]);

  const tickets = allTickets.slice(0, 6);
  const priorityMaintenanceInsights = maintenanceInsights
    .filter((item) => item.riskLevel !== "LOW")
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      return b.healthScore - a.healthScore;
    })
    .slice(0, 4);

  /*
   * Preventive Maintenance Queue
   *
   * Prioritize assets that have actionable maintenance evidence.
   * Assets with no history are retained as baseline/watch items rather
   * than being presented as proven healthy.
   */
  const preventiveMaintenanceQueue = [
    ...maintenanceInsights.filter(
      (item) =>
        item.riskLevel === "CRITICAL" ||
        item.riskLevel === "HIGH",
    ),
    ...maintenanceInsights.filter(
      (item) =>
        item.riskLevel === "MEDIUM" &&
        item.dataConfidence !== "INSUFFICIENT",
    ),
    ...maintenanceInsights.filter(
      (item) =>
        item.riskLevel === "LOW" &&
        item.dataConfidence === "INSUFFICIENT",
    ),
  ].slice(0, 6);
  const maintenanceAiBrief = await generateMaintenanceAiBrief(maintenanceInsights);

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

  const pieTotal = openCount + inProgressCount + resolvedCount;

  const openPercent = pieTotal
    ? (openCount / pieTotal) * 100
    : 0;

  const inProgressPercent = pieTotal
    ? (inProgressCount / pieTotal) * 100
    : 0;

  const resolvedPercent = pieTotal
    ? (resolvedCount / pieTotal) * 100
    : 0;
  const pieEndProgress = openPercent + inProgressPercent;


  function describeDonutArc(
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const toPoint = (angle: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians),
    };
  };

  const start = toPoint(endAngle);
  const end = toPoint(startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
  ].join(" ");
}
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
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737873]">
          Overview
        </p>

        <div className="mt-1 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f0f0ec] sm:text-3xl">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-[#8e938e]">
              Welcome back,{" "}
              <span className="font-semibold text-[#d8d9d4]">
                {session.user.name}
              </span>
            </p>
          </div>

          <div className="rounded-md border border-[#303438] bg-[#181b1d] px-3 py-2 text-xs text-[#8e938e]">
            Operations Overview
          </div>
        </div>
      </section>

      {/* KPI CARDS */}
      <section className="dashboard-overview-kpis grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map(({ key, label, shortLabel, href }) => (
          <Link
            key={key}
            href={href}
            aria-label={`View ${label}`}
            className="group rounded-lg border border-[#303438] bg-[#181b1d] p-4 transition duration-200 hover:border-[#70756f] hover:bg-[#1d2022] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#bfc2bd]/40"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#777c77]">
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </p>

              <span className="h-1.5 w-1.5 rounded-full bg-[#bfc2bd] transition group-hover:bg-[#f0f0ec]" />
            </div>

            <p className="mt-3 text-2xl font-bold tracking-tight text-[#f0f0ec] sm:text-3xl">
              {kpiValues[key]}
            </p>

            <div className="mt-3 h-px bg-[#2d3033]" />

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[10px] text-[#686d68]">
                Current system count
              </p>

              <span className="text-[10px] font-semibold text-[#aeb3ae] opacity-0 transition group-hover:opacity-100">
                View tickets ?
              </span>
            </div>
          </Link>
        ))}
      </section>

      {/* MAINTENANCE INTELLIGENCE */}
      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-[#2d3033] pb-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Maintenance Intelligence
            </p>

            <h2 className="mt-1 text-base font-bold text-[#ededE9]">
              Assets Requiring Attention
            </h2>

            <p className="mt-1 text-[11px] text-[#686d68]">
              Data-driven maintenance risk based on current workload, severity,
              recent activity, and failure trends.
            </p>
          </div>

          <div className="rounded-md border border-[#35393c] bg-[#202326] px-2.5 py-1.5 text-[10px] font-semibold text-[#929792]">
            {maintenanceInsights.filter((item) => item.riskLevel !== "LOW").length}{" "}
            Assets Need Attention
          </div>
        </div>

        {priorityMaintenanceInsights.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {priorityMaintenanceInsights.map((insight) => {
              const riskClasses = {
                LOW: "border-[#39413d] bg-[#171c1a] text-[#8fbc9f]",
                MEDIUM: "border-amber-500/20 bg-amber-500/[0.04] text-amber-300",
                HIGH: "border-orange-500/25 bg-orange-500/[0.05] text-orange-300",
                CRITICAL:
                  "border-red-500/30 bg-red-500/[0.06] text-red-300",
              } as const;

              const trendLabel = {
                NO_HISTORY: "No history",
                NEW_ACTIVITY: "New activity",
                IMPROVING: "Improving",
                STABLE: "Stable",
                WORSENING: "Worsening",
              } as const;

              return (
                <article
                  key={insight.assetId}
                  className="rounded-lg border border-[#303438] bg-[#151819] p-4 transition hover:border-[#454a47]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-[#e6e7e2]">
                        {insight.assetName}
                      </h3>

                      <p className="mt-1 text-[10px] text-[#707570]">
                        {insight.assetType} Â· {insight.location}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${
                        riskClasses[insight.riskLevel]
                      }`}
                    >
                      {insight.riskLevel}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-[#303438] bg-[#191c1e] px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#686d68]">
                        Priority Score
                      </p>
                      <p className="mt-1 text-lg font-bold tracking-tight text-[#ededE9]">
                        {insight.priorityScore}
                        <span className="ml-1 text-[10px] font-medium text-[#686d68]">
                          /100
                        </span>
                      </p>
                    </div>

                    <div className="rounded-md border border-[#303438] bg-[#191c1e] px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#686d68]">
                        Data Confidence
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#d8d9d4]">
                        {insight.dataConfidence}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#686d68]">
                        Health Score
                      </p>

                      <p className="mt-1 text-2xl font-bold tracking-tight text-[#ededE9]">
                        {insight.healthScore}
                        <span className="ml-1 text-xs font-medium text-[#686d68]">
                          /100
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.1em] text-[#686d68]">
                          Open
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#d8d9d4]">
                          {insight.openTickets}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase tracking-[0.1em] text-[#686d68]">
                          Recent
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#d8d9d4]">
                          {insight.recentTickets}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#292d2f]">
                    <div
                      className="h-full rounded-full bg-[#bfc2bd] transition-all"
                      style={{ width: `${insight.healthScore}%` }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-md border border-[#303438] bg-[#202326] px-2 py-1 text-[9px] font-semibold text-[#929792]">
                      {trendLabel[insight.trend]}
                    </span>

                    {insight.dominantIssueType ? (
                      <span className="rounded-md border border-[#303438] bg-[#202326] px-2 py-1 text-[9px] font-semibold text-[#929792]">
                        {insight.dominantIssueType.replaceAll("_", " ")}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 rounded-md border border-[#303438] bg-[#191c1e] px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#686d68]">
                      Evidence Status
                    </p>

                    <p className="mt-1 text-[10px] leading-relaxed text-[#929792]">
                      {insight.dataConfidence === "INSUFFICIENT"
                        ? "No maintenance history is available. Treat this asset as a baseline item rather than a proven healthy asset."
                        : insight.dataConfidence === "LIMITED"
                          ? "Limited maintenance history. Current priority is actionable, but recurrence cannot yet be established."
                          : "Sufficient maintenance history is available to support the current priority assessment."}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-[#292d2f] pt-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#686d68]">
                      Recommended Action
                    </p>

                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#aeb3ae]">
                      {insight.recommendation}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-[#303438] bg-[#151819] px-4 py-8 text-center">
            <p className="text-sm font-semibold text-[#d8d9d4]">
              No maintenance risks detected
            </p>

            <p className="mt-1 text-[11px] text-[#686d68]">
              Current asset activity does not indicate elevated maintenance
              risk.
            </p>
          </div>
        )}
      </section>

      {/* AI OPERATIONS BRIEF */}
      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-[#2d3033] pb-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              AI Operations Brief
            </p>

            <h2 className="mt-1 text-base font-bold text-[#ededE9]">
              {maintenanceAiBrief.headline}
            </h2>

            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-[#686d68]">
              {maintenanceAiBrief.summary}
            </p>
          </div>

          <span className="shrink-0 rounded-md border border-[#35393c] bg-[#202326] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#aeb3ae]">
            Claude Analysis
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[#303438] bg-[#151819] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#686d68]">
              Priority Asset
            </p>

            <p className="mt-2 text-sm font-bold text-[#e6e7e2]">
              {maintenanceAiBrief.priorityAsset}
            </p>

            <p className="mt-2 text-[11px] leading-relaxed text-[#929792]">
              {maintenanceAiBrief.priorityReason}
            </p>
          </div>

          <div className="rounded-lg border border-[#303438] bg-[#151819] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#686d68]">
              Recommended Action
            </p>

            <p className="mt-2 text-[11px] leading-relaxed text-[#aeb3ae]">
              {maintenanceAiBrief.recommendedAction}
            </p>
          </div>

          <div className="rounded-lg border border-[#303438] bg-[#151819] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#686d68]">
              System Pattern
            </p>

            <p className="mt-2 text-[11px] leading-relaxed text-[#aeb3ae]">
              {maintenanceAiBrief.systemicPattern}
            </p>
          </div>
        </div>
      </section>

      {/* MAINTENANCE COPILOT */}
      <MaintenanceCopilot />

      {/* PREVENTIVE MAINTENANCE QUEUE */}
      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-[#2d3033] pb-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Preventive Maintenance
            </p>

            <h2 className="mt-1 text-base font-bold text-[#ededE9]">
              Maintenance Action Queue
            </h2>

            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-[#686d68]">
              Assets requiring attention based on maintenance risk, activity
              trends, workload, and available maintenance history.
            </p>
          </div>

          <span className="shrink-0 rounded-md border border-[#35393c] bg-[#202326] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#aeb3ae]">
            {preventiveMaintenanceQueue.length} Actions
          </span>
        </div>

        {preventiveMaintenanceQueue.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {preventiveMaintenanceQueue.map((item) => {
              const isInsufficient =
                item.dataConfidence === "INSUFFICIENT";

              const isCritical =
                item.riskLevel === "CRITICAL";

              const isHigh =
                item.riskLevel === "HIGH";

              const action =
                isInsufficient
                  ? "Establish baseline and monitor"
                  : isCritical
                    ? "Immediate maintenance attention"
                    : isHigh
                      ? "Diagnostic inspection within 7 days"
                      : item.trend === "WORSENING"
                        ? "Investigate trend and consider preventive servicing"
                        : item.openTickets > 0
                          ? "Monitor active issue and inspect if it recurs"
                          : "Inspect during next service window";

              const reason = isInsufficient
                ? "No maintenance history is available yet."
                : [
                    item.criticalTickets > 0
                      ? `${item.criticalTickets} critical ticket${item.criticalTickets === 1 ? "" : "s"}`
                      : null,
                    item.openTickets > 0
                      ? `${item.openTickets} open ticket${item.openTickets === 1 ? "" : "s"}`
                      : null,
                    item.trend === "WORSENING"
                      ? "activity is increasing"
                      : item.trend === "NEW_ACTIVITY"
                        ? "new maintenance activity detected"
                        : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") ||
                  "Maintenance activity warrants routine monitoring.";

              const riskClass =
                isCritical
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : isHigh
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                    : item.riskLevel === "MEDIUM"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-slate-500/30 bg-slate-500/10 text-slate-300";

              return (
                <article
                  key={item.assetId}
                  className="rounded-lg border border-[#303438] bg-[#151819] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#e6e7e2]">
                        {item.assetName}
                      </p>

                      <p className="mt-1 text-[10px] text-[#686d68]">
                        {item.dominantIssueType
                          ? item.dominantIssueType
                              .toLowerCase()
                              .replaceAll("_", " ")
                          : "No dominant issue recorded"}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${riskClass}`}
                    >
                      {item.riskLevel}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-md border border-[#35393c] bg-[#202326] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#929792]">
                      {item.dataConfidence} DATA
                    </span>

                    <span className="rounded-md border border-[#35393c] bg-[#202326] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#929792]">
                      {item.trend.replaceAll("_", " ")}
                    </span>

                    <span className="rounded-md border border-[#35393c] bg-[#202326] px-2 py-1 text-[9px] font-semibold text-[#929792]">
                      Health {item.healthScore}%
                    </span>
                  </div>

                  <div className="mt-3 border-t border-[#2d3033] pt-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#686d68]">
                      Why this asset
                    </p>

                    <p className="mt-1 text-[11px] leading-relaxed text-[#929792]">
                      {reason}
                    </p>
                  </div>

                  <div className="mt-3 rounded-md border border-[#303438] bg-[#1b1e20] px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#686d68]">
                      Recommended action
                    </p>

                    <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#d8d9d4]">
                      {action}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-[#303438] bg-[#151819] px-4 py-6 text-center">
            <p className="text-xs font-semibold text-[#aeb3ae]">
              No preventive actions currently identified.
            </p>

            <p className="mt-1 text-[10px] text-[#686d68]">
              Continue routine monitoring as maintenance history accumulates.
            </p>
          </div>
        )}
      </section>

      {/* EXISTING TICKET MANAGEMENT */}
      <section>
        <AdminTicketManagement
          tickets={tickets}
          technicians={technicians}
          issueTypes={Object.values(IssueType)}
          priorities={Object.values(Priority)}
          statuses={Object.values(TicketStatus)}
        />
      </section>

      {/* CHART + ACTIVITY */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">

        {/* ANALYTICS / TICKET STATUS */}
        <div className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
          <div className="flex items-start justify-between border-b border-[#2d3033] pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
                Analytics
              </p>

              <h2 className="mt-1 text-base font-bold text-[#ededE9]">
                Ticket Status
              </h2>

              <p className="mt-1 text-[11px] text-[#686d68]">
                Current distribution across all tickets
              </p>
            </div>

            <span className="rounded-md border border-[#35393c] bg-[#202326] px-2.5 py-1 text-[10px] font-semibold text-[#929792]">
              {pieTotal} Total
            </span>
          </div>

          <div className="flex min-h-[300px] flex-col items-center justify-center gap-8 px-4 py-8 sm:flex-row sm:justify-around">

            {/* DONUT CHART */}
            <div className="relative h-52 w-52 shrink-0">
              <svg
                viewBox="0 0 220 220"
                className="h-full w-full overflow-visible"
                role="img"
                aria-label={`Ticket status distribution: ${openCount} open, ${inProgressCount} in progress, ${resolvedCount} resolved`}
              >
                <circle
                  cx="110"
                  cy="110"
                  r="78"
                  fill="none"
                  stroke="#25282a"
                  strokeWidth="42"
                />

                {/* OPEN */}
                {openCount > 0 ? (
                  <g className="dashboard-donut-segment">
                    <title>{`Open: ${openCount} ticket${openCount === 1 ? "" : "s"}. New and assigned tickets.`}</title>

                    <path
                      d={describeDonutArc(
                        110,
                        78,
                        0,
                        openPercent * 3.6,
                      )}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="42"
                      className="dashboard-donut-open"
                      pathLength="100"
                    />
                  </g>
                ) : null}

                {/* IN PROGRESS */}
                {inProgressCount > 0 ? (
                  <g className="dashboard-donut-segment">
                    <title>{`In Progress: ${inProgressCount} ticket${inProgressCount === 1 ? "" : "s"}. Technician actively working.`}</title>

                    <path
                      d={describeDonutArc(
                        110,
                        78,
                        openPercent * 3.6,
                        pieEndProgress * 3.6,
                      )}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="42"
                      className="dashboard-donut-progress"
                      pathLength="100"
                    />
                  </g>
                ) : null}

                {/* RESOLVED */}
                {resolvedCount > 0 ? (
                  <g className="dashboard-donut-segment">
                    <title>{`Resolved: ${resolvedCount} ticket${resolvedCount === 1 ? "" : "s"}. Completed maintenance tickets.`}</title>

                    <path
                      d={describeDonutArc(
                        110,
                        78,
                        pieEndProgress * 3.6,
                        360,
                      )}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="42"
                      className="dashboard-donut-resolved"
                      pathLength="100"
                    />
                  </g>
                ) : null}

                {/* CENTER */}
                <circle
                  cx="110"
                  cy="110"
                  r="54"
                  fill="#181b1d"
                  stroke="#303438"
                  strokeWidth="1"
                />

                <text
                  x="110"
                  y="106"
                  textAnchor="middle"
                  className="dashboard-donut-total"
                >
                  {pieTotal}
                </text>

                <text
                  x="110"
                  y="126"
                  textAnchor="middle"
                  className="dashboard-donut-label"
                >
                  TICKETS
                </text>
              </svg>
            </div>

            {/* LEGEND */}
            <div className="w-full max-w-[300px] space-y-3">

              <div className="rounded-md border border-[#303438] bg-[#141719] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#60a5fa]" />
                    <span className="text-xs font-semibold text-[#d8d9d4]">
                      Open
                    </span>
                  </div>

                  <span className="font-mono text-xs font-bold text-[#f0f0ec]">
                    {openCount}
                  </span>
                </div>

                <div className="mt-2 h-1 rounded-full bg-[#25282a]">
                  <div
                    className="h-1 rounded-full bg-[#60a5fa]"
                    style={{ width: `${openPercent}%` }}
                  />
                </div>

                <p className="mt-1.5 text-[9px] text-[#686d68]">
                  New and assigned tickets
                </p>
              </div>

              <div className="rounded-md border border-[#303438] bg-[#141719] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                    <span className="text-xs font-semibold text-[#d8d9d4]">
                      In Progress
                    </span>
                  </div>

                  <span className="font-mono text-xs font-bold text-[#f0f0ec]">
                    {inProgressCount}
                  </span>
                </div>

                <div className="mt-2 h-1 rounded-full bg-[#25282a]">
                  <div
                    className="h-1 rounded-full bg-[#f59e0b]"
                    style={{ width: `${inProgressPercent}%` }}
                  />
                </div>

                <p className="mt-1.5 text-[9px] text-[#686d68]">
                  Technician actively working
                </p>
              </div>

              <div className="rounded-md border border-[#303438] bg-[#141719] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
                    <span className="text-xs font-semibold text-[#d8d9d4]">
                      Resolved
                    </span>
                  </div>

                  <span className="font-mono text-xs font-bold text-[#f0f0ec]">
                    {resolvedCount}
                  </span>
                </div>

                <div className="mt-2 h-1 rounded-full bg-[#25282a]">
                  <div
                    className="h-1 rounded-full bg-[#34d399]"
                    style={{ width: `${resolvedPercent}%` }}
                  />
                </div>

                <p className="mt-1.5 text-[9px] text-[#686d68]">
                  Completed maintenance tickets
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <aside className="dashboard-activity-vertical rounded-lg border border-[#303438] bg-[#181b1d] p-5">
          <div className="border-b border-[#2d3033] pb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Activity
            </p>

            <h2 className="mt-1 text-base font-bold text-[#ededE9]">
              Recent Activity
            </h2>
          </div>

          <ul className="mt-5 space-y-4">
            {recentActivity.length === 0 ? (
              <li className="rounded-md border border-dashed border-[#35393c] p-4 text-xs text-[#6f746f]">
                No recent activity yet.
              </li>
            ) : (
              recentActivity.map((event, i) => (
                <li
                  key={i}
                  tabIndex={0}
                  className="dashboard-activity-item"
                  title={`${event.actorName} performed ${event.action.replaceAll("_", " ").toLowerCase()} on ${event.ticketTitle}.`}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#3a3e41] bg-[#222527] text-[9px] font-bold text-[#c4c6c1]">
                    {event.actorName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#dedfd9]">
                      {event.actorName}
                    </p>

                    <p className="mt-0.5 text-[11px] leading-4 text-[#7d827d]">
                      {event.action
                        .replaceAll("_", " ")
                        .toLowerCase()}{" "}
                      on{" "}
                      <span className="font-medium text-[#aeb3ae]">
                        {event.ticketTitle}
                      </span>
                    </p>

                    <p className="mt-1 font-mono text-[9px] text-[#5f645f]">
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
        </aside>
      </section>

      {/* TECHNICIAN ROSTER */}
      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="flex items-center justify-between border-b border-[#2d3033] pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Assignment
            </p>

            <h2 className="mt-1 text-base font-bold text-[#ededE9]">
              Active Technicians
            </h2>
          </div>

          <span className="rounded-md border border-[#35393c] bg-[#202326] px-2.5 py-1 text-[10px] font-semibold text-[#929792]">
            {technicians.length} active
          </span>
        </div>

        <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {technicians.map((technician) => (
            <li
              key={technician.id}
              className="flex items-center justify-between rounded-md border border-[#303438] bg-[#141718] px-4 py-3 transition hover:border-[#454a4d]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#272a2c] text-xs font-bold text-[#d1d3ce]">
                  {technician.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#e1e2dd]">
                    {technician.name}
                  </p>

                  <p className="truncate text-[10px] text-[#666b66]">
                    {technician.jobTitle ?? technician.email}
                  </p>
                </div>
              </div>

              <span className="ml-3 shrink-0 rounded-md border border-[#383c3f] bg-[#202326] px-2 py-1 text-[10px] font-semibold text-[#aeb3ae]">
                {technician._count.assignedTickets} open
              </span>
            </li>
          ))}
        </ul>
      </section>


    </div>
  );
}
