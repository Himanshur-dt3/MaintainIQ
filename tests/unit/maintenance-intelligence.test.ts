import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  asset: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/src/server/db/prisma", () => ({
  default: prismaMock,
}));

import { getAssetMaintenanceInsights } from "@/src/server/services/maintenance-intelligence";

const DAY = 24 * 60 * 60 * 1000;

function makeAsset(
  id: string,
  name: string,
  tickets: Array<{
    issueType?: string;
    status?: string;
    priority?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }>,
) {
  return {
    id,
    name,
    type: "HVAC",
    location: "Main Lobby",
    tickets: tickets.map((ticket) => ({
      issueType: ticket.issueType ?? "HVAC",
      status: ticket.status ?? "RESOLVED",
      priority: ticket.priority ?? "MEDIUM",
      createdAt: ticket.createdAt ?? new Date(),
      updatedAt: ticket.updatedAt ?? new Date(),
    })),
  };
}

describe("maintenance intelligence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks an asset with no ticket history as insufficient data", async () => {
    prismaMock.asset.findMany.mockResolvedValue([
      makeAsset("asset-1", "Unused HVAC", []),
    ]);

    const [insight] = await getAssetMaintenanceInsights();

    expect(insight).toMatchObject({
      assetId: "asset-1",
      totalTickets: 0,
      recentTickets: 0,
      previousPeriodTickets: 0,
      openTickets: 0,
      trend: "NO_HISTORY",
      dataConfidence: "INSUFFICIENT",
    });
  });

  it("detects new maintenance activity when there is no previous-period history", async () => {
    prismaMock.asset.findMany.mockResolvedValue([
      makeAsset("asset-1", "Lobby HVAC", [
        {
          status: "RESOLVED",
          priority: "MEDIUM",
          createdAt: new Date(Date.now() - 5 * DAY),
        },
      ]),
    ]);

    const [insight] = await getAssetMaintenanceInsights();

    expect(insight.trend).toBe("NEW_ACTIVITY");
    expect(insight.recentTickets).toBe(1);
    expect(insight.previousPeriodTickets).toBe(0);
    expect(insight.dataConfidence).toBe("LIMITED");
  });

  it("detects worsening maintenance activity", async () => {
    prismaMock.asset.findMany.mockResolvedValue([
      makeAsset("asset-1", "Production HVAC", [
        {
          status: "RESOLVED",
          createdAt: new Date(Date.now() - 5 * DAY),
        },
        {
          status: "RESOLVED",
          createdAt: new Date(Date.now() - 10 * DAY),
        },
        {
          status: "RESOLVED",
          createdAt: new Date(Date.now() - 45 * DAY),
        },
      ]),
    ]);

    const [insight] = await getAssetMaintenanceInsights();

    expect(insight.trend).toBe("WORSENING");
    expect(insight.recentTickets).toBe(2);
    expect(insight.previousPeriodTickets).toBe(1);
  });

  it("increases risk when active critical maintenance work exists", async () => {
    prismaMock.asset.findMany.mockResolvedValue([
      makeAsset("asset-1", "Critical HVAC", [
        {
          status: "IN_PROGRESS",
          priority: "CRITICAL",
          createdAt: new Date(Date.now() - 2 * DAY),
        },
      ]),
    ]);

    const [insight] = await getAssetMaintenanceInsights();

    expect(insight.openTickets).toBe(1);
    expect(insight.criticalTickets).toBe(1);
    expect(insight.healthScore).toBeLessThan(60);
    expect(["HIGH", "CRITICAL"]).toContain(insight.riskLevel);
  });

  it("counts only unresolved tickets for active severity signals", async () => {
    prismaMock.asset.findMany.mockResolvedValue([
      makeAsset("asset-1", "Resolved History HVAC", [
        {
          status: "RESOLVED",
          priority: "CRITICAL",
          createdAt: new Date(Date.now() - 5 * DAY),
        },
        {
          status: "IN_PROGRESS",
          priority: "HIGH",
          createdAt: new Date(Date.now() - 5 * DAY),
        },
      ]),
    ]);

    const [insight] = await getAssetMaintenanceInsights();

    expect(insight.totalTickets).toBe(2);
    expect(insight.openTickets).toBe(1);
    expect(insight.criticalTickets).toBe(0);
    expect(insight.highPriorityTickets).toBe(1);
  });

  it("identifies the dominant issue type from maintenance history", async () => {
    prismaMock.asset.findMany.mockResolvedValue([
      makeAsset("asset-1", "Mixed Asset", [
        { issueType: "HVAC" },
        { issueType: "HVAC" },
        { issueType: "ELECTRICAL" },
      ]),
    ]);

    const [insight] = await getAssetMaintenanceInsights();

    expect(insight.dominantIssueType).toBe("HVAC");
  });

  it("calculates a higher priority score for a more urgent asset", async () => {
    prismaMock.asset.findMany.mockResolvedValue([
      makeAsset("asset-1", "Stable Asset", [
        {
          status: "RESOLVED",
          priority: "LOW",
          createdAt: new Date(Date.now() - 50 * DAY),
        },
      ]),
      makeAsset("asset-2", "Urgent Asset", [
        {
          status: "IN_PROGRESS",
          priority: "CRITICAL",
          createdAt: new Date(Date.now() - 2 * DAY),
        },
        {
          status: "IN_PROGRESS",
          priority: "HIGH",
          createdAt: new Date(Date.now() - 5 * DAY),
        },
      ]),
    ]);

    const insights = await getAssetMaintenanceInsights();

    const stable = insights.find((item) => item.assetId === "asset-1");
    const urgent = insights.find((item) => item.assetId === "asset-2");

    expect(stable).toBeDefined();
    expect(urgent).toBeDefined();
    expect(urgent!.priorityScore).toBeGreaterThan(stable!.priorityScore);
  });

  it("sorts returned insights from lowest health to highest health", async () => {
    prismaMock.asset.findMany.mockResolvedValue([
      makeAsset("asset-1", "Healthy Asset", []),
      makeAsset("asset-2", "Risky Asset", [
        {
          status: "IN_PROGRESS",
          priority: "CRITICAL",
          createdAt: new Date(Date.now() - 2 * DAY),
        },
      ]),
    ]);

    const insights = await getAssetMaintenanceInsights();

    expect(insights).toHaveLength(2);
    expect(insights[0].healthScore).toBeLessThanOrEqual(
      insights[1].healthScore,
    );
  });
});
