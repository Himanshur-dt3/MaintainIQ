import {
  MaintenanceFrequency,
  MaintenancePlanStatus,
} from "@prisma/client";

import {
  AuthorizationError,
} from "@/src/server/auth/guards";
import prisma from "@/src/server/db/prisma";
import type { TicketActor } from "@/src/server/services/tickets";
import {
  type CreateMaintenancePlanInput,
  type MaintenancePlanListFilters,
  type UpdateMaintenancePlanInput,
} from "@/src/lib/validation/maintenance-plans";

export class MaintenancePlanNotFoundError extends Error {
  constructor(message = "Maintenance plan not found.") {
    super(message);
    this.name = "MaintenancePlanNotFoundError";
  }
}

function requireAdmin(actor: TicketActor) {
  if (actor.role !== "ADMIN") {
    throw new AuthorizationError(
      "Only administrators may manage maintenance plans.",
    );
  }
}

function calculateNextDueDate(
  completedAt: Date,
  frequency: MaintenanceFrequency,
): Date | null {
  const next = new Date(completedAt);

  switch (frequency) {
    case MaintenanceFrequency.ONCE:
      return null;

    case MaintenanceFrequency.WEEKLY:
      next.setDate(next.getDate() + 7);
      return next;

    case MaintenanceFrequency.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      return next;

    case MaintenanceFrequency.QUARTERLY:
      next.setMonth(next.getMonth() + 3);
      return next;

    case MaintenanceFrequency.SEMI_ANNUALLY:
      next.setMonth(next.getMonth() + 6);
      return next;

    case MaintenanceFrequency.ANNUALLY:
      next.setFullYear(next.getFullYear() + 1);
      return next;
  }
}

async function validateAsset(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
      status: true,
    },
  });

  if (!asset) {
    throw new Error("Selected asset was not found.");
  }

  if (asset.status !== "ACTIVE") {
    throw new Error("Maintenance plans may only target active assets.");
  }

  return asset;
}

async function validateTechnician(technicianId: string | null | undefined) {
  if (!technicianId) {
    return null;
  }

  const technician = await prisma.user.findUnique({
    where: { id: technicianId },
    select: {
      id: true,
      name: true,
      role: true,
    },
  });

  if (!technician) {
    throw new Error("Selected technician was not found.");
  }

  if (technician.role !== "TECHNICIAN") {
    throw new Error("Maintenance plans may only be assigned to technicians.");
  }

  return technician;
}

export async function listMaintenancePlans(
  actor: TicketActor,
  filters: MaintenancePlanListFilters = {},
) {
  requireAdmin(actor);

  return prisma.maintenancePlan.findMany({
    where: {
      assetId: filters.assetId,
      technicianId: filters.technicianId,
      status: filters.status,
      priority: filters.priority,
      type: filters.type,
      frequency: filters.frequency,
      nextDueAt: filters.dueBefore
        ? {
            lte: filters.dueBefore,
          }
        : undefined,
    },
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
        },
      },
      technician: {
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
        },
      },
    },
    orderBy: [
      {
        nextDueAt: "asc",
      },
      {
        priority: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
}

export async function getMaintenancePlan(
  actor: TicketActor,
  planId: string,
) {
  requireAdmin(actor);

  const plan = await prisma.maintenancePlan.findUnique({
    where: { id: planId },
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
        },
      },
      technician: {
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
        },
      },
    },
  });

  if (!plan) {
    throw new MaintenancePlanNotFoundError();
  }

  return plan;
}

export async function createMaintenancePlan(
  actor: TicketActor,
  input: CreateMaintenancePlanInput,
) {
  requireAdmin(actor);

  await validateAsset(input.assetId);
  await validateTechnician(input.technicianId);

  if (input.nextDueAt.getTime() < Date.now()) {
    throw new Error("Next due date cannot be in the past.");
  }

  return prisma.maintenancePlan.create({
    data: {
      assetId: input.assetId,
      technicianId: input.technicianId ?? null,
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      frequency: input.frequency,
      status: MaintenancePlanStatus.ACTIVE,
      priority: input.priority,
      nextDueAt: input.nextDueAt,
      notes: input.notes ?? null,
    },
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
        },
      },
      technician: {
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
        },
      },
    },
  });
}

