import type { Priority, TicketStatus } from "@prisma/client";

const statusLabels: Record<TicketStatus, string> = {
  REPORTED: "Reported",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

const priorityLabels: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const statusClasses: Record<TicketStatus, string> = {
  REPORTED: "bg-sky-100 text-sky-800 ring-sky-200",
  ASSIGNED: "bg-violet-100 text-violet-800 ring-violet-200",
  IN_PROGRESS: "bg-amber-100 text-amber-900 ring-amber-200",
  RESOLVED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

const priorityClasses: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-700 ring-slate-200",
  MEDIUM: "bg-blue-100 text-blue-800 ring-blue-200",
  HIGH: "bg-orange-100 text-orange-900 ring-orange-200",
  CRITICAL: "bg-rose-100 text-rose-800 ring-rose-200",
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses[status]}`}
    >
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${priorityClasses[priority]}`}
    >
      {priorityLabels[priority]}
    </span>
  );
}
