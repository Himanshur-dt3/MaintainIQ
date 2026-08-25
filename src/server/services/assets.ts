import {
  AssetCriticality,
  AssetStatus,
} from "@prisma/client";

import {
  AuthorizationError,
} from "@/src/server/auth/guards";
import prisma from "@/src/server/db/prisma";
import type { TicketActor } from "@/src/server/services/tickets";
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
  constructor(message = "Asset not found.") {
    super(message);
    this.name = "AssetNotFoundError";
  }
}

export class AssetNameConflictError extends Error {
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
