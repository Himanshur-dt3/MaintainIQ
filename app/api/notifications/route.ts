import { NextResponse } from "next/server";

import { requireUser } from "@/src/server/auth/guards";
import { toApiErrorResponse } from "@/src/server/http/api-errors";
import prisma from "@/src/server/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser();

    const actor = {
      id: session.user.id,
      role: session.user.role,
    };

    const where =
      actor.role === "ADMIN"
        ? {}
        : actor.role === "TECHNICIAN"
          ? { technicianId: actor.id }
          : { reporterId: actor.id };

    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        reporterId: true,
        technicianId: true,
        history: {
          orderBy: {
            createdAt: "desc",
          },
          take: 30,
          select: {
            id: true,
            action: true,
            previousValue: true,
            newValue: true,
            note: true,
            createdAt: true,
            actor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const notifications = tickets
      .flatMap((ticket) =>
        ticket.history.map((entry) => ({
          id: entry.id,
          ticketId: ticket.id,
          ticketTitle: ticket.title,
          action: entry.action,
          previousValue: entry.previousValue,
          newValue: entry.newValue,
          note: entry.note,
          actorName: entry.actor?.name ?? "System",
          createdAt: entry.createdAt,
        })),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )
      .slice(0, 30);

    return NextResponse.json({ notifications });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}


