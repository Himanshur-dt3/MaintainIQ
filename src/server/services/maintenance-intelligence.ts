import { Priority, TicketStatus } from "@prisma/client";

import prisma from "@/src/server/db/prisma";

export type MaintenanceRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type MaintenanceTrend =
  | "NO_HISTORY"
  | "NEW_ACTIVITY"
  | "IMPROVING"
  | "STABLE"
  | "WORSENING";

export type MaintenanceDataConfidence =
  | "INSUFFICIENT"
  | "LIMITED"
  | "GOOD";

export type AssetMaintenanceInsight = {
  assetId: string;
  assetName: string;
  assetType: string;
  location: string;

  healthScore: number;
  riskLevel: MaintenanceRiskLevel;

  totalTickets: number;
  recentTickets: number;
  previousPeriodTickets: number;
  openTickets: number;

  criticalTickets: number;
  highPriorityTickets: number;

  dominantIssueType: string | null;

  trend: MaintenanceTrend;

  dataConfidence: MaintenanceDataConfidence;

  priorityScore: number;

  recommendation: string;
};

function getRiskLevel(score: number): MaintenanceRiskLevel {
  if (score <= 25) return "CRITICAL";
  if (score <= 50) return "HIGH";
  if (score <= 70) return "MEDIUM";
  return "LOW";
}

function getTrend(
  totalTickets: number,
  recentTickets: number,
  previousPeriodTickets: number,
): MaintenanceTrend {
  if (totalTickets === 0) {
    return "NO_HISTORY";
  }

  if (previousPeriodTickets === 0 && recentTickets > 0) {
    return "NEW_ACTIVITY";
  }

  if (recentTickets > previousPeriodTickets) {
    return "WORSENING";
  }

  if (recentTickets < previousPeriodTickets) {
    return "IMPROVING";
  }

  return "STABLE";
}

function getRecommendation(
  riskLevel: MaintenanceRiskLevel,
  trend: AssetMaintenanceInsight["trend"],
  openTickets: number,
  dominantIssueType: string | null,
): string {
  const issue = dominantIssueType
    ? dominantIssueType.toLowerCase().replaceAll("_", " ")
    : "maintenance";

  if (riskLevel === "CRITICAL") {
    return `Immediate maintenance attention required. ${issue} issues and current workload indicate a significant reliability concern.`;
  }

  if (riskLevel === "HIGH") {
    if (trend === "WORSENING") {
      return `Schedule preventive inspection within 7 days, with particular attention to the worsening ${issue} pattern.`;
    }

    if (trend === "NEW_ACTIVITY") {
      return `Schedule a diagnostic inspection within 7 days, with attention to the reported ${issue} issue. More maintenance history is required to establish recurrence.`;
    }

    return `Schedule preventive inspection within 7 days and review the asset for potential ${issue} maintenance concerns.`;
  }

  if (riskLevel === "MEDIUM") {
    if (trend === "WORSENING") {
      return `Maintenance activity is increasing. Investigate the recurring ${issue} pattern and consider preventive servicing.`;
    }

    if (openTickets > 0) {
      return `Monitor the active maintenance issue and schedule preventive inspection if the problem recurs.`;
    }

    return `Monitor this asset and consider preventive maintenance during the next service window.`;
  }

  if (trend === "WORSENING") {
    return `Recent maintenance activity is increasing. Continue monitoring and investigate if the trend persists.`;
  }

  return "No immediate intervention is indicated from the available maintenance history.";
}

export async function getAssetMaintenanceInsights(): Promise<
  AssetMaintenanceInsight[]
