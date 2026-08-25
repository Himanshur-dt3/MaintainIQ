import { Role, TicketStatus } from "@prisma/client";

import prisma from "@/src/server/db/prisma";
import {
  AuthorizationError,
} from "@/src/server/auth/guards";

type TechnicianAnalyticsActor = {
  id: string;
  role: Role;
};

function requireAdmin(actor: TechnicianAnalyticsActor): void {
  if (actor.role !== Role.ADMIN) {
    throw new AuthorizationError(
      "Only administrators may view technician analytics.",
    );
  }
}

function hoursBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
}

/**
 * Returns operational performance analytics for all technicians.
 *
 * Metrics are derived from persisted ticket/workflow data and are intended
 * to support administrator-facing technician comparison and future
 * intelligent dispatch recommendations.
 */
export async function getTechnicianAnalytics(
  actor: TechnicianAnalyticsActor,
) {
  requireAdmin(actor);

  const technicians = await prisma.user.findMany({
    where: {
      role: Role.TECHNICIAN,
    },
    select: {
      id: true,
      name: true,
      email: true,
      jobTitle: true,
      assignedTickets: {
        select: {
          id: true,
          issueType: true,
          priority: true,
          status: true,
          assetId: true,
          createdAt: true,
          firstResponseAt: true,
          resolvedAt: true,
          slaDeadline: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return technicians.map((technician) => {
    const tickets = technician.assignedTickets;
    const resolvedTickets = tickets.filter(
      (ticket) =>
        ticket.status === TicketStatus.RESOLVED &&
        ticket.resolvedAt !== null,
    );

    const openTickets = tickets.filter(
      (ticket) => ticket.status !== TicketStatus.RESOLVED,
    );

    const responseTickets = tickets.filter(
      (ticket) => ticket.firstResponseAt !== null,
    );

    const slaEligibleTickets = resolvedTickets.filter(
      (ticket) => ticket.slaDeadline !== null,
    );

    const slaCompliantTickets = slaEligibleTickets.filter(
      (ticket) =>
        ticket.resolvedAt !== null &&
        ticket.slaDeadline !== null &&
        ticket.resolvedAt.getTime() <= ticket.slaDeadline.getTime(),
    );

    const resolutionHours = resolvedTickets.map((ticket) =>
      hoursBetween(ticket.createdAt, ticket.resolvedAt!),
    );

    const averageResolutionHours =
      resolutionHours.length > 0
        ? resolutionHours.reduce((sum, value) => sum + value, 0) /
          resolutionHours.length
        : null;

    const issueTypeStats = new Map<
      string,
      {
        total: number;
        resolved: number;
        resolutionHours: number[];
      }
    >();

    for (const ticket of tickets) {
      const key = ticket.issueType;

      const existing = issueTypeStats.get(key) ?? {
        total: 0,
        resolved: 0,
        resolutionHours: [],
      };

      existing.total += 1;

      if (ticket.status === TicketStatus.RESOLVED && ticket.resolvedAt) {
        existing.resolved += 1;
        existing.resolutionHours.push(
          hoursBetween(ticket.createdAt, ticket.resolvedAt),
        );
      }

      issueTypeStats.set(key, existing);
    }

    const byIssueType = Object.fromEntries(
      [...issueTypeStats.entries()].map(([issueType, stats]) => [
        issueType,
        {
          totalTickets: stats.total,
          resolvedTickets: stats.resolved,
          averageResolutionHours:
            stats.resolutionHours.length > 0
              ? stats.resolutionHours.reduce(
                  (sum, value) => sum + value,
                  0,
                ) / stats.resolutionHours.length
              : null,
        },
      ]),
    );

    const priorityCounts = tickets.reduce(
      (counts, ticket) => {
        counts[ticket.priority] = (counts[ticket.priority] ?? 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );

    return {
      technician: {
        id: technician.id,
        name: technician.name,
        email: technician.email,
        jobTitle: technician.jobTitle,
      },

      workload: {
        openTickets: openTickets.length,
        assignedTickets: tickets.length,
      },

      performance: {
        totalTickets: tickets.length,
        resolvedTickets: resolvedTickets.length,
        averageResolutionHours,
        firstResponseRate:
          tickets.length > 0
            ? responseTickets.length / tickets.length
            : null,
        slaComplianceRate:
          slaEligibleTickets.length > 0
            ? slaCompliantTickets.length / slaEligibleTickets.length
            : null,
      },

      priorityMix: priorityCounts,

      byIssueType,
    };
  });
}
