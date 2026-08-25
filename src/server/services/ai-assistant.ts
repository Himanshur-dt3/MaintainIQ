import { IssueType, Priority } from "@prisma/client";

export type DiagnosticGuide = {
  requiredTools: string[];
  safetyWarnings: string[];
  diagnosticSteps: string[];
  estimatedTimeMinutes: number;
};

export type TechnicianRecommendation = {
  technicianId: string;
  technicianName: string;
  rationale: string;
  matchScore: number;
};

export type AssetHealthInsight = {
  healthScore: number; // 0 to 100
  riskLevel: "HEALTHY" | "MODERATE" | "HIGH_RISK";
  failureRiskPercent: number; // 0 to 100
  predictedFailureWindowDays: number | null;
  preventativeRecommendation: string;
  totalTicketCount: number;
};

const defaultToolsByIssue: Record<IssueType, string[]> = {
  PLUMBING: ["Pipe Wrench", "Teflon Tape", "Bucket & Towels", "Pipe Cutter / Sealant"],
  ELECTRICAL: ["Multimeter", "Insulated Screwdrivers", "Voltage Tester", "Wire Strippers"],
  HVAC: ["Pressure Gauge", "Thermometer", "Fin Comb", "Refrigerant Leak Detector"],
  INTERNET_IT: ["Network Cable Tester", "Crimping Tool", "Spare Patch Cables", "Router Reset Pin"],
  APPLIANCE: ["Socket Wrench Set", "Nut Driver", "Multimeter", "Replacement Gaskets/Belts"],
  STRUCTURAL_GENERAL: ["Measuring Tape", "Hammer & Nails", "Safety Goggles", "Utility Knife"],
};

const defaultSafetyWarningsByIssue: Record<IssueType, string[]> = {
  PLUMBING: ["Turn off main water shut-off valve before loosening supply lines."],
  ELECTRICAL: ["De-energize main circuit breaker and verify zero voltage before touching wires."],
  HVAC: ["Beware of hot compressor surfaces and high-voltage capacitors."],
  INTERNET_IT: ["Keep cables organized to avoid trip hazards near server racks."],
  APPLIANCE: ["Unplug unit from electrical outlet and turn off gas supply if applicable."],
  STRUCTURAL_GENERAL: ["Wear protective eyewear and heavy-duty work gloves."],
};

/**
 * Generates actionable diagnostic guidance, required tools, and safety protocols
 * for technicians working an assigned ticket.
 *
 * @param issueType - Ticket issue classification.
 * @param title - Ticket title / symptom description.
 * @param location - Ticket location.
 * @returns Structured diagnostic guidance with tool checklist and safety instructions.
 */
export function generateTechnicianDiagnosticGuide(
  issueType: IssueType,
  title: string,
  location: string,
): DiagnosticGuide {
  const tools = defaultToolsByIssue[issueType] || defaultToolsByIssue.STRUCTURAL_GENERAL;
  const warnings = defaultSafetyWarningsByIssue[issueType] || defaultSafetyWarningsByIssue.STRUCTURAL_GENERAL;

  const steps = [
    `Inspect the immediate area at ${location} for visible damage or leakage related to "${title}".`,
    `Perform primary isolation/safety check (confirm power or fluid controls are secured).`,
    `Use diagnostic tools to test component function and identify root cause.`,
    `Replace damaged components or seal connections as required.`,
    `Perform operational verification run and clean up the workspace area.`,
  ];

  let estimatedTimeMinutes = 45;
  if (issueType === "HVAC" || issueType === "ELECTRICAL") estimatedTimeMinutes = 60;
  if (issueType === "PLUMBING" || issueType === "APPLIANCE") estimatedTimeMinutes = 50;

  return {
    requiredTools: tools,
    safetyWarnings: warnings,
    diagnosticSteps: steps,
    estimatedTimeMinutes,
  };
}

/**
 * Calculates optimal technician dispatch match using workload & specialization scores.
 *
 * @param issueType - Ticket issue classification.
 * @param priority - Ticket urgency priority.
 * @param technicians - Array of active technician candidates with assigned ticket counts.
 * @returns Best technician candidate recommendation with explanation.
 */
