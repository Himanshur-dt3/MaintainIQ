import {
  AssetStatus,
  Prisma,
  Role,
  TicketStatus,
  IssueType,
  Priority,
} from "@prisma/client";

import {
  AuthorizationError,
  assertAssignedTechnician,
  assertTicketAccess,
} from "@/src/server/auth/guards";
import prisma from "@/src/server/db/prisma";
import { triageTicketWithClaude } from "@/src/server/services/claude";
import type {
  AddWorkNoteInput,
  AdminTicketFilters,
  AiTriageRecommendation,
  AssignTicketInput,
  CreateTicketInput,
  ReviewTicketInput,
  ResolveTicketInput,
  TicketIntakeInput,
} from "@/src/lib/validation/tickets";

export type TicketActor = {
  id: string;
  role: Role;
};

export class NotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message = "The requested resource was not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class WorkflowError extends Error {
  readonly statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = "WorkflowError";
  }
}

const ticketAccessSelection = {
  id: true,
  reporterId: true,
  technicianId: true,
  status: true,
} as const;

type TicketAccessSnapshot = Prisma.TicketGetPayload<{
  select: typeof ticketAccessSelection;
}>;

type AssetCatalogEntry = {
  id: string;
  name: string;
  type: string;
  location: string;
};

async function getTicketAccessSnapshot(ticketId: string): Promise<TicketAccessSnapshot> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: ticketAccessSelection,
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  return ticket;
}

async function requireAdmin(actor: TicketActor): Promise<void> {
  if (actor.role !== "ADMIN") {
    throw new AuthorizationError("Only administrators may perform this action.");
  }
}

async function createHistory(
  tx: Prisma.TransactionClient,
  ticketId: string,
  actorId: string,
  action: string,
  previousValue?: string | null,
  newValue?: string | null,
  note?: string | null,
): Promise<void> {
  await tx.ticketHistory.create({
    data: {
      ticketId,
      actorId,
      action,
      previousValue,
      newValue,
      note,
    },
  });
}

function normalizeLocation(location: string): string {
  return location.trim().toLocaleLowerCase();
}

function isLocationRelevant(
  recommendedLocation: string,
  reportedLocation: string,
  assetLocation: string,
): boolean {
  const normalizedReported = normalizeLocation(reportedLocation);
  const normalizedRecommended = normalizeLocation(recommendedLocation);
  const normalizedAsset = normalizeLocation(assetLocation);

  return (
    normalizedAsset === normalizedReported ||
    normalizedAsset === normalizedRecommended ||
    normalizedAsset.includes(normalizedReported) ||
    normalizedReported.includes(normalizedAsset) ||
    normalizedAsset.includes(normalizedRecommended) ||
    normalizedRecommended.includes(normalizedAsset)
  );
}

