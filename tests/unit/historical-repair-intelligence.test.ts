import { IssueType, Priority, Role, TicketStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  ticket: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/src/server/db/prisma", () => ({
  default: prismaMock,
}));

import {
  findHistoricalRepairMatches,
} from "@/src/server/services/historical-repair-intelligence";

const ticketId = "11111111-1111-4111-8111-111111111111";

const currentTicket = {
  id: ticketId,
  assetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  issueType: IssueType.HVAC,
  location: "Main Lobby",
  asset: {
    type: "HVAC Unit",
  },
};

describe("historical repair intelligence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("current ticket lookup", () => {
    it("returns no matches when the ticket does not exist", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      const result = await findHistoricalRepairMatches(ticketId);

      expect(result).toEqual([]);
      expect(prismaMock.ticket.findMany).not.toHaveBeenCalled();
    });

    it("looks up the current ticket before historical repairs", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(currentTicket);
      prismaMock.ticket.findMany.mockResolvedValue([]);

      await findHistoricalRepairMatches(ticketId);

      expect(prismaMock.ticket.findUnique).toHaveBeenCalledWith({
        where: {
          id: ticketId,
        },
        select: {
          id: true,
          assetId: true,
          issueType: true,
          location: true,
          asset: {
            select: {
              type: true,
            },
          },
        },
      });
    });
  });

  describe("historical matching", () => {
    it("ranks the same asset and same issue as the strongest match", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(currentTicket);

      prismaMock.ticket.findMany.mockResolvedValue([
        {
          id: "22222222-2222-4222-8222-222222222222",
          assetId: currentTicket.assetId,
          issueType: IssueType.HVAC,
          priority: Priority.HIGH,
          location: "Main Lobby",
          resolvedAt: new Date("2026-08-20T10:00:00Z"),
          resolutionNotes: "Replaced the failed compressor belt.",
          asset: {
            name: "Lobby Air Conditioner",
            type: "HVAC Unit",
            location: "Main Lobby",
          },
        },
      ]);

      const result = await findHistoricalRepairMatches(ticketId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ticketId: "22222222-2222-4222-8222-222222222222",
        assetName: "Lobby Air Conditioner",
        issueType: IssueType.HVAC,
        resolutionNotes: "Replaced the failed compressor belt.",
        relevanceScore: 100,
      });
    });

    it("matches the same asset even when the issue type differs", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(currentTicket);

      prismaMock.ticket.findMany.mockResolvedValue([
        {
          id: "22222222-2222-4222-8222-222222222222",
          assetId: currentTicket.assetId,
          issueType: IssueType.ELECTRICAL,
          priority: Priority.MEDIUM,
          location: "Main Lobby",
          resolvedAt: new Date("2026-08-19T10:00:00Z"),
          resolutionNotes: "Replaced damaged control wiring.",
          asset: {
            name: "Lobby Air Conditioner",
            type: "HVAC Unit",
            location: "Main Lobby",
          },
        },
      ]);

      const result = await findHistoricalRepairMatches(ticketId);

      expect(result[0]?.relevanceScore).toBe(75);
    });

    it("matches the same asset type and issue type", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(currentTicket);

      prismaMock.ticket.findMany.mockResolvedValue([
        {
          id: "22222222-2222-4222-8222-222222222222",
          assetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          issueType: IssueType.HVAC,
          priority: Priority.MEDIUM,
          location: "Second Floor",
          resolvedAt: new Date("2026-08-18T10:00:00Z"),
          resolutionNotes: "Cleaned filters and serviced the unit.",
          asset: {
            name: "Conference Room HVAC",
            type: "HVAC Unit",
            location: "Second Floor",
          },
        },
      ]);

      const result = await findHistoricalRepairMatches(ticketId);

      expect(result[0]?.relevanceScore).toBe(60);
    });

    it("matches the same location and issue type", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(currentTicket);

      prismaMock.ticket.findMany.mockResolvedValue([
        {
          id: "22222222-2222-4222-8222-222222222222",
          assetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          issueType: IssueType.HVAC,
          priority: Priority.LOW,
          location: "Main Lobby",
          resolvedAt: new Date("2026-08-17T10:00:00Z"),
          resolutionNotes: "Adjusted thermostat calibration.",
          asset: {
            name: "Reception HVAC",
            type: "Cooling System",
            location: "Main Lobby",
          },
        },
      ]);

      const result = await findHistoricalRepairMatches(ticketId);

      expect(result[0]?.relevanceScore).toBe(45);
    });

    it("ignores unrelated historical repairs", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(currentTicket);

      prismaMock.ticket.findMany.mockResolvedValue([
        {
          id: "22222222-2222-4222-8222-222222222222",
          assetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          issueType: IssueType.PLUMBING,
          priority: Priority.LOW,
          location: "Basement",
          resolvedAt: new Date("2026-08-16T10:00:00Z"),
          resolutionNotes: "Replaced leaking pipe joint.",
          asset: {
            name: "Basement Pipe",
            type: "Pipe System",
            location: "Basement",
          },
        },
      ]);

      const result = await findHistoricalRepairMatches(ticketId);

      expect(result).toEqual([]);
    });

    it("ignores historical tickets without resolution notes", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(currentTicket);

      prismaMock.ticket.findMany.mockResolvedValue([
        {
          id: "22222222-2222-4222-8222-222222222222",
          assetId: currentTicket.assetId,
          issueType: IssueType.HVAC,
          priority: Priority.HIGH,
          location: "Main Lobby",
          resolvedAt: new Date("2026-08-15T10:00:00Z"),
          resolutionNotes: null,
          asset: {
            name: "Lobby Air Conditioner",
            type: "HVAC Unit",
            location: "Main Lobby",
          },
        },
      ]);

      const result = await findHistoricalRepairMatches(ticketId);

      expect(result).toEqual([]);
    });
  });

  describe("ordering and limits", () => {
    it("orders matches by relevance and then resolution date", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(currentTicket);

      prismaMock.ticket.findMany.mockResolvedValue([
        {
          id: "33333333-3333-4333-8333-333333333333",
          assetId: currentTicket.assetId,
          issueType: IssueType.HVAC,
          priority: Priority.MEDIUM,
          location: "Main Lobby",
          resolvedAt: new Date("2026-08-10T10:00:00Z"),
          resolutionNotes: "Older same-asset repair.",
          asset: {
            name: "Lobby Air Conditioner",
            type: "HVAC Unit",
            location: "Main Lobby",
          },
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          assetId: currentTicket.assetId,
          issueType: IssueType.HVAC,
          priority: Priority.HIGH,
          location: "Main Lobby",
          resolvedAt: new Date("2026-08-20T10:00:00Z"),
          resolutionNotes: "Newer same-asset repair.",
          asset: {
            name: "Lobby Air Conditioner",
            type: "HVAC Unit",
            location: "Main Lobby",
          },
        },
      ]);

      const result = await findHistoricalRepairMatches(ticketId);

      expect(result.map((item) => item.ticketId)).toEqual([
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      ]);
    });

    it("limits the returned matches to five", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(currentTicket);

      const historicalTickets = Array.from({ length: 7 }, (_, index) => ({
        id: `${String(index + 2).padStart(8, "0")}-2222-4222-8222-222222222222`,
        assetId: currentTicket.assetId,
        issueType: IssueType.HVAC,
        priority: Priority.MEDIUM,
        location: "Main Lobby",
        resolvedAt: new Date(
          `2026-08-${String(20 - index).padStart(2, "0")}T10:00:00Z`,
        ),
        resolutionNotes: `Historical repair ${index + 1}`,
        asset: {
          name: "Lobby Air Conditioner",
          type: "HVAC Unit",
          location: "Main Lobby",
        },
      }));

      prismaMock.ticket.findMany.mockResolvedValue(historicalTickets);

      const result = await findHistoricalRepairMatches(ticketId);

      expect(result).toHaveLength(5);
    });
  });

  describe("database query", () => {
    it("only requests resolved historical tickets with resolution notes", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(currentTicket);
      prismaMock.ticket.findMany.mockResolvedValue([]);

      await findHistoricalRepairMatches(ticketId);

      expect(prismaMock.ticket.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            not: ticketId,
          },
          status: TicketStatus.RESOLVED,
          resolutionNotes: {
            not: null,
          },
        },
        select: {
          id: true,
          assetId: true,
          issueType: true,
          priority: true,
          location: true,
          resolvedAt: true,
          resolutionNotes: true,
          asset: {
            select: {
              name: true,
              type: true,
              location: true,
            },
          },
        },
      });
    });
  });
});