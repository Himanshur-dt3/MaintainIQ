import { NextResponse } from "next/server";

import {
  adminTicketFiltersSchema,
  ticketIntakeSchema,
} from "@/src/lib/validation/tickets";
import { requireUser } from "@/src/server/auth/guards";
import { toApiErrorResponse } from "@/src/server/http/api-errors";
import {
  createTicketFromTriage,
  getAdminDashboardMetrics,
  getTicketMetadata,
  listAdminTickets,
  listTicketsForActor,
  listTechniciansForAdmin,
} from "@/src/server/services/tickets";

/**
 * Lists tickets scoped to the authenticated user's persisted role.
 *
 * @returns Role-filtered ticket records or a controlled authorization error.
 */
export async function GET(request: Request) {
  try {
    const session = await requireUser();
    const actor = {
      id: session.user.id,
      role: session.user.role,
    };
    const tickets =
      actor.role === "ADMIN"
        ? await listAdminTickets(
            actor,
            adminTicketFiltersSchema.parse({
              status: new URL(request.url).searchParams.get("status") || undefined,
              priority:
                new URL(request.url).searchParams.get("priority") || undefined,
              issueType:
                new URL(request.url).searchParams.get("issueType") || undefined,
              technicianId:
                new URL(request.url).searchParams.get("technicianId") || undefined,
            }),
          )
        : await listTicketsForActor(actor);

    return NextResponse.json({ tickets });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

/**
 * Creates a reporter-owned ticket from intake facts after server-side Claude
 * triage and context-relevant asset resolution.
 *
 * @param request - Request body containing title, description, and location.
 * @returns A persisted ticket, validated AI analysis, and asset creation state.
 */
export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const intake = ticketIntakeSchema.parse(await request.json());
    const result = await createTicketFromTriage(
      { id: session.user.id, role: session.user.role },
      intake,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

/**
 * Provides canonical controlled values for ticket intake forms.
 *
 * @returns Ticket issue type and priority enum values.
 */
export async function OPTIONS() {
  try {
    const session = await requireUser();
    const actor = { id: session.user.id, role: session.user.role };

    if (actor.role !== "ADMIN") {
      return NextResponse.json(getTicketMetadata());
    }

    const [technicians, metrics] = await Promise.all([
      listTechniciansForAdmin(actor),
      getAdminDashboardMetrics(actor),
    ]);

    return NextResponse.json({
      ...getTicketMetadata(),
      technicians,
      metrics,
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