async function resolveAssetForTriage(
  tx: Prisma.TransactionClient,
  intake: TicketIntakeInput,
  recommendation: AiTriageRecommendation,
): Promise<{ id: string; created: boolean }> {
  if (!recommendation.create_asset && recommendation.asset_id) {
    const existingAsset = await tx.asset.findFirst({
      where: {
        id: recommendation.asset_id,
        status: AssetStatus.ACTIVE,
      },
      select: {
        id: true,
        location: true,
      },
    });

    if (
      existingAsset &&
      isLocationRelevant(
        recommendation.asset_location,
        intake.location,
        existingAsset.location,
      )
    ) {
      return { id: existingAsset.id, created: false };
    }
  }

  const matchingGeneratedAsset = await tx.asset.findFirst({
    where: {
      status: AssetStatus.ACTIVE,
      name: recommendation.asset_name,
      location: {
        equals: recommendation.asset_location,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (matchingGeneratedAsset) {
    return { id: matchingGeneratedAsset.id, created: false };
  }

  const duplicateName = await tx.asset.findUnique({
    where: { name: recommendation.asset_name },
    select: { id: true },
  });

  if (duplicateName) {
    return { id: duplicateName.id, created: false };
  }

  const createdAsset = await tx.asset.create({
    data: {
      name: recommendation.asset_name,
      type: recommendation.asset_type,
      location: recommendation.asset_location,
      status: AssetStatus.ACTIVE,
    },
    select: { id: true },
  });

  return { id: createdAsset.id, created: true };
}

/**
 * Runs AI triage, resolves a context-relevant asset, and atomically persists
 * the reporter ticket, persisted AI analysis, and audit history.
 *
 * @param actor - Authenticated reporter submitting the issue.
 * @param intake - Validated reporter-provided issue facts.
 * @returns The created ticket, AI recommendation, and asset-resolution outcome.
 * @throws {AuthorizationError} When the actor is not a reporter.
 * @throws {TriageServiceError} When AI configuration or recommendation validation fails.
 */
export async function createTicketFromTriage(
  actor: TicketActor,
  intake: TicketIntakeInput,
): Promise<{
  ticket: Awaited<ReturnType<typeof createTicket>>;
  analysis: AiTriageRecommendation;
  assetCreated: boolean;
}> {
  if (actor.role !== "REPORTER") {
    throw new AuthorizationError("Only reporters may create tickets.");
  }

  const assetCatalog: AssetCatalogEntry[] = await prisma.asset.findMany({
    where: { status: AssetStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
    },
    orderBy: { name: "asc" },
  });

  const analysis = await triageTicketWithClaude(intake, assetCatalog);

  return prisma.$transaction(async (tx) => {
    const asset = await resolveAssetForTriage(tx, intake, analysis);
    const ticket = await tx.ticket.create({
      data: {
        title: intake.title,
        description: intake.description,
        location: intake.location,
        issueType: analysis.issue_type,
        priority: analysis.priority,
        assetId: asset.id,
        reporterId: actor.id,
        status: TicketStatus.REPORTED,
      },
    });

    await tx.aIAnalysis.create({
      data: {
        ticketId: ticket.id,
        issueType: analysis.issue_type,
        priority: analysis.priority,
        possibleCauses: analysis.possible_causes,
        recommendedTechnician: analysis.recommended_technician,
        suggestedAction: analysis.suggested_action,
        confidence: analysis.confidence,
      },
    });

    await createHistory(
      tx,
      ticket.id,
      actor.id,
      "TICKET_CREATED",
      null,
      TicketStatus.REPORTED,
      "Ticket reported with a validated AI recommendation.",
    );

    await createHistory(
      tx,
      ticket.id,
      actor.id,
      "AI_TRIAGE_COMPLETED",
      null,
      `${analysis.issue_type}/${analysis.priority}`,
      asset.created
        ? "AI recommendation created a relevant asset."
        : "AI recommendation reused a relevant asset.",
    );

    return {
      ticket,
      analysis,
      assetCreated: asset.created,
    };
  });
}

/**
 * Creates a reporter-owned ticket and durable creation audit record.
 *
 * @param actor - Authenticated reporter making the request.
 * @param input - Validated ticket fields.
 * @returns The created ticket.
 * @throws {AuthorizationError} When the actor is not a reporter.
 * @throws {NotFoundError} When the selected asset does not exist.
 */

/**
 * Re-runs AI analysis against the current persisted ticket facts.
 * This updates the AIAnalysis record without changing the ticket workflow state.
 */
export async function reanalyzeTicket(
  actor: TicketActor,
  ticketId: string,
) {
  if (actor.role !== "ADMIN") {
    throw new AuthorizationError(
      "Only administrators may re-run ticket AI analysis.",
    );
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
    },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  const assetCatalog: AssetCatalogEntry[] = await prisma.asset.findMany({
    where: { status: AssetStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
    },
    orderBy: { name: "asc" },
  });

  const analysis = await triageTicketWithClaude(
    {
      title: ticket.title,
      description: ticket.description,
      location: ticket.location,
    },
    assetCatalog,
  );

  const savedAnalysis = await prisma.aIAnalysis.upsert({
    where: { ticketId: ticket.id },
    create: {
      ticketId: ticket.id,
      issueType: analysis.issue_type,
      priority: analysis.priority,
      possibleCauses: analysis.possible_causes,
      recommendedTechnician: analysis.recommended_technician,
      suggestedAction: analysis.suggested_action,
      confidence: analysis.confidence,
    },
    update: {
      issueType: analysis.issue_type,
      priority: analysis.priority,
      possibleCauses: analysis.possible_causes,
      recommendedTechnician: analysis.recommended_technician,
      suggestedAction: analysis.suggested_action,
      confidence: analysis.confidence,
    },
  });

  return savedAnalysis;
}

export async function createTicket(
  actor: TicketActor,
  input: CreateTicketInput,
) {
  if (actor.role !== "REPORTER") {
    throw new AuthorizationError("Only reporters may create tickets.");
  }

  const asset = await prisma.asset.findUnique({
    where: { id: input.assetId },
    select: { id: true },
  });

  if (!asset) {
    throw new NotFoundError("Selected asset not found.");
  }

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        ...input,
        reporterId: actor.id,
        status: TicketStatus.REPORTED,
      },
    });

    await createHistory(
      tx,
      ticket.id,
      actor.id,
      "TICKET_CREATED",
      null,
      TicketStatus.REPORTED,
      "Ticket reported by reporter.",
    );

    return ticket;
  });
}

