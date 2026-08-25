import { Role, TicketStatus, IssueType, Priority } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
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

import { getTechnicianAnalytics } from "@/src/server/services/technician-analytics";
import { AuthorizationError } from "@/src/server/auth/guards";

const admin = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  role: Role.ADMIN,
};

const technician = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  role: Role.TECHNICIAN,
};

describe("technician analytics", () => {
  it("rejects non-admin users", async () => {
    await expect(
      getTechnicianAnalytics(technician),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it("returns workload and performance metrics", async () => {
    const createdAt = new Date("2026-08-01T08:00:00Z");
    const firstResponseAt = new Date("2026-08-01T10:00:00Z");
    const resolvedAt = new Date("2026-08-01T14:00:00Z");
    const slaDeadline = new Date("2026-08-01T18:00:00Z");

    prismaMock.user.findMany.mockResolvedValue([
      {
        id: technician.id,
        name: "Jordan Lee",
        email: "technician@maintainiq.demo",
        jobTitle: "Maintenance Technician",
        assignedTickets: [
          {
            id: "ticket-1",
            issueType: IssueType.HVAC,
            priority: Priority.HIGH,
            status: TicketStatus.RESOLVED,
            assetId: "asset-1",
            createdAt,
            firstResponseAt,
            resolvedAt,
            slaDeadline,
          },
          {
            id: "ticket-2",
            issueType: IssueType.PLUMBING,
            priority: Priority.MEDIUM,
            status: TicketStatus.IN_PROGRESS,
            assetId: "asset-2",
            createdAt,
            firstResponseAt: null,
            resolvedAt: null,
            slaDeadline: null,
          },
        ],
      },
    ]);

    const result = await getTechnicianAnalytics(admin);

    expect(result).toHaveLength(1);

    expect(result[0].technician).toEqual({
      id: technician.id,
      name: "Jordan Lee",
      email: "technician@maintainiq.demo",
      jobTitle: "Maintenance Technician",
    });

    expect(result[0].workload).toEqual({
      openTickets: 1,
      assignedTickets: 2,
    });

    expect(result[0].performance.totalTickets).toBe(2);
    expect(result[0].performance.resolvedTickets).toBe(1);
    expect(result[0].performance.averageResolutionHours).toBe(6);
    expect(result[0].performance.firstResponseRate).toBe(0.5);
    expect(result[0].performance.slaComplianceRate).toBe(1);

    expect(result[0].priorityMix).toEqual({
      HIGH: 1,
      MEDIUM: 1,
    });

    expect(result[0].byIssueType).toEqual({
      HVAC: {
        totalTickets: 1,
        resolvedTickets: 1,
        averageResolutionHours: 6,
      },
      PLUMBING: {
        totalTickets: 1,
        resolvedTickets: 0,
        averageResolutionHours: null,
      },
    });
  });

  it("handles technicians with no tickets", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: technician.id,
        name: "Jordan Lee",
        email: "technician@maintainiq.demo",
        jobTitle: "Maintenance Technician",
        assignedTickets: [],
      },
    ]);

    const result = await getTechnicianAnalytics(admin);

    expect(result[0].workload).toEqual({
      openTickets: 0,
      assignedTickets: 0,
    });

    expect(result[0].performance).toEqual({
      totalTickets: 0,
      resolvedTickets: 0,
      averageResolutionHours: null,
      firstResponseRate: null,
      slaComplianceRate: null,
    });

    expect(result[0].priorityMix).toEqual({});
    expect(result[0].byIssueType).toEqual({});
  });
});
