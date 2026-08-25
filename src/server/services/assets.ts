import {
  AssetCriticality,
  AssetStatus,
} from "@prisma/client";

import {
  AuthorizationError,
} from "@/src/server/auth/guards";
import prisma from "@/src/server/db/prisma";
import type { TicketActor } from "@/src/server/services/tickets";
import {
  calculatePredictiveAssetRisk,
  type PredictiveAssetRiskInsight,
} from "@/src/server/services/ai-assistant";
import type {
  AssetListFilters,
  CreateAssetInput,
  UpdateAssetInput,
} from "@/src/lib/validation/assets";

function requireAdmin(actor: TicketActor) {
  if (actor.role !== "ADMIN") {
    throw new AuthorizationError(
      "Only administrators may manage assets.",
    );
  }
}

export class AssetNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message = "Asset not found.") {
    super(message);
    this.name = "AssetNotFoundError";
  }
}

export class AssetNameConflictError extends Error {
  readonly statusCode = 409;

  constructor(message = "An asset with this name already exists.") {
    super(message);
    this.name = "AssetNameConflictError";
  }
}

export async function listAssets(
  actor: TicketActor,
  filters: AssetListFilters = {},
) {
  requireAdmin(actor);

  return prisma.asset.findMany({
    where: {
      status: filters.status,
      criticality: filters.criticality,
    },
    include: {
      _count: {
        select: {
          tickets: true,
          maintenancePlans: true,
        },
      },
    },
    orderBy: [
      {
        criticality: "desc",
      },
      {
        name: "asc",
      },
    ],
  });
}

export async function getAsset(
  actor: TicketActor,
  assetId: string,
) {
  requireAdmin(actor);

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      _count: {
        select: {
          tickets: true,
          maintenancePlans: true,
        },
      },
      tickets: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      maintenancePlans: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          frequency: true,
          nextDueAt: true,
        },
        orderBy: {
          nextDueAt: "asc",
        },
        take: 10,
      },
    },
  });

  if (!asset) {
    throw new AssetNotFoundError();
  }

  return asset;
}

export async function createAsset(
  actor: TicketActor,
  input: CreateAssetInput,
) {
  requireAdmin(actor);

  const existing = await prisma.asset.findUnique({
    where: {
      name: input.name,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new AssetNameConflictError();
  }

  return prisma.asset.create({
    data: {
      name: input.name,
      type: input.type,
      location: input.location,
      criticality:
        input.criticality ?? AssetCriticality.MEDIUM,
      status:
        input.status ?? AssetStatus.ACTIVE,
    },
  });
}

export async function updateAsset(
  actor: TicketActor,
  assetId: string,
  input: UpdateAssetInput,
) {
  requireAdmin(actor);

  const existing = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!existing) {
    throw new AssetNotFoundError();
  }

  if (input.name && input.name !== existing.name) {
    const duplicate = await prisma.asset.findUnique({
      where: {
        name: input.name,
      },
      select: {
        id: true,
      },
    });

    if (duplicate && duplicate.id !== assetId) {
      throw new AssetNameConflictError();
    }
  }

  return prisma.asset.update({
    where: {
      id: assetId,
    },
    data: input,
  });
}

export async function getAssetPredictiveRisk(
  actor: TicketActor,
  assetId: string,
): Promise<PredictiveAssetRiskInsight> {
  requireAdmin(actor);

  const now = new Date();

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      criticality: true,
      tickets: {
        select: {
          status: true,
          priority: true,
          issueType: true,
          createdAt: true,
          resolvedAt: true,
          slaDeadline: true,
        },
      },
      maintenancePlans: {
        where: {
          status: "ACTIVE",
        },
        select: {
          nextDueAt: true,
        },
      },
    },
  });

  if (!asset) {
    throw new AssetNotFoundError();
  }

  const tickets = asset.tickets;

  const totalTickets = tickets.length;

  const openTickets = tickets.filter(
    (ticket) => ticket.status !== "RESOLVED",
  ).length;

  const criticalTickets = tickets.filter(
    (ticket) => ticket.priority === "CRITICAL",
  ).length;

  const highPriorityTickets = tickets.filter(
    (ticket) => ticket.priority === "HIGH",
  ).length;

  const resolvedTickets = tickets.filter(
    (ticket) =>
      ticket.status === "RESOLVED" &&
      ticket.resolvedAt !== null,
  );

  const slaEligibleTickets = tickets.filter(
    (ticket) => ticket.slaDeadline !== null,
  );

  const slaBreaches = slaEligibleTickets.filter(
    (ticket) =>
      ticket.resolvedAt !== null &&
      ticket.slaDeadline !== null &&
      ticket.resolvedAt.getTime() > ticket.slaDeadline.getTime(),
  ).length;

  const issueCounts = new Map<string, number>();

  for (const ticket of tickets) {
    issueCounts.set(
      ticket.issueType,
      (issueCounts.get(ticket.issueType) ?? 0) + 1,
    );
  }

  const recurringIssueEntry = [...issueCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0];

  const recurringIssueCount = recurringIssueEntry?.[1] ?? 0;

  const recurringIssueRate =
    totalTickets > 0
      ? (recurringIssueCount / totalTickets) * 100
      : 0;

  const resolutionHours = resolvedTickets
    .filter((ticket) => ticket.resolvedAt !== null)
    .map(
      (ticket) =>
        (ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) /
        3_600_000,
    );

  const averageResolutionHours =
    resolutionHours.length > 0
      ? resolutionHours.reduce(
          (sum, value) => sum + value,
          0,
        ) / resolutionHours.length
      : null;

  const maintenancePlanCount =
    asset.maintenancePlans.length;

  const overdueMaintenancePlans =
    asset.maintenancePlans.filter(
      (plan) => plan.nextDueAt.getTime() < now.getTime(),
    ).length;

  return calculatePredictiveAssetRisk({
    totalTickets,
    openTickets,
    criticalTickets,
    highPriorityTickets,
    resolvedTickets: resolvedTickets.length,
    slaEligibleTickets: slaEligibleTickets.length,
    slaBreaches,
    recurringIssueCount,
    recurringIssueRate,
    averageResolutionHours,
    maintenancePlanCount,
    overdueMaintenancePlans,
    criticality: asset.criticality,
  });
}
