import type { Priority, TicketStatus } from "@prisma/client";

const statusLabels: Record<TicketStatus, string> = {
  REPORTED: "Reported",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

const priorityLabels: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const statusClasses: Record<TicketStatus, string> = {
  REPORTED: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  ASSIGNED: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  RESOLVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

const statusDotClasses: Record<TicketStatus, string> = {
  REPORTED: "bg-sky-400 animate-pulse",
  ASSIGNED: "bg-indigo-400",
  IN_PROGRESS: "bg-amber-400 animate-pulse",
  RESOLVED: "bg-emerald-400",
};

const priorityClasses: Record<Priority, string> = {
  LOW: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  MEDIUM: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  CRITICAL: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20",
};

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

interface TicketPriorityBadgeProps {
  priority: Priority;
}

/**
 * Renders a human-readable ticket workflow status badge.
 *
 * @param status - Canonical persisted ticket status.
 * @returns A status label with an accessible visual treatment.
 */
export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold ${statusClasses[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClasses[status]}`} />
      {statusLabels[status]}
    </span>
  );
}

/**
 * Renders a human-readable ticket priority badge.
 *
 * @param priority - Canonical persisted ticket priority.
 * @returns A priority label with an accessible visual treatment.
 */
export function TicketPriorityBadge({ priority }: TicketPriorityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-bold ${priorityClasses[priority]}`}
    >
      {priorityLabels[priority]}
    </span>
  );
}
