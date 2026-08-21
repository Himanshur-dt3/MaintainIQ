import { Role, TicketStatus } from "@prisma/client";

import prisma from "@/src/server/db/prisma";
import { AuthorizationError } from "@/src/server/auth/guards";

export async function listReporterReviews(reporterId: string) {
  return prisma.review.findMany({
    where: { reporterId },
    include: {
      ticket: {
        select: {
          id: true,
          title: true,
          status: true,
          location: true,
        },
      },
      technician: {
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listTechnicianReviews(technicianId: string) {
  return prisma.review.findMany({
    where: { technicianId },
    include: {
      ticket: {
        select: {
          id: true,
          title: true,
          location: true,
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAllReviews() {
  return prisma.review.findMany({
    include: {
      ticket: {
        select: {
          id: true,
          title: true,
          location: true,
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      technician: {
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createReporterReview(
  reporterId: string,
  ticketId: string,
  rating: number,
  comment?: string,
) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      reporterId: true,
      technicianId: true,
      status: true,
      technician: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  if (ticket.reporterId !== reporterId) {
    throw new AuthorizationError(
      "You may only review tickets that you reported.",
    );
  }

  if (ticket.status !== TicketStatus.RESOLVED) {
    throw new Error("Only resolved tickets can be reviewed.");
  }

  if (!ticket.technicianId || !ticket.technician) {
    throw new Error("This ticket has no technician to review.");
  }

  if (ticket.technician.role !== Role.TECHNICIAN) {
    throw new Error("The assigned user is not a technician.");
  }

  const existing = await prisma.review.findUnique({
    where: { ticketId },
  });

  if (existing) {
    throw new Error("This ticket has already been reviewed.");
  }

  return prisma.review.create({
    data: {
      ticketId,
      reporterId,
      technicianId: ticket.technicianId,
      rating,
      comment: comment?.trim() || null,
    },
    include: {
      ticket: {
        select: {
          id: true,
          title: true,
        },
      },
      technician: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

