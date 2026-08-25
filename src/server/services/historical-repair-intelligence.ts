import {
  IssueType,
  Priority,
  TicketStatus,
} from "@prisma/client";

import prisma from "@/src/server/db/prisma";

export type HistoricalRepairMatch = {
  ticketId: string;
  assetName: string;
  assetType: string;
  location: string;
  issueType: IssueType;
  priority: Priority;
  resolvedAt: Date | null;
  resolutionNotes: string;
  relevanceScore: number;
};

function getRelevanceScore(
  current: {
    assetId: string;
    assetType: string;
    location: string;
    issueType: IssueType;
  },
  historical: {
    assetId: string;
    asset: {
      type: string;
      location: string;
    };
    issueType: IssueType;
  },
): number {
  const sameAsset = historical.assetId === current.assetId;
  const sameIssue = historical.issueType === current.issueType;
  const sameAssetType =
    historical.asset.type.toLowerCase() ===
    current.assetType.toLowerCase();
  const sameLocation =
    historical.asset.location.toLowerCase() ===
    current.location.toLowerCase();

  if (sameAsset && sameIssue) return 100;
  if (sameAsset) return 75;
  if (sameAssetType && sameIssue) return 60;
  if (sameLocation && sameIssue) return 45;
  if (sameAssetType) return 35;

  return 0;
}

export async function findHistoricalRepairMatches(
  ticketId: string,
): Promise<HistoricalRepairMatch[]> {
  const currentTicket = await prisma.ticket.findUnique({
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

  if (!currentTicket) {
    return [];
  }

  const historicalTickets = await prisma.ticket.findMany({
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

  return historicalTickets
    .map((ticket) => {
      const resolutionNotes = ticket.resolutionNotes?.trim() ?? "";

      if (!resolutionNotes) {
        return null;
      }

      const relevanceScore = getRelevanceScore(
        {
          assetId: currentTicket.assetId,
          assetType: currentTicket.asset.type,
          location: currentTicket.location,
          issueType: currentTicket.issueType,
        },
        ticket,
      );

      if (relevanceScore === 0) {
        return null;
      }

      return {
        ticketId: ticket.id,
        assetName: ticket.asset.name,
        assetType: ticket.asset.type,
        location: ticket.asset.location,
        issueType: ticket.issueType,
        priority: ticket.priority,
        resolvedAt: ticket.resolvedAt,
        resolutionNotes,
        relevanceScore,
      };
    })
    .filter(
      (match): match is HistoricalRepairMatch => match !== null,
    )
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      const aTime = a.resolvedAt?.getTime() ?? 0;
      const bTime = b.resolvedAt?.getTime() ?? 0;

      return bTime - aTime;
    })
    .slice(0, 5);
}