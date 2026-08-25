import { Priority, TicketStatus } from "@prisma/client";

export type SlaStatus =
  | "ON_TRACK"
  | "AT_RISK"
  | "BREACHED"
  | "RESOLVED_WITHIN_SLA"
  | "RESOLVED_LATE"
  | "NO_DEADLINE";

const SLA_TARGET_HOURS: Record<Priority, number> = {
  CRITICAL: 4,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

export function getSlaTargetHours(priority: Priority): number {
  return SLA_TARGET_HOURS[priority];
}

export function calculateSlaDeadline(
  createdAt: Date,
  priority: Priority,
): Date {
  return new Date(
    createdAt.getTime() + getSlaTargetHours(priority) * 60 * 60 * 1000,
  );
}

export function getSlaStatus(
  status: TicketStatus,
  priority: Priority,
  slaDeadline: Date | null,
  resolvedAt: Date | null,
  now: Date = new Date(),
): SlaStatus {
  if (!slaDeadline) {
    return "NO_DEADLINE";
  }

  if (status === TicketStatus.RESOLVED) {
    if (!resolvedAt) {
      return "RESOLVED_LATE";
    }

    return resolvedAt.getTime() <= slaDeadline.getTime()
      ? "RESOLVED_WITHIN_SLA"
      : "RESOLVED_LATE";
  }

  const remainingMs = slaDeadline.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return "BREACHED";
  }

  const atRiskWindowMs =
    getSlaTargetHours(priority) * 60 * 60 * 1000 * 0.25;

  return remainingMs <= atRiskWindowMs
    ? "AT_RISK"
    : "ON_TRACK";
}