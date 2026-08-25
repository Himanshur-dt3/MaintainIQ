import { AssetStatus, IssueType, Priority, Role, TicketStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  asset: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  ticket: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  ticketHistory: {
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  aIAnalysis: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const triageTicketWithClaudeMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/src/server/db/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/src/server/services/claude", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/server/services/claude")>()),
  triageTicketWithClaude: triageTicketWithClaudeMock,
}));

import {
  aiTriageRecommendationSchema,
  formatValidationErrors,
  resolveTicketSchema,
  reviewTicketSchema,
  ticketIntakeSchema,
} from "@/src/lib/validation/tickets";
import {
  AuthorizationError,
  assertAssignedTechnician,
  assertTicketAccess,
} from "@/src/server/auth/guards";
import { cleanJsonResponse, TriageServiceError } from "@/src/server/services/claude";
import {
  createTicketFromTriage,
  resolveTicket,
  startTicketWork,
  WorkflowError,
} from "@/src/server/services/tickets";

const ids = {
  asset: "11111111-1111-4111-8111-111111111111",
  ticket: "22222222-2222-4222-8222-222222222222",
  reporter: "33333333-3333-4333-8333-333333333333",
  technician: "44444444-4444-4444-8444-444444444444",
  otherTechnician: "55555555-5555-4555-8555-555555555555",
};

const reporter = { id: ids.reporter, role: Role.REPORTER };
const technician = { id: ids.technician, role: Role.TECHNICIAN };

const validRecommendation = {
  asset_id: ids.asset,
  asset_name: "Lobby Air Conditioner",
  asset_type: "HVAC Unit",
  asset_location: "Main Lobby",
  create_asset: false,
  issue_type: IssueType.HVAC,
  priority: Priority.HIGH,
  possible_causes: ["Blocked condensate drain"],
  recommended_technician: "HVAC technician",
  suggested_action: "Inspect the drain and clear any obstruction.",
  confidence: 0.88,
};

function configureTransaction(): void {
  prismaMock.$transaction.mockImplementation(
    async (callback: (transaction: typeof prismaMock) => Promise<unknown>) =>
      callback(prismaMock),
  );
}

