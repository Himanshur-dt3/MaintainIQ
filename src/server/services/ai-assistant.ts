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
  if (!technicians || technicians.length === 0) return null;

  // Score technicians based on open workload (fewer open tickets = higher score)
  // and title relevance (e.g., job title matching issue type)
  const scored = technicians.map((tech) => {
    let score = 100 - tech._count.assignedTickets * 15;
    const titleLower = (tech.jobTitle ?? "").toLowerCase();
    const issueLower = issueType.toLowerCase();

    if (titleLower.includes(issueLower) || issueLower.includes(titleLower)) {
      score += 20;
    }

    return {
      technicianId: tech.id,
      technicianName: tech.name,
      openCount: tech._count.assignedTickets,
      jobTitle: tech.jobTitle,
      score: Math.max(score, 10),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  let rationale = `Lowest active workload (${best.openCount} open tickets)`;
  if (best.jobTitle) {
    rationale += ` · ${best.jobTitle}`;
  }

  return {
    technicianId: best.technicianId,
    technicianName: best.technicianName,
    rationale,
    matchScore: Math.min(Math.round(best.score), 99),
  };
}

/**
 * Calculates Asset Health Index & risk level based on historical ticket volume.
 *
 * @param ticketCount - Total number of tickets associated with the asset.
 * @returns Health score (0-100), risk status, and preventative maintenance action.
 */
export function calculateAssetHealthScore(ticketCount: number): AssetHealthInsight {
  if (ticketCount <= 1) {
    return {
      healthScore: 94,
      riskLevel: "HEALTHY",
      preventativeRecommendation: "Asset is operating normally. Routine quarterly inspection advised.",
      totalTicketCount: ticketCount,
    };
  }

  if (ticketCount <= 3) {
    return {
      healthScore: 72,
      riskLevel: "MODERATE",
      preventativeRecommendation: "Moderate maintenance history. Schedule preventative calibration within 30 days.",
      totalTicketCount: ticketCount,
    };
  }

  return {
    healthScore: 42,
    riskLevel: "HIGH_RISK",
    preventativeRecommendation: "High failure frequency detected! Immediate preventative overhaul or asset replacement review recommended.",
    totalTicketCount: ticketCount,
  };
}