/**
 * Assigns an eligible technician to a ticket and records the assignment.
 *
 * @param actor - Authenticated administrator making the request.
 * @param ticketId - Ticket to assign.
 * @param input - Validated technician assignment.
 * @returns The updated ticket.
 * @throws {AuthorizationError} When the actor is not an administrator.
 * @throws {WorkflowError} When the ticket is already resolved.
 */
export async function assignTicket(
  actor: TicketActor,
  ticketId: string,
  input: AssignTicketInput,
) {
  await requireAdmin(actor);

  const [ticket, technician] = await Promise.all([
    getTicketAccessSnapshot(ticketId),
    prisma.user.findUnique({
      where: { id: input.technicianId },
      select: { id: true, role: true },
    }),
  ]);

  if (ticket.status === TicketStatus.RESOLVED) {
    throw new WorkflowError("Resolved tickets cannot be assigned.");
  }

  if (!technician || technician.role !== "TECHNICIAN") {
    throw new WorkflowError("Tickets may only be assigned to an active technician.");
  }

  return prisma.$transaction(async (tx) => {
    const updatedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        technicianId: technician.id,
        status: TicketStatus.ASSIGNED,
      },
    });

    await createHistory(
      tx,
      ticketId,
      actor.id,
      "TICKET_ASSIGNED",
      ticket.technicianId,
      technician.id,
      `Assigned technician; status ${ticket.status} → ${TicketStatus.ASSIGNED}.`,
    );

    return updatedTicket;
  });
}

/**
 * Transitions an assigned technician's ticket to in-progress work.
 *
 * @param actor - Authenticated assigned technician.
 * @param ticketId - Ticket to begin working.
 * @returns The updated ticket.
 * @throws {AuthorizationError} When the technician is not assigned.
 * @throws {WorkflowError} When the ticket is not assigned.
 */
export async function startTicketWork(actor: TicketActor, ticketId: string) {
  const ticket = await getTicketAccessSnapshot(ticketId);
  assertAssignedTechnician(actor, ticket);

  if (ticket.status !== TicketStatus.ASSIGNED) {
    throw new WorkflowError("Only assigned tickets may be started.");
  }

  return prisma.$transaction(async (tx) => {
    const updatedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.IN_PROGRESS },
    });

    await createHistory(
      tx,
      ticketId,
      actor.id,
      "WORK_STARTED",
      TicketStatus.ASSIGNED,
      TicketStatus.IN_PROGRESS,
      "Technician started work.",
    );

    return updatedTicket;
  });
}

/**
 * Adds an assigned technician's work note to a ticket's durable history.
 *
 * @param actor - Authenticated assigned technician.
 * @param ticketId - Ticket receiving the work note.
 * @param input - Validated note input.
 * @returns The created history entry.
 * @throws {WorkflowError} When work has not started.
 */