export async function updateMaintenancePlan(
  actor: TicketActor,
  planId: string,
  input: UpdateMaintenancePlanInput,
) {
  requireAdmin(actor);

  const existing = await prisma.maintenancePlan.findUnique({
    where: { id: planId },
  });

  if (!existing) {
    throw new MaintenancePlanNotFoundError();
  }

  if (existing.status === MaintenancePlanStatus.COMPLETED) {
    throw new Error("Completed maintenance plans cannot be edited.");
  }

  if (existing.status === MaintenancePlanStatus.CANCELLED) {
    throw new Error("Cancelled maintenance plans cannot be edited.");
  }

  if (input.technicianId !== undefined) {
    await validateTechnician(input.technicianId);
  }

  if (input.nextDueAt && input.nextDueAt.getTime() < Date.now()) {
    throw new Error("Next due date cannot be in the past.");
  }

  return prisma.maintenancePlan.update({
    where: { id: planId },
    data: {
      technicianId:
        input.technicianId !== undefined
          ? input.technicianId
          : undefined,
      title: input.title,
      description:
        input.description !== undefined
          ? input.description
          : undefined,
      type: input.type,
      frequency: input.frequency,
      priority: input.priority,
      nextDueAt: input.nextDueAt,
      notes:
        input.notes !== undefined
          ? input.notes
          : undefined,
    },
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
        },
      },
      technician: {
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
        },
      },
    },
  });
}

export async function pauseMaintenancePlan(
  actor: TicketActor,
  planId: string,
) {
  requireAdmin(actor);

  const existing = await prisma.maintenancePlan.findUnique({
    where: { id: planId },
  });

  if (!existing) {
    throw new MaintenancePlanNotFoundError();
  }

  if (existing.status !== MaintenancePlanStatus.ACTIVE) {
    throw new Error("Only active maintenance plans can be paused.");
  }

  return prisma.maintenancePlan.update({
    where: { id: planId },
    data: {
      status: MaintenancePlanStatus.PAUSED,
    },
  });
}

export async function resumeMaintenancePlan(
  actor: TicketActor,
  planId: string,
) {
  requireAdmin(actor);

  const existing = await prisma.maintenancePlan.findUnique({
    where: { id: planId },
  });

  if (!existing) {
    throw new MaintenancePlanNotFoundError();
  }

  if (existing.status !== MaintenancePlanStatus.PAUSED) {
    throw new Error("Only paused maintenance plans can be resumed.");
  }

  return prisma.maintenancePlan.update({
    where: { id: planId },
    data: {
      status: MaintenancePlanStatus.ACTIVE,
    },
  });
}

export async function cancelMaintenancePlan(
  actor: TicketActor,
  planId: string,
) {
  requireAdmin(actor);

  const existing = await prisma.maintenancePlan.findUnique({
    where: { id: planId },
  });

  if (!existing) {
    throw new MaintenancePlanNotFoundError();
  }

  if (
    existing.status === MaintenancePlanStatus.COMPLETED ||
    existing.status === MaintenancePlanStatus.CANCELLED
  ) {
    throw new Error("This maintenance plan can no longer be cancelled.");
  }

  return prisma.maintenancePlan.update({
    where: { id: planId },
    data: {
      status: MaintenancePlanStatus.CANCELLED,
    },
  });
}

export async function completeMaintenancePlan(
  actor: TicketActor,
  planId: string,
) {
  requireAdmin(actor);

  const existing = await prisma.maintenancePlan.findUnique({
    where: { id: planId },
  });

  if (!existing) {
    throw new MaintenancePlanNotFoundError();
  }

  if (existing.status !== MaintenancePlanStatus.ACTIVE) {
    throw new Error(
      "Only active maintenance plans can be completed.",
    );
  }

  const completedAt = new Date();
  const nextDueAt = calculateNextDueDate(
    completedAt,
    existing.frequency,
  );

  if (nextDueAt) {
    return prisma.maintenancePlan.update({
      where: { id: planId },
      data: {
        lastCompletedAt: completedAt,
        nextDueAt,
        status: MaintenancePlanStatus.ACTIVE,
      },
    });
  }

  return prisma.maintenancePlan.update({
    where: { id: planId },
    data: {
      lastCompletedAt: completedAt,
      status: MaintenancePlanStatus.COMPLETED,
    },
  });
}

export async function getMaintenancePlanSummary(
  actor: TicketActor,
) {
  requireAdmin(actor);

  const [active, paused, overdue, completed, cancelled] =
    await Promise.all([
      prisma.maintenancePlan.count({
        where: {
          status: MaintenancePlanStatus.ACTIVE,
        },
      }),
      prisma.maintenancePlan.count({
        where: {
          status: MaintenancePlanStatus.PAUSED,
        },
      }),
      prisma.maintenancePlan.count({
        where: {
          status: MaintenancePlanStatus.ACTIVE,
          nextDueAt: {
            lt: new Date(),
          },
        },
      }),
      prisma.maintenancePlan.count({
        where: {
          status: MaintenancePlanStatus.COMPLETED,
        },
      }),
      prisma.maintenancePlan.count({
        where: {
          status: MaintenancePlanStatus.CANCELLED,
        },
      }),
    ]);

  return {
    active,
    paused,
    overdue,
    completed,
    cancelled,
    total: active + paused + completed + cancelled,
  };
}