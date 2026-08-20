import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/server/auth/guards";
import { toApiErrorResponse } from "@/src/server/http/api-errors";
import {
  addTicketWorkNote,
  assignTicket,
  reviewTicket,
  resolveTicket,
  startTicketWork,
} from "@/src/server/services/tickets";
import {
  addWorkNoteSchema,
  assignTicketSchema,
  reviewTicketSchema,
  resolveTicketSchema,
  ticketIdSchema,
} from "@/src/lib/validation/tickets";

const actionSchema = z.enum(["assign", "review", "start", "note", "resolve"]);

type TicketActionRouteContext = {
  params: { ticketId: string; action: string };
};

/**
 * Executes one authorized ticket workflow action with a server-derived actor.
 *
 * @param request - Optional JSON action payload, validated according to the requested action.
 * @param context - Dynamic ticket ID and action route parameters.
 * @returns The updated ticket or history item, or a controlled domain error.
 */
export async function POST(
  request: Request,
  context: TicketActionRouteContext,
) {
  try {
    const session = await requireUser();
    const actor = { id: session.user.id, role: session.user.role };
    const ticketId = ticketIdSchema.parse(context.params.ticketId);
    const action = actionSchema.parse(context.params.action);
    const payload = await request.json().catch(() => ({}));

    switch (action) {
      case "assign": {
        const ticket = await assignTicket(
          actor,
          ticketId,
          assignTicketSchema.parse(payload),
        );
        return NextResponse.json({ ticket });
      }
      case "review": {
        const ticket = await reviewTicket(
          actor,
          ticketId,
          reviewTicketSchema.parse(payload),
        );
        return NextResponse.json({ ticket });
      }
      case "start": {
        const ticket = await startTicketWork(actor, ticketId);
        return NextResponse.json({ ticket });
      }
      case "note": {
        const history = await addTicketWorkNote(
          actor,
          ticketId,
          addWorkNoteSchema.parse(payload),
        );
        return NextResponse.json({ history }, { status: 201 });
      }
      case "resolve": {
        const ticket = await resolveTicket(
          actor,
          ticketId,
          resolveTicketSchema.parse(payload),
        );
        return NextResponse.json({ ticket });
      }
    }
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
