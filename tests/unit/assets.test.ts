import {
  AssetCriticality,
  AssetStatus,
  Role,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  asset: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/src/server/db/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/src/server/auth/guards", () => {
  class AuthorizationError extends Error {
    constructor(message = "Forbidden.") {
      super(message);
      this.name = "AuthorizationError";
    }
  }

  return {
    AuthorizationError,
  };
});

import { AuthorizationError } from "@/src/server/auth/guards";
import {
  AssetNameConflictError,
  AssetNotFoundError,
  createAsset,
  getAsset,
  listAssets,
  updateAsset,
} from "@/src/server/services/assets";

const admin = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  role: Role.ADMIN,
};

const technician = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  role: Role.TECHNICIAN,
};

const assetId = "11111111-1111-4111-8111-111111111111";

const baseAsset = {
  id: assetId,
  name: "Lobby Air Conditioner",
  type: "HVAC Unit",
  location: "Main Lobby",
  status: AssetStatus.ACTIVE,
  criticality: AssetCriticality.HIGH,
};

describe("asset management service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("rejects non-admin users from listing assets", async () => {
      await expect(listAssets(technician)).rejects.toBeInstanceOf(
        AuthorizationError,
      );

      expect(prismaMock.asset.findMany).not.toHaveBeenCalled();
    });

    it("rejects non-admin users from viewing an asset", async () => {
      await expect(getAsset(technician, assetId)).rejects.toBeInstanceOf(
        AuthorizationError,
      );

      expect(prismaMock.asset.findUnique).not.toHaveBeenCalled();
    });

    it("rejects non-admin users from creating an asset", async () => {
      await expect(
        createAsset(technician, {
          name: "New HVAC",
          type: "HVAC Unit",
          location: "Second Floor",
          criticality: AssetCriticality.MEDIUM,
          status: AssetStatus.ACTIVE,
        }),
      ).rejects.toBeInstanceOf(AuthorizationError);

      expect(prismaMock.asset.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.asset.create).not.toHaveBeenCalled();
    });

    it("rejects non-admin users from updating an asset", async () => {
      await expect(
        updateAsset(technician, assetId, {
          location: "Second Floor",
        }),
      ).rejects.toBeInstanceOf(AuthorizationError);

      expect(prismaMock.asset.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.asset.update).not.toHaveBeenCalled();
    });
  });

  describe("listAssets", () => {
    it("lists assets with status and criticality filters", async () => {
      const assets = [baseAsset];

      prismaMock.asset.findMany.mockResolvedValue(assets);

      const result = await listAssets(admin, {
        status: AssetStatus.ACTIVE,
        criticality: AssetCriticality.HIGH,
      });

      expect(result).toEqual(assets);
      expect(prismaMock.asset.findMany).toHaveBeenCalledWith({
        where: {
          status: AssetStatus.ACTIVE,
          criticality: AssetCriticality.HIGH,
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
    });

    it("lists all assets when no filters are supplied", async () => {
      prismaMock.asset.findMany.mockResolvedValue([baseAsset]);

      const result = await listAssets(admin);

      expect(result).toEqual([baseAsset]);
      expect(prismaMock.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: undefined,
            criticality: undefined,
          },
        }),
      );
    });
  });

  describe("getAsset", () => {
    it("returns an asset with ticket and maintenance-plan summaries", async () => {
      const asset = {
        ...baseAsset,
        _count: {
          tickets: 3,
          maintenancePlans: 2,
        },
        tickets: [
          {
            id: "ticket-1",
            title: "Cooling failure",
            status: "IN_PROGRESS",
            priority: "HIGH",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        maintenancePlans: [
          {
            id: "plan-1",
            title: "Quarterly HVAC inspection",
            status: "ACTIVE",
            priority: "HIGH",
            frequency: "QUARTERLY",
            nextDueAt: new Date(),
          },
        ],
      };

      prismaMock.asset.findUnique.mockResolvedValue(asset);

      const result = await getAsset(admin, assetId);

      expect(result).toEqual(asset);

      expect(prismaMock.asset.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: assetId,
          },
          include: expect.objectContaining({
            _count: {
              select: {
                tickets: true,
                maintenancePlans: true,
              },
            },
          }),
        }),
      );
    });

    it("throws AssetNotFoundError when the asset does not exist", async () => {
      prismaMock.asset.findUnique.mockResolvedValue(null);

      await expect(getAsset(admin, assetId)).rejects.toBeInstanceOf(
        AssetNotFoundError,
      );
    });
  });

  describe("createAsset", () => {
    it("creates an asset with the supplied values", async () => {
      const input = {
        name: "Production Chiller",
        type: "Chiller",
        location: "Plant Room",
        criticality: AssetCriticality.CRITICAL,
        status: AssetStatus.ACTIVE,
      };

      prismaMock.asset.findUnique.mockResolvedValue(null);
      prismaMock.asset.create.mockResolvedValue({
        id: assetId,
        ...input,
      });

      const result = await createAsset(admin, input);

      expect(result).toEqual({
        id: assetId,
        ...input,
      });

      expect(prismaMock.asset.findUnique).toHaveBeenCalledWith({
        where: {
          name: input.name,
        },
        select: {
          id: true,
        },
      });

      expect(prismaMock.asset.create).toHaveBeenCalledWith({
        data: input,
      });
    });

    it("uses MEDIUM criticality and ACTIVE status when defaults are omitted", async () => {
      const input = {
        name: "Lobby Pump",
        type: "Pump",
        location: "Main Lobby",
        criticality: AssetCriticality.MEDIUM,
        status: AssetStatus.ACTIVE,
      };

      prismaMock.asset.findUnique.mockResolvedValue(null);
      prismaMock.asset.create.mockResolvedValue({
        id: assetId,
        ...input,
        criticality: AssetCriticality.MEDIUM,
        status: AssetStatus.ACTIVE,
      });

      await createAsset(admin, input);

      expect(prismaMock.asset.create).toHaveBeenCalledWith({
        data: {
          ...input,
          criticality: AssetCriticality.MEDIUM,
          status: AssetStatus.ACTIVE,
        },
      });
    });

    it("throws AssetNameConflictError when the asset name already exists", async () => {
      prismaMock.asset.findUnique.mockResolvedValue({
        id: "existing-asset",
      });

      await expect(
        createAsset(admin, {
          name: "Lobby Air Conditioner",
          type: "HVAC Unit",
          location: "Main Lobby",
          criticality: AssetCriticality.MEDIUM,
          status: AssetStatus.ACTIVE,
        }),
      ).rejects.toBeInstanceOf(AssetNameConflictError);

      expect(prismaMock.asset.create).not.toHaveBeenCalled();
    });
  });

  describe("updateAsset", () => {
    it("updates an existing asset", async () => {
      const input = {
        location: "Second Floor",
        criticality: AssetCriticality.CRITICAL,
      };

      prismaMock.asset.findUnique.mockResolvedValue({
        id: assetId,
        name: baseAsset.name,
      });

      prismaMock.asset.update.mockResolvedValue({
        ...baseAsset,
        ...input,
      });

      const result = await updateAsset(admin, assetId, input);

      expect(result).toEqual({
        ...baseAsset,
        ...input,
      });

      expect(prismaMock.asset.update).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
        data: input,
      });
    });

    it("throws AssetNotFoundError when updating a missing asset", async () => {
      prismaMock.asset.findUnique.mockResolvedValue(null);

      await expect(
        updateAsset(admin, assetId, {
          location: "Second Floor",
        }),
      ).rejects.toBeInstanceOf(AssetNotFoundError);

      expect(prismaMock.asset.update).not.toHaveBeenCalled();
    });

    it("throws AssetNameConflictError when renaming to an existing asset name", async () => {
      prismaMock.asset.findUnique
        .mockResolvedValueOnce({
          id: assetId,
          name: "Old Asset Name",
        })
        .mockResolvedValueOnce({
          id: "different-asset",
        });

      await expect(
        updateAsset(admin, assetId, {
          name: "Existing Asset",
        }),
      ).rejects.toBeInstanceOf(AssetNameConflictError);

      expect(prismaMock.asset.update).not.toHaveBeenCalled();
    });

    it("does not perform a duplicate-name lookup when the name is unchanged", async () => {
      prismaMock.asset.findUnique.mockResolvedValue({
        id: assetId,
        name: baseAsset.name,
      });

      prismaMock.asset.update.mockResolvedValue({
        ...baseAsset,
        location: "Second Floor",
      });

      await updateAsset(admin, assetId, {
        name: baseAsset.name,
        location: "Second Floor",
      });

      expect(prismaMock.asset.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaMock.asset.update).toHaveBeenCalledTimes(1);
    });
  });
});