export function recommendTechnicianDispatch(
  issueType: IssueType,
  priority: Priority,
  technicians: Array<{
    id: string;
    name: string;
    jobTitle: string | null;
    _count: { assignedTickets: number };
  }>,
): TechnicianRecommendation | null {
  if (!technicians || technicians.length === 0) {
    return null;
  }

  const priorityWeight =
    priority === Priority.CRITICAL
      ? 1.15
      : priority === Priority.HIGH
        ? 1.08
        : priority === Priority.MEDIUM
          ? 1
          : 0.95;

  const issueLower = issueType.toLowerCase().replaceAll("_", " ");

  const maxOpenTickets = Math.max(
    1,
    ...technicians.map((tech) =>
      Math.max(0, tech._count.assignedTickets),
    ),
  );

  const scored = technicians.map((tech) => {
    const openCount = Math.max(0, tech._count.assignedTickets);
    const titleLower = (tech.jobTitle ?? "").toLowerCase();

    const titleMatchesIssue =
      titleLower.length > 0 &&
      (titleLower.includes(issueLower) ||
        issueLower.includes(titleLower));

    const capacityScore =
      100 - (openCount / maxOpenTickets) * 100;

    const specializationScore = titleMatchesIssue ? 100 : 50;

    let score =
      capacityScore * 0.7 +
      specializationScore * 0.3;

    score *= priorityWeight;

    score = Math.max(10, Math.min(99, score));

    return {
      technicianId: tech.id,
      technicianName: tech.name,
      openCount,
      jobTitle: tech.jobTitle,
      titleMatchesIssue,
      score,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (a.openCount !== b.openCount) {
      return a.openCount - b.openCount;
    }

    return a.technicianName.localeCompare(b.technicianName);
  });

  const best = scored[0];

  const priorityLabel = priority.toLowerCase();

  let rationale =
    `${best.openCount} open ticket${
      best.openCount === 1 ? "" : "s"
    } and strongest available capacity for this ` +
    `${priorityLabel}-priority request`;

  if (best.titleMatchesIssue && best.jobTitle) {
    rationale += ` · role matches ${issueLower}`;
  } else if (best.jobTitle) {
    rationale += ` · ${best.jobTitle}`;
  } else {
    rationale += " · no specialization metadata available";
  }

  return {
    technicianId: best.technicianId,
    technicianName: best.technicianName,
    rationale,
    matchScore: Math.round(best.score),
  };
}
/**
 * Calculates Asset Health Index & risk level based on historical ticket volume.
 *
 * @param ticketCount - Total number of tickets associated with the asset.
 * @returns Health score (0-100), risk status, and preventative maintenance action.
 */
export function calculateAssetHealthScore(ticketCount: number): AssetHealthInsight {
  const normalizedCount = Math.max(0, Math.floor(ticketCount));

  /*
   * Backward-compatible baseline estimator.
   *
   * This function intentionally remains deterministic and requires no
   * database access. Rich asset-level prediction can be layered on top
   * using the persisted ticket and maintenance signals.
   */
  if (normalizedCount === 0) {
    return {
      healthScore: 96,
      riskLevel: "HEALTHY",
      failureRiskPercent: 4,
      predictedFailureWindowDays: null,
      preventativeRecommendation:
        "No recorded failures. Continue scheduled preventive maintenance and routine inspection.",
      totalTicketCount: 0,
    };
  }

  if (normalizedCount === 1) {
    return {
      healthScore: 90,
      riskLevel: "HEALTHY",
      failureRiskPercent: 10,
      predictedFailureWindowDays: null,
      preventativeRecommendation:
        "Low historical failure activity. Continue scheduled preventive maintenance and monitor for recurrence.",
      totalTicketCount: normalizedCount,
    };
  }

  if (normalizedCount <= 3) {
    return {
      healthScore: 72,
      riskLevel: "MODERATE",
      failureRiskPercent: 35 + (normalizedCount - 2) * 10,
      predictedFailureWindowDays: 90,
      preventativeRecommendation:
        "Moderate maintenance activity detected. Review recurring issues and schedule preventive inspection within 30 days.",
      totalTicketCount: normalizedCount,
    };
  }

  const failureRiskPercent = Math.min(
    95,
    60 + (normalizedCount - 4) * 7,
  );

  return {
    healthScore: Math.max(
      25,
      42 - Math.max(0, normalizedCount - 4) * 3,
    ),
    riskLevel: "HIGH_RISK",
    failureRiskPercent,
    predictedFailureWindowDays: Math.max(
      14,
      60 - Math.max(0, normalizedCount - 4) * 7,
    ),
    preventativeRecommendation:
      "High failure frequency detected. Prioritize root-cause inspection and evaluate preventative overhaul or asset replacement.",
    totalTicketCount: normalizedCount,
  };
}

export type PredictiveAssetRiskInput = {
  totalTickets: number;
  openTickets: number;
  criticalTickets: number;
  highPriorityTickets: number;
  resolvedTickets: number;
  slaEligibleTickets: number;
  slaBreaches: number;
  recurringIssueCount: number;
  recurringIssueRate: number;
  averageResolutionHours: number | null;
  maintenancePlanCount: number;
  overdueMaintenancePlans: number;
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

export type PredictiveAssetRiskInsight = {
  healthScore: number;
  failureRiskPercent: number;
  riskLevel: "HEALTHY" | "MODERATE" | "HIGH_RISK";
  predictedFailureWindowDays: number | null;
  riskFactors: string[];
  preventativeRecommendation: string;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Deterministic predictive-maintenance risk engine.
 *
 * The score combines persisted operational signals rather than relying
 * solely on ticket volume. It is intentionally explainable and deterministic
 * so administrators can understand why an asset is considered risky.
 */
export function calculatePredictiveAssetRisk(
  input: PredictiveAssetRiskInput,
): PredictiveAssetRiskInsight {
  const totalTickets = Math.max(0, input.totalTickets);
  const openTickets = Math.max(0, input.openTickets);
  const criticalTickets = Math.max(0, input.criticalTickets);
  const highPriorityTickets = Math.max(0, input.highPriorityTickets);
  const resolvedTickets = Math.max(0, input.resolvedTickets);
  const slaEligibleTickets = Math.max(0, input.slaEligibleTickets);
  const slaBreaches = Math.max(0, input.slaBreaches);
  const recurringIssueCount = Math.max(0, input.recurringIssueCount);
  const recurringIssueRate = clampScore(input.recurringIssueRate);
  const maintenancePlanCount = Math.max(0, input.maintenancePlanCount);
  const overdueMaintenancePlans = Math.max(
    0,
    input.overdueMaintenancePlans,
  );

  const riskFactors: string[] = [];

  let risk = 0;

  // Historical incident frequency.
  risk += Math.min(20, totalTickets * 3);

  if (totalTickets >= 5) {
    riskFactors.push("High historical ticket frequency");
  } else if (totalTickets >= 3) {
    riskFactors.push("Repeated maintenance activity");
  }

  // Current unresolved pressure.
  risk += Math.min(15, openTickets * 5);

  if (openTickets >= 2) {
    riskFactors.push("Multiple unresolved tickets");
  }

  // Severity concentration.
  risk += Math.min(15, criticalTickets * 10);
  risk += Math.min(10, highPriorityTickets * 3);

  if (criticalTickets > 0) {
    riskFactors.push("Critical incidents recorded");
  } else if (highPriorityTickets >= 2) {
    riskFactors.push("Repeated high-priority incidents");
  }

  // Recurrence is a strong predictive signal.
  risk += Math.min(15, recurringIssueCount * 4);
  risk += recurringIssueRate * 0.1;

  if (recurringIssueCount >= 2) {
    riskFactors.push("Recurring issue pattern detected");
  }

  // SLA failures indicate operational instability.
  const slaBreachRate =
    slaEligibleTickets > 0
      ? slaBreaches / slaEligibleTickets
      : 0;

  risk += Math.min(10, slaBreachRate * 20);

  if (slaBreachRate >= 0.25) {
    riskFactors.push("Elevated SLA breach rate");
  }

  // Slow resolution indicates increasing maintenance burden.
  if (
    input.averageResolutionHours !== null &&
    input.averageResolutionHours > 48
  ) {
    risk += 8;
    riskFactors.push("Long average resolution time");
  } else if (
    input.averageResolutionHours !== null &&
    input.averageResolutionHours > 24
  ) {
    risk += 4;
  }

  // Maintenance coverage reduces risk; overdue plans increase it.
  if (maintenancePlanCount === 0 && totalTickets > 0) {
    risk += 8;
    riskFactors.push("No preventive maintenance plan configured");
  }

  if (overdueMaintenancePlans > 0) {
    risk += Math.min(12, overdueMaintenancePlans * 4);
    riskFactors.push("Preventive maintenance is overdue");
  }

  // Asset criticality changes the operational consequence of failure.
  const criticalityAdjustment: Record<
    PredictiveAssetRiskInput["criticality"],
    number
  > = {
    LOW: 0,
    MEDIUM: 3,
    HIGH: 7,
    CRITICAL: 12,
  };

  risk += criticalityAdjustment[input.criticality];

  if (input.criticality === "CRITICAL") {
    riskFactors.push("Criticality amplifies operational failure impact");
  } else if (input.criticality === "HIGH") {
    riskFactors.push("High asset criticality");
  }

  // Successful resolution history provides a small stabilizing signal.
  if (
    resolvedTickets >= 3 &&
    openTickets === 0 &&
    slaBreachRate < 0.15 &&
    recurringIssueRate < 50
  ) {
    risk -= 8;
  }

  const failureRiskPercent = Math.round(
    clampScore(risk),
  );

  const healthScore = Math.round(
    clampScore(100 - failureRiskPercent),
  );

  const riskLevel =
    failureRiskPercent >= 60
      ? "HIGH_RISK"
      : failureRiskPercent >= 30
        ? "MODERATE"
        : "HEALTHY";

  let predictedFailureWindowDays: number | null = null;

  if (riskLevel === "HIGH_RISK") {
    predictedFailureWindowDays = Math.max(
      14,
      Math.round(90 - failureRiskPercent),
    );
  } else if (riskLevel === "MODERATE") {
    predictedFailureWindowDays = Math.max(
      45,
      Math.round(150 - failureRiskPercent),
    );
  }

  let preventativeRecommendation =
    "Continue scheduled preventive maintenance and monitor the asset.";

  if (riskLevel === "MODERATE") {
    preventativeRecommendation =
      "Schedule a preventive inspection within 30 days and review recurring failure patterns.";
  }

  if (riskLevel === "HIGH_RISK") {
    preventativeRecommendation =
      "Prioritize root-cause inspection, overdue maintenance, and repair-versus-replacement review.";
  }

  if (riskFactors.length === 0) {
    riskFactors.push("No significant predictive risk signals detected");
  }

  return {
    healthScore,
    failureRiskPercent,
    riskLevel,
    predictedFailureWindowDays,
    riskFactors,
    preventativeRecommendation,
  };
}

export type PredictiveSlaBreachInput = {
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  elapsedHours: number;
  estimatedResolutionHours: number | null;
  technicianOpenTickets: number;
  technicianAverageResolutionHours: number | null;
};

export type PredictiveSlaBreachInsight = {
  breachProbabilityPercent: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  estimatedResolutionHours: number | null;
  remainingSlaHours: number;
  reasons: string[];
  recommendation: string;
};

/**
 * Explainable SLA-breach prediction.
 *
 * Uses only operational signals already available in MaintainIQ.
 * This is intentionally deterministic rather than pretending to be
 * a statistically trained model when no training dataset exists.
 */
export function predictSlaBreach(
  input: PredictiveSlaBreachInput,
): PredictiveSlaBreachInsight {
  const targetHours: Record<PredictiveSlaBreachInput["priority"], number> = {
    CRITICAL: 4,
    HIGH: 8,
    MEDIUM: 24,
    LOW: 72,
  };

  const elapsedHours = Math.max(0, input.elapsedHours);
  const remainingSlaHours = Math.max(
    0,
    targetHours[input.priority] - elapsedHours,
  );

  const estimatedResolutionHours =
    input.estimatedResolutionHours !== null
      ? Math.max(0, input.estimatedResolutionHours)
      : input.technicianAverageResolutionHours !== null
        ? Math.max(0, input.technicianAverageResolutionHours)
        : null;

  let probability = 10;
  const reasons: string[] = [];

  if (estimatedResolutionHours !== null) {
    if (estimatedResolutionHours > remainingSlaHours) {
      probability += 45;
      reasons.push("Estimated resolution time exceeds remaining SLA time");
    } else if (estimatedResolutionHours > remainingSlaHours * 0.75) {
      probability += 25;
      reasons.push("Estimated resolution time is close to the SLA limit");
    }
  } else {
    probability += 10;
    reasons.push("Insufficient historical resolution-time data");
  }

  if (input.technicianOpenTickets >= 4) {
    probability += 25;
    reasons.push("Technician has a high active workload");
  } else if (input.technicianOpenTickets >= 2) {
    probability += 12;
    reasons.push("Technician has multiple active tickets");
  }

  if (
    input.technicianAverageResolutionHours !== null &&
    input.technicianAverageResolutionHours > targetHours[input.priority]
  ) {
    probability += 15;
    reasons.push("Technician historical resolution time exceeds this SLA target");
  }

  if (input.priority === "CRITICAL") {
    probability += 10;
    reasons.push("Critical priority has a very short SLA window");
  }

  probability = Math.max(0, Math.min(99, Math.round(probability)));

  const riskLevel =
    probability >= 70 ? "HIGH" : probability >= 40 ? "MEDIUM" : "LOW";

  let recommendation =
    "Continue monitoring the ticket and maintain the current assignment.";

  if (riskLevel === "MEDIUM") {
    recommendation =
      "Review technician workload and consider prioritizing this ticket before the SLA window narrows.";
  }

  if (riskLevel === "HIGH") {
    recommendation =
      "Prioritize this ticket immediately and consider reassignment or escalation to reduce SLA-breach risk.";
  }

  if (reasons.length === 0) {
    reasons.push("No significant SLA-breach signals detected");
  }

  return {
    breachProbabilityPercent: probability,
    riskLevel,
    estimatedResolutionHours,
    remainingSlaHours,
    reasons,
    recommendation,
  };
}

export type MaintenanceIntervalOptimizationInput = {
  totalResolvedRepairs: number;
  recurringIssueCount: number;
  recurrenceRate: number;
  overdueMaintenancePlans: number;
  currentIntervalDays: number | null;
};

export type MaintenanceIntervalOptimizationInsight = {
  action: "INCREASE_FREQUENCY" | "MAINTAIN" | "DECREASE_FREQUENCY" | "INSUFFICIENT_DATA";
  recommendedIntervalDays: number | null;
  rationale: string;
};

/**
 * Recommends preventive-maintenance cadence from observed repair recurrence.
 */
export function optimizeMaintenanceInterval(
  input: MaintenanceIntervalOptimizationInput,
): MaintenanceIntervalOptimizationInsight {
  const repairs = Math.max(0, input.totalResolvedRepairs);
  const recurrenceRate = Math.max(
    0,
    Math.min(100, input.recurrenceRate),
  );
  const overdue = Math.max(0, input.overdueMaintenancePlans);

  if (repairs === 0 || input.currentIntervalDays === null) {
    return {
      action: "INSUFFICIENT_DATA",
      recommendedIntervalDays: input.currentIntervalDays,
      rationale:
        "Insufficient repair history or maintenance-interval data to safely optimize the preventive schedule.",
    };
  }

  let factor = 1;

  if (recurrenceRate >= 60 || input.recurringIssueCount >= 4) {
    factor = 0.7;
  } else if (recurrenceRate >= 40 || input.recurringIssueCount >= 2) {
    factor = 0.85;
  } else if (recurrenceRate <= 20 && overdue === 0 && repairs >= 5) {
    factor = 1.15;
  }

  if (overdue > 0) {
    factor = Math.min(factor, 0.85);
  }

  const recommendedIntervalDays = Math.max(
    7,
    Math.round(input.currentIntervalDays * factor),
  );

  if (factor < 1) {
    return {
      action: "INCREASE_FREQUENCY",
      recommendedIntervalDays,
      rationale:
        "Recurring repair activity indicates that the current preventive-maintenance interval may be too long.",
    };
  }

  if (factor > 1) {
    return {
      action: "DECREASE_FREQUENCY",
      recommendedIntervalDays,
      rationale:
        "Repair history is stable with low recurrence and no overdue maintenance, so the interval can be cautiously extended.",
    };
  }

  return {
    action: "MAINTAIN",
    recommendedIntervalDays,
    rationale:
      "Current repair recurrence does not provide sufficient evidence to change the preventive-maintenance cadence.",
  };
}

export type RepairReplaceRecommendationInput = {
  ageYears: number;
  failureCount: number;
  annualMaintenanceCost: number;
  annualDowntimeHours: number;
  replacementCost: number | null;
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

export type RepairReplaceRecommendationInsight = {
  recommendation: "REPAIR" | "REVIEW" | "REPLACE";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  estimatedThreeYearMaintenanceCost: number;
  estimatedThreeYearImpactCost: number;
  rationale: string[];
};

/**
 * Business-oriented repair-vs-replace decision support.
 *
 * When replacement cost is unavailable, the engine deliberately returns
 * REVIEW instead of inventing a financial saving.
 */
export function recommendRepairVsReplace(
  input: RepairReplaceRecommendationInput,
): RepairReplaceRecommendationInsight {
  const ageYears = Math.max(0, input.ageYears);
  const failureCount = Math.max(0, input.failureCount);
  const annualMaintenanceCost = Math.max(0, input.annualMaintenanceCost);
  const annualDowntimeHours = Math.max(0, input.annualDowntimeHours);

  const threeYearMaintenanceCost = annualMaintenanceCost * 3;

  // Downtime is treated as an operational burden only when a monetary
  // replacement comparison is unavailable.
  const threeYearImpactCost =
    threeYearMaintenanceCost + annualDowntimeHours * 3;

  const rationale: string[] = [];

  if (failureCount >= 5) {
    rationale.push("High historical failure frequency");
  } else if (failureCount >= 3) {
    rationale.push("Repeated asset failures");
  }

  if (ageYears >= 8) {
    rationale.push("Asset is in an advanced lifecycle stage");
  } else if (ageYears >= 5) {
    rationale.push("Asset has accumulated significant operating age");
  }

  if (annualDowntimeHours >= 40) {
    rationale.push("High annual downtime burden");
  }

  if (input.criticality === "CRITICAL") {
    rationale.push("Critical asset failure has high operational consequence");
  } else if (input.criticality === "HIGH") {
    rationale.push("High asset criticality increases replacement priority");
  }

  if (input.replacementCost === null) {
    return {
      recommendation:
        failureCount >= 5 || ageYears >= 8 ? "REVIEW" : "REPAIR",
      confidence: "LOW",
      estimatedThreeYearMaintenanceCost: threeYearMaintenanceCost,
      estimatedThreeYearImpactCost: threeYearImpactCost,
      rationale:
        rationale.length > 0
          ? [
              ...rationale,
              "Replacement cost is unavailable, so a financial replacement decision cannot be proven.",
            ]
          : [
              "No strong replacement signals detected.",
              "Replacement cost is unavailable.",
            ],
    };
  }

  const replacementCost = Math.max(0, input.replacementCost);

  if (threeYearMaintenanceCost > replacementCost) {
    rationale.push(
      "Projected three-year maintenance cost exceeds replacement cost",
    );
  }

  if (
    (failureCount >= 5 || ageYears >= 8) &&
    threeYearMaintenanceCost >= replacementCost * 0.75
  ) {
    return {
      recommendation: "REPLACE",
      confidence: "HIGH",
      estimatedThreeYearMaintenanceCost: threeYearMaintenanceCost,
      estimatedThreeYearImpactCost: threeYearImpactCost,
      rationale,
    };
  }

  if (
    failureCount >= 3 ||
    ageYears >= 5 ||
    annualDowntimeHours >= 40
  ) {
    return {
      recommendation: "REVIEW",
      confidence: "MEDIUM",
      estimatedThreeYearMaintenanceCost: threeYearMaintenanceCost,
      estimatedThreeYearImpactCost: threeYearImpactCost,
      rationale:
        rationale.length > 0
          ? rationale
          : ["Some lifecycle or maintenance burden signals are present."],
    };
  }

  return {
    recommendation: "REPAIR",
    confidence: "MEDIUM",
    estimatedThreeYearMaintenanceCost: threeYearMaintenanceCost,
    estimatedThreeYearImpactCost: threeYearImpactCost,
    rationale:
      rationale.length > 0
        ? rationale
        : ["Current maintenance burden does not justify replacement."],
  };
}