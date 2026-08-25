import { describe, expect, it } from "vitest";

import {
  predictSlaBreach,
  optimizeMaintenanceInterval,
  recommendRepairVsReplace,
} from "@/src/server/services/ai-assistant";

describe("final maintenance intelligence", () => {
  it("predicts high SLA breach risk when workload and resolution time are high", () => {
    const result = predictSlaBreach({
      priority: "HIGH",
      elapsedHours: 6,
      estimatedResolutionHours: 5,
      technicianOpenTickets: 4,
      technicianAverageResolutionHours: 10,
    });

    expect(result.breachProbabilityPercent).toBeGreaterThanOrEqual(70);
    expect(result.riskLevel).toBe("HIGH");
    expect(result.recommendation).toContain("Prioritize");
  });

  it("keeps low-risk SLA tickets low when enough SLA time remains", () => {
    const result = predictSlaBreach({
      priority: "MEDIUM",
      elapsedHours: 2,
      estimatedResolutionHours: 3,
      technicianOpenTickets: 0,
      technicianAverageResolutionHours: 4,
    });

    expect(result.riskLevel).toBe("LOW");
    expect(result.remainingSlaHours).toBe(22);
  });

  it("recommends more frequent maintenance for recurring failures", () => {
    const result = optimizeMaintenanceInterval({
      totalResolvedRepairs: 6,
      recurringIssueCount: 4,
      recurrenceRate: 67,
      overdueMaintenancePlans: 0,
      currentIntervalDays: 30,
    });

    expect(result.action).toBe("INCREASE_FREQUENCY");
    expect(result.recommendedIntervalDays).toBe(21);
  });

  it("does not fabricate interval optimization without sufficient data", () => {
    const result = optimizeMaintenanceInterval({
      totalResolvedRepairs: 0,
      recurringIssueCount: 0,
      recurrenceRate: 0,
      overdueMaintenancePlans: 0,
      currentIntervalDays: 30,
    });

    expect(result.action).toBe("INSUFFICIENT_DATA");
  });

  it("recommends replacement when long-term maintenance exceeds replacement cost", () => {
    const result = recommendRepairVsReplace({
      ageYears: 9,
      failureCount: 6,
      annualMaintenanceCost: 3000,
      annualDowntimeHours: 50,
      replacementCost: 7000,
      criticality: "HIGH",
    });

    expect(result.recommendation).toBe("REPLACE");
    expect(result.estimatedThreeYearMaintenanceCost).toBe(9000);
  });

  it("does not invent replacement economics when replacement cost is unknown", () => {
    const result = recommendRepairVsReplace({
      ageYears: 9,
      failureCount: 6,
      annualMaintenanceCost: 3000,
      annualDowntimeHours: 50,
      replacementCost: null,
      criticality: "HIGH",
    });

    expect(result.recommendation).toBe("REVIEW");
    expect(result.confidence).toBe("LOW");
  });
});