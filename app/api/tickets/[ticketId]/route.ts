import { NextResponse } from "next/server";

import { requireUser } from "@/src/server/auth/guards";
import { toApiErrorResponse } from "@/src/server/http/api-errors";
import { getTicketForActor } from "@/src/server/services/tickets";
import { ticketIdSchema } from "@/src/lib/validation/tickets";

type TicketRouteContext = {
  params: { ticketId: string };
};

/**
 * Retrieves a ticket and audit timeline only when the authenticated user owns,
 * is assigned to, or administers that ticket.
 *
 * @param _request - Unused request object supplied by Next.js.
 * @param context - Dynamic ticket ID route parameters.
 * @returns The authorized ticket detail and chronological history.
 */
export async function GET(
  _request: Request,
  context: TicketRouteContext,
) {
  try {
    const session = await requireUser();
    const ticketId = ticketIdSchema.parse(context.params.ticketId);
    const ticket = await getTicketForActor(
      { id: session.user.id, role: session.user.role },
      ticketId,
    );

    return NextResponse.json({ ticket });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