export async function addTicketWorkNote(
  actor: TicketActor,
  ticketId: string,
  input: AddWorkNoteInput,
) {
  const ticket = await getTicketAccessSnapshot(ticketId);
  assertAssignedTechnician(actor, ticket);

  if (ticket.status !== TicketStatus.IN_PROGRESS) {
    throw new WorkflowError("Work notes may only be added while work is in progress.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    return tx.ticketHistory.create({
      data: {
        ticketId,
        actorId: actor.id,
        action: "WORK_NOTE_ADDED",
        note: input.note,
      },
    });
  });
}

/**
 * Resolves an assigned technician's in-progress ticket with a required note.
 *
 * @param actor - Authenticated assigned technician.
 * @param ticketId - Ticket to resolve.
 * @param input - Validated non-empty resolution note.
 * @returns The updated resolved ticket.
 * @throws {WorkflowError} When the ticket is not in progress.
 */
export async function resolveTicket(
  actor: TicketActor,
  ticketId: string,
  input: ResolveTicketInput,
) {
  const ticket = await getTicketAccessSnapshot(ticketId);
  assertAssignedTechnician(actor, ticket);

  if (ticket.status !== TicketStatus.IN_PROGRESS) {
    throw new WorkflowError("Only in-progress tickets may be resolved.");
  }

  return prisma.$transaction(async (tx) => {
    const updatedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.RESOLVED,
        resolutionNotes: input.resolutionNotes,
      },
    });

    await createHistory(
      tx,
      ticketId,
      actor.id,
      "TICKET_RESOLVED",
      TicketStatus.IN_PROGRESS,
      TicketStatus.RESOLVED,
      input.resolutionNotes,
    );

    return updatedTicket;
  });
}

/**
 * Retrieves a ticket only when the actor has server-authorized access.
 *
 * @param actor - Authenticated actor requesting ticket data.
 * @param ticketId - Ticket to read.
 * @returns The ticket with immutable chronological history.
 * @throws {AuthorizationError} When the actor lacks access to the ticket.
 */
export async function getTicketForActor(actor: TicketActor, ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      asset: true,
      aiAnalysis: true,
      reporter: {
        select: { id: true, name: true, email: true },
      },
      technician: {
        select: { id: true, name: true, email: true },
      },
      history: {
        orderBy: { createdAt: "asc" },
        include: {
          actor: {
            select: { id: true, name: true, role: true },
          },
        },
      },
    },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  assertTicketAccess(actor, ticket);
  return ticket;
}

/**
 * Lists tickets visible to an actor using server-side ownership filtering.
 *
 * @param actor - Authenticated actor requesting ticket data.
 * @returns Tickets scoped to the actor's persisted role.
 */