describe("ticket validation and Claude response handling", () => {
  it("accepts only reporter facts and exposes controlled validation errors", () => {
    const result = ticketIntakeSchema.safeParse({
      title: "  Air conditioner leaking  ",
      description: "  Water is pooling below the lobby air conditioner.  ",
      location: "  Main Lobby  ",
      priority: Priority.CRITICAL,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(formatValidationErrors(result.error)).toEqual({
        request: "Unrecognized key(s) in object: 'priority'",
      });
    }
  });

  it("rejects contradictory asset recommendations and incomplete resolutions", () => {
    const assetResult = aiTriageRecommendationSchema.safeParse({
      ...validRecommendation,
      create_asset: true,
    });
    const resolutionResult = resolveTicketSchema.safeParse({
      resolutionNotes: "   ",
    });

    expect(assetResult.success).toBe(false);
    expect(resolutionResult.success).toBe(false);
  });

  it("accepts review notes for retained values while requiring non-empty reviewer rationale", () => {
    const unchangedReview = reviewTicketSchema.safeParse({
      reviewNote: "Retain the existing AI outcome.",
    });
    const missingNote = reviewTicketSchema.safeParse({
      priority: Priority.CRITICAL,
      reviewNote: " ",
    });

    expect(unchangedReview.success).toBe(true);
    expect(missingNote.success).toBe(false);
  });

  it("extracts a JSON object from Markdown-wrapped Claude output", () => {
    expect(
      cleanJsonResponse(
        "```json\n{\"priority\":\"HIGH\",\"issue_type\":\"HVAC\"}\n```",
      ),
    ).toBe('{"priority":"HIGH","issue_type":"HVAC"}');
  });

  it("rejects Claude content that does not contain a JSON object", () => {
    expect(() => cleanJsonResponse("I recommend checking the drain.")).toThrow(
      TriageServiceError,
    );
  });
});

describe("server-side authorization guards", () => {
  const ticket = {
    reporterId: ids.reporter,
    technicianId: ids.technician,
  };

  it("allows only the persisted reporter, assigned technician, or administrator", () => {
    expect(() => assertTicketAccess(reporter, ticket)).not.toThrow();
    expect(() => assertTicketAccess(technician, ticket)).not.toThrow();
    expect(() =>
      assertTicketAccess({ id: "admin", role: Role.ADMIN }, ticket),
    ).not.toThrow();

    expect(() =>
      assertTicketAccess({ id: "different-reporter", role: Role.REPORTER }, ticket),
    ).toThrow(AuthorizationError);
  });

  it("requires the exact persisted technician assignment for workflow mutation", () => {
    expect(() => assertAssignedTechnician(technician, ticket)).not.toThrow();
    expect(() =>
      assertAssignedTechnician(
        { id: ids.otherTechnician, role: Role.TECHNICIAN },
        ticket,
      ),
    ).toThrow(AuthorizationError);
    expect(() => assertAssignedTechnician(reporter, ticket)).toThrow(
      AuthorizationError,
    );
  });
});

describe("ticket persistence and workflow services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureTransaction();
  });

  it("rejects an unrelated AI-selected asset and creates the recommendation asset with audit history", async () => {
    prismaMock.asset.findMany.mockResolvedValue([]);
    triageTicketWithClaudeMock.mockResolvedValue(validRecommendation);
    prismaMock.asset.findFirst
      .mockResolvedValueOnce({
        id: ids.asset,
        location: "Basement Laundry Room",
      })
      .mockResolvedValueOnce(null);
    prismaMock.asset.findUnique.mockResolvedValue(null);
    prismaMock.asset.create.mockResolvedValue({ id: "created-asset" });
    prismaMock.ticket.create.mockResolvedValue({ id: ids.ticket });
    prismaMock.aIAnalysis.create.mockResolvedValue({});
    prismaMock.ticketHistory.create.mockResolvedValue({});

    const result = await createTicketFromTriage(reporter, {
      title: "Lobby air conditioner leaking",
      description: "Water is pooling below the air conditioner in the lobby.",
      location: "Main Lobby",
    });

    expect(prismaMock.asset.create).toHaveBeenCalledWith({
      data: {
        name: validRecommendation.asset_name,
        type: validRecommendation.asset_type,
        location: validRecommendation.asset_location,
        status: AssetStatus.ACTIVE,
      },
      select: { id: true },
    });
    expect(prismaMock.ticket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assetId: "created-asset",
        reporterId: ids.reporter,
        status: TicketStatus.REPORTED,
      }),
    });
    expect(prismaMock.ticketHistory.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          action: "TICKET_CREATED",
          actorId: ids.reporter,
        }),
      }),
    );
    expect(prismaMock.ticketHistory.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          action: "AI_TRIAGE_COMPLETED",
          note: "AI recommendation created a relevant asset.",
        }),
      }),
    );
    expect(result.assetCreated).toBe(true);
  });

  it("does not allow another technician to start assigned work", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      id: ids.ticket,
      reporterId: ids.reporter,
      technicianId: ids.technician,
      status: TicketStatus.ASSIGNED,
    });

    await expect(
      startTicketWork(
        { id: ids.otherTechnician, role: Role.TECHNICIAN },
        ids.ticket,
      ),
    ).rejects.toThrow(AuthorizationError);

    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(prismaMock.ticketHistory.create).not.toHaveBeenCalled();
  });

  it("records an assigned technician's status transition in the same transaction", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      id: ids.ticket,
      reporterId: ids.reporter,
      technicianId: ids.technician,
      status: TicketStatus.ASSIGNED,
    });
    prismaMock.ticket.update.mockResolvedValue({
      id: ids.ticket,
      status: TicketStatus.IN_PROGRESS,
    });
    prismaMock.ticketHistory.create.mockResolvedValue({});

    await startTicketWork(technician, ids.ticket);

    expect(prismaMock.ticket.update).toHaveBeenCalledWith({
      where: { id: ids.ticket },
      data: { status: TicketStatus.IN_PROGRESS },
    });
    expect(prismaMock.ticketHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticketId: ids.ticket,
        actorId: ids.technician,
        action: "WORK_STARTED",
        previousValue: TicketStatus.ASSIGNED,
        newValue: TicketStatus.IN_PROGRESS,
      }),
    });
  });

  it("rejects resolution before work is in progress without mutating the ticket", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      id: ids.ticket,
      reporterId: ids.reporter,
      technicianId: ids.technician,
      status: TicketStatus.ASSIGNED,
    });

    await expect(
      resolveTicket(technician, ids.ticket, {
        resolutionNotes: "Replaced the damaged valve.",
      }),
    ).rejects.toThrow(
      new WorkflowError("Only in-progress tickets may be resolved."),
    );

    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(prismaMock.ticketHistory.create).not.toHaveBeenCalled();
  });

  it("persists a non-empty resolution note and its actor-attributed history record", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      id: ids.ticket,
      reporterId: ids.reporter,
      technicianId: ids.technician,
      status: TicketStatus.IN_PROGRESS,
    });
    prismaMock.ticket.update.mockResolvedValue({
      id: ids.ticket,
      status: TicketStatus.RESOLVED,
    });
    prismaMock.ticketHistory.create.mockResolvedValue({});

    await resolveTicket(technician, ids.ticket, {
      resolutionNotes: "Cleared the condensate drain and confirmed normal operation.",
    });

    expect(prismaMock.ticket.update).toHaveBeenCalledWith({
      where: { id: ids.ticket },
      data: {
        status: TicketStatus.RESOLVED,
        resolutionNotes:
          "Cleared the condensate drain and confirmed normal operation.",
        resolvedAt: expect.any(Date),
      },
    });
    expect(prismaMock.ticketHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticketId: ids.ticket,
        actorId: ids.technician,
        action: "TICKET_RESOLVED",
        previousValue: TicketStatus.IN_PROGRESS,
        newValue: TicketStatus.RESOLVED,
        note: "Cleared the condensate drain and confirmed normal operation.",
      }),
    });
  });
});