> {
  const assets = await prisma.asset.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
      tickets: {
        select: {
          issueType: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;

  return assets
    .map((asset) => {
      const totalTickets = asset.tickets.length;

      const recentTickets = asset.tickets.filter((ticket) => {
        const age = now - new Date(ticket.createdAt).getTime();
        return age <= thirtyDaysMs;
      }).length;

      const previousPeriodTickets = asset.tickets.filter((ticket) => {
        const age = now - new Date(ticket.createdAt).getTime();
        return age > thirtyDaysMs && age <= sixtyDaysMs;
      }).length;

      const openTickets = asset.tickets.filter(
        (ticket) => ticket.status !== TicketStatus.RESOLVED,
      ).length;

      const criticalTickets = asset.tickets.filter(
        (ticket) => ticket.priority === Priority.CRITICAL,
      ).length;

      const highPriorityTickets = asset.tickets.filter(
        (ticket) => ticket.priority === Priority.HIGH,
      ).length;

      const issueCounts = new Map<string, number>();

      for (const ticket of asset.tickets) {
        issueCounts.set(
          ticket.issueType,
          (issueCounts.get(ticket.issueType) ?? 0) + 1,
        );
      }

      const dominantIssueType =
        [...issueCounts.entries()].sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] ?? null;

      const trend = getTrend(
        totalTickets,
        recentTickets,
        previousPeriodTickets,
      );

      /*
       * Maintenance risk model.
       *
       * The score combines:
       * - unresolved work
       * - ticket priority
       * - recent failures
       * - historical failures
       * - worsening failure trend
       *
       * Health is intentionally bounded to 0–100.
       */
      let riskPoints = 0;

      // Current operational condition.
      riskPoints += Math.min(openTickets * 18, 36);

      // Severity of active maintenance work.
      riskPoints += Math.min(criticalTickets * 25, 35);
      riskPoints += Math.min(highPriorityTickets * 12, 24);

      // Recent failures are more important than old failures.
      riskPoints += Math.min(recentTickets * 9, 27);

      // Historical recurrence.
      riskPoints += Math.min(totalTickets * 3, 18);

      // Increasing failure activity is an additional warning signal.
      if (trend === "WORSENING") {
        riskPoints += 15;
      }

      // A meaningful improvement reduces risk slightly.
      if (
        trend === "IMPROVING" &&
        openTickets === 0
      ) {
        riskPoints -= 8;
      }

      const boundedRisk = Math.max(
        0,
        Math.min(100, riskPoints),
      );

      const healthScore = Math.max(
        0,
        100 - boundedRisk,
      );

      const riskLevel = getRiskLevel(healthScore);

      /*
       * Data confidence is intentionally separate from health.
       *
       * No history does not mean the asset is healthy.
       * It means the system has insufficient evidence to assess it.
       */
      const dataConfidence: MaintenanceDataConfidence =
        totalTickets === 0
          ? "INSUFFICIENT"
          : totalTickets >= 3 || recentTickets >= 2
            ? "GOOD"
            : "LIMITED";

      /*
       * Maintenance Priority Score
       *
       * Higher score = greater operational urgency.
       *
       * Signals:
       * - risk severity
       * - health deterioration
       * - open workload
       * - critical/high-priority tickets
       * - recent maintenance activity
       *
       * Insufficient history is deliberately not treated as high risk.
       */
      const riskWeight =
        riskLevel === "CRITICAL"
          ? 40
          : riskLevel === "HIGH"
            ? 30
            : riskLevel === "MEDIUM"
              ? 18
              : 5;

      const healthPenalty = Math.max(0, 100 - healthScore) * 0.25;

      const workloadWeight = Math.min(openTickets * 8, 16);

      const severityWeight =
        criticalTickets * 15 +
        highPriorityTickets * 8;

      const activityWeight =
        trend === "WORSENING"
          ? 12
          : trend === "NEW_ACTIVITY"
            ? 6
            : 0;

      const confidenceAdjustment =
        dataConfidence === "INSUFFICIENT"
          ? -8
          : dataConfidence === "LIMITED"
            ? 0
            : 3;

      const priorityScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            riskWeight +
              healthPenalty +
              workloadWeight +
              severityWeight +
              activityWeight +
              confidenceAdjustment,
          ),
        ),
      );

      return {
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.type,
        location: asset.location,

        healthScore,
        riskLevel,

        totalTickets,
        recentTickets,
        previousPeriodTickets,
        openTickets,

        criticalTickets,
        highPriorityTickets,

        dominantIssueType,

        trend,

        dataConfidence,

        priorityScore,

        recommendation: getRecommendation(
          riskLevel,
          trend,
          openTickets,
          dominantIssueType,
        ),
      };
    })
    .sort(
      (a, b) => a.healthScore - b.healthScore,
    );
}