export async function listTicketsForActor(actor: TicketActor) {
  const where: Prisma.TicketWhereInput =
    actor.role === "ADMIN"
      ? {}
      : actor.role === "REPORTER"
        ? { reporterId: actor.id }
        : { technicianId: actor.id };

  return prisma.ticket.findMany({
    where,
    include: {
      asset: {
        select: { id: true, name: true, location: true },
      },
      reporter: {
        select: { id: true, name: true, email: true },
      },
      technician: {
        select: { id: true, name: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Lists administrator-visible tickets with controlled operational filters.
 *
 * @param actor - Authenticated administrator requesting ticket records.
 * @param filters - Optional validated status, priority, issue type, and technician filters.
 * @returns Filtered ticket summaries suitable for management operations.
 * @throws {AuthorizationError} When the actor is not an administrator.
 */
export async function listAdminTickets(
  actor: TicketActor,
  filters: AdminTicketFilters,
) {
  await requireAdmin(actor);

  const where: Prisma.TicketWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.issueType ? { issueType: filters.issueType } : {}),
    ...(filters.technicianId
      ? { technicianId: filters.technicianId }
      : {}),
  };

  return prisma.ticket.findMany({
    where,
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          location: true,
          _count: { select: { tickets: true } },
        },
      },
      reporter: {
        select: { id: true, name: true },
      },
      technician: {
        select: { id: true, name: true },
      },
      aiAnalysis: {
        select: {
          issueType: true,
          priority: true,
          confidence: true,
          suggestedAction: true,
        },
      },
      history: {
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: { id: true, name: true, role: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Returns active technician candidates with their current open-ticket counts.
 *
 * @param actor - Authenticated administrator requesting technician availability.
 * @returns Technicians eligible for assignment with workload information.
 * @throws {AuthorizationError} When the actor is not an administrator.
 */
export async function listTechniciansForAdmin(actor: TicketActor) {
  await requireAdmin(actor);

  return prisma.user.findMany({
    where: { role: Role.TECHNICIAN },
    select: {
      id: true,
      name: true,
      email: true,
      jobTitle: true,
      _count: {
        select: {
          assignedTickets: {
            where: {
              status: { not: TicketStatus.RESOLVED },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Summarizes ticket workload for the administrator dashboard.
 *
 * @param actor - Authenticated administrator requesting operational metrics.
 * @returns Counts for total, open, assigned, in-progress, resolved, and unassigned work.
 * @throws {AuthorizationError} When the actor is not an administrator.
 */
export async function getAdminDashboardMetrics(actor: TicketActor) {
  await requireAdmin(actor);

  const [total, reported, assigned, inProgress, resolved, unassigned] =
    await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: TicketStatus.REPORTED } }),
      prisma.ticket.count({ where: { status: TicketStatus.ASSIGNED } }),
      prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
      prisma.ticket.count({ where: { status: TicketStatus.RESOLVED } }),
      prisma.ticket.count({
        where: {
          technicianId: null,
          status: { not: TicketStatus.RESOLVED },
        },
      }),
    ]);

  return {
    total,
    open: total - resolved,
    reported,
    assigned,
    inProgress,
    resolved,
    unassigned,
  };
}

/**
 * Applies administrator-reviewed issue type and/or priority overrides while
 * retaining the original AI recommendation and actor-attributed review record.
 *
 * @param actor - Authenticated administrator reviewing AI triage.
 * @param ticketId - Ticket receiving reviewed fields.
 * @param input - Validated override values and required rationale.
 * @returns The updated ticket.
 * @throws {AuthorizationError} When the actor is not an administrator.
 * @throws {NotFoundError} When the ticket does not exist.
 */
export async function reviewTicket(
  actor: TicketActor,
  ticketId: string,
  input: ReviewTicketInput,
) {
  await requireAdmin(actor);

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      issueType: true,
      priority: true,
    },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  const issueTypeChanged =
    input.issueType !== undefined && input.issueType !== ticket.issueType;
  const priorityChanged =
    input.priority !== undefined && input.priority !== ticket.priority;

  return prisma.$transaction(async (tx) => {
    const updatedTicket =
      issueTypeChanged || priorityChanged
        ? await tx.ticket.update({
            where: { id: ticketId },
            data: {
              ...(issueTypeChanged ? { issueType: input.issueType } : {}),
              ...(priorityChanged ? { priority: input.priority } : {}),
            },
          })
        : await tx.ticket.findUniqueOrThrow({ where: { id: ticketId } });

    if (!issueTypeChanged && !priorityChanged) {
      await createHistory(
        tx,
        ticketId,
        actor.id,
        "AI_REVIEW_CONFIRMED",
        `${ticket.issueType}/${ticket.priority}`,
        `${ticket.issueType}/${ticket.priority}`,
        input.reviewNote,
      );
    } else {
      if (issueTypeChanged) {
        await createHistory(
          tx,
          ticketId,
          actor.id,
          "AI_ISSUE_TYPE_OVERRIDDEN",
          ticket.issueType,
          input.issueType,
          input.reviewNote,
        );
      }

      if (priorityChanged) {
        await createHistory(
          tx,
          ticketId,
          actor.id,
          "AI_PRIORITY_OVERRIDDEN",
          ticket.priority,
          input.priority,
          input.reviewNote,
        );
      }
    }

    return updatedTicket;
  });
}

/**
 * Returns controlled enum metadata for supported ticket creation clients.
 *
 * @returns Available issue types and priorities from Prisma's canonical enums.
 */
export function getTicketMetadata(): {
  issueTypes: IssueType[];
  priorities: Priority[];
} {
  return {
    issueTypes: Object.values(IssueType),
    priorities: Object.values(Priority),
  };
}
