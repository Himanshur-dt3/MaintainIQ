import Anthropic from "@anthropic-ai/sdk";

import { getAssetMaintenanceInsights } from "@/src/server/services/maintenance-intelligence";
import {
  listAdminTickets,
  listTechniciansForAdmin,
  type TicketActor,
} from "@/src/server/services/tickets";

const DEFAULT_MODEL = "claude-haiku-4-5";
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 60_000;

type EvidenceItem = {
  id: string;
  label: string;
  value: string;
};

export type MaintenanceCopilotResult = {
  answer: string;
  evidence: Array<{
    label: string;
    value: string;
  }>;
};

type ClaudeCopilotResponse = {
  answer: string;
  evidenceIds: string[];
};

function getTimeoutMs(): number {
  const configured = Number(process.env.ANTHROPIC_TIMEOUT_MS);

  if (
    !Number.isFinite(configured) ||
    configured <= 0 ||
    configured > MAX_TIMEOUT_MS
  ) {
    return DEFAULT_TIMEOUT_MS;
  }

  return configured;
}

function buildEvidenceCatalog(
  insights: Awaited<ReturnType<typeof getAssetMaintenanceInsights>>,
  tickets: Awaited<ReturnType<typeof listAdminTickets>>,
  technicians: Awaited<ReturnType<typeof listTechniciansForAdmin>>,
): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];

  evidence.push({
    id: "system.total_assets",
    label: "Tracked assets",
    value: String(insights.length),
  });

  evidence.push({
    id: "system.high_risk_assets",
    label: "High/Critical assets",
    value: String(
      insights.filter(
        (item) =>
          item.riskLevel === "HIGH" || item.riskLevel === "CRITICAL",
      ).length,
    ),
  });

  evidence.push({
    id: "system.new_activity",
    label: "Assets with new activity",
    value: String(
      insights.filter((item) => item.trend === "NEW_ACTIVITY").length,
    ),
  });

  evidence.push({
    id: "system.no_history",
    label: "Assets without maintenance history",
    value: String(
      insights.filter((item) => item.trend === "NO_HISTORY").length,
    ),
  });

  evidence.push({
    id: "system.open_tickets",
    label: "Open tickets",
    value: String(
      tickets.filter((ticket) => ticket.status !== "RESOLVED").length,
    ),
  });

  evidence.push({
    id: "system.resolved_tickets",
    label: "Resolved tickets",
    value: String(
      tickets.filter((ticket) => ticket.status === "RESOLVED").length,
    ),
  });

  for (const item of insights.slice(0, 10)) {
    const safeId = item.assetName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50);

    evidence.push({
      id: `asset.${safeId}.health`,
      label: `${item.assetName} health`,
      value: `${item.healthScore}/100`,
    });

    evidence.push({
      id: `asset.${safeId}.risk`,
      label: `${item.assetName} risk`,
      value: item.riskLevel,
    });

    evidence.push({
      id: `asset.${safeId}.open`,
      label: `${item.assetName} open tickets`,
      value: String(item.openTickets),
    });

    evidence.push({
      id: `asset.${safeId}.recent`,
      label: `${item.assetName} recent tickets`,
      value: String(item.recentTickets),
    });

    evidence.push({
      id: `asset.${safeId}.trend`,
      label: `${item.assetName} trend`,
      value: item.trend,
    });

    if (item.dominantIssueType) {
      evidence.push({
        id: `asset.${safeId}.issue`,
        label: `${item.assetName} issue type`,
        value: item.dominantIssueType,
      });
    }
  }

  for (const technician of technicians) {
    const safeId = technician.id;

    evidence.push({
      id: `technician.${safeId}.workload`,
      label: `${technician.name} open workload`,
      value: String(technician._count.assignedTickets),
    });
  }

  return evidence;
}

function resolveEvidence(
  evidenceIds: string[],
  catalog: EvidenceItem[],
): Array<{ label: string; value: string }> {
  const byId = new Map(catalog.map((item) => [item.id, item]));

  const resolved: Array<{ label: string; value: string }> = [];
  const seen = new Set<string>();

  for (const id of evidenceIds) {
    if (seen.has(id)) {
      continue;
    }

    const item = byId.get(id);

    if (!item) {
      continue;
    }

    seen.add(id);

    resolved.push({
      label: item.label,
      value: item.value,
    });

    if (resolved.length >= 5) {
      break;
    }
  }

  return resolved;
}

function fallbackAnswer(
  question: string,
  insights: Awaited<ReturnType<typeof getAssetMaintenanceInsights>>,
  tickets: Awaited<ReturnType<typeof listAdminTickets>>,
  technicians: Awaited<ReturnType<typeof listTechniciansForAdmin>>,
  catalog: EvidenceItem[],
): MaintenanceCopilotResult {
  const highRisk = insights.filter(
    (item) => item.riskLevel === "HIGH" || item.riskLevel === "CRITICAL",
  );


  const noHistory = insights.filter(
    (item) => item.trend === "NO_HISTORY",
  );

  const questionLower = question.toLowerCase();

  if (
    questionLower.includes("technician") ||
    questionLower.includes("workload") ||
    questionLower.includes("assigned")
  ) {
    const sorted = [...technicians].sort(
      (a, b) =>
        b._count.assignedTickets - a._count.assignedTickets,
    );

    const technician = sorted[0];

    if (!technician) {
      return {
        answer: "There are no technician workload records available.",
        evidence: [],
      };
    }

    return {
      answer: `${technician.name} currently has the highest recorded open workload with ${technician._count.assignedTickets} assigned ticket(s).`,
      evidence: resolveEvidence(
        [`technician.${technician.id}.workload`],
        catalog,
      ),
    };
  }

  if (
    questionLower.includes("attention") ||
    questionLower.includes("priority") ||
    questionLower.includes("first")
  ) {
    const item = highRisk[0] ?? insights[0];

    if (!item) {
      return {
        answer:
          "There is not enough maintenance data to identify a priority asset.",
        evidence: [],
      };
    }

    const safeId = item.assetName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50);

    return {
      answer: `${item.assetName} currently requires the most attention based on its ${item.riskLevel.toLowerCase()} risk level and health score of ${item.healthScore}/100.`,
      evidence: resolveEvidence(
        [
          `asset.${safeId}.health`,
          `asset.${safeId}.risk`,
          `asset.${safeId}.open`,
        ],
        catalog,
      ),
    };
  }

  if (
    questionLower.includes("history") ||
    questionLower.includes("data")
  ) {
    return {
      answer: `${noHistory.length} asset${noHistory.length === 1 ? "" : "s"} currently have no recorded maintenance history. Their health should not be interpreted as proven healthy until maintenance history is established.`,
      evidence: resolveEvidence(
        [
          "system.no_history",
          "system.new_activity",
          "system.total_assets",
        ],
        catalog,
      ),
    };
  }

  return {
    answer:
      highRisk.length > 0
        ? `${highRisk.length} asset${highRisk.length === 1 ? "" : "s"} currently have elevated maintenance risk. Review the highest-risk assets and their open tickets first.`
        : "Current maintenance signals do not identify an elevated-risk asset.",
    evidence: resolveEvidence(
      [
        "system.high_risk_assets",
        "system.open_tickets",
        "system.new_activity",
      ],
      catalog,
    ),
  };
}

export async function askMaintenanceCopilot(
  actor: TicketActor,
  question: string,
): Promise<MaintenanceCopilotResult> {
  if (actor.role !== "ADMIN") {
    throw new Error(
      "Maintenance Copilot is available to administrators only.",
    );
  }

  const normalizedQuestion = question.trim();

  if (!normalizedQuestion) {
    throw new Error("Please enter a maintenance question.");
  }

  if (normalizedQuestion.length > 500) {
    throw new Error(
      "Maintenance question must be 500 characters or fewer.",
    );
  }

  const [insights, tickets, technicians] = await Promise.all([
    getAssetMaintenanceInsights(),
    listAdminTickets(actor, {}),
    listTechniciansForAdmin(actor),
  ]);

  const evidenceCatalog = buildEvidenceCatalog(
    insights,
    tickets,
    technicians,
  );

  const fallback = fallbackAnswer(
    normalizedQuestion,
    insights,
    tickets,
    technicians,
    evidenceCatalog,
  );

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    return fallback;
  }

  const model =
    process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    getTimeoutMs(),
  );

  try {
    const client = new Anthropic({ apiKey });

    const context = {
      assetInsights: insights,
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        location: ticket.location,
        issueType: ticket.issueType,
        priority: ticket.priority,
        status: ticket.status,
        asset: ticket.asset,
        technician: ticket.technician,
      })),
      technicians: technicians.map((technician) => ({
        id: technician.id,
        name: technician.name,
        jobTitle: technician.jobTitle,
        openTickets: technician._count.assignedTickets,
      })),
    };

    const prompt = [
      "You are MaintainIQ's Maintenance Copilot for a maintenance administrator.",
      "",
      "Answer the administrator's question using ONLY the supplied maintenance data.",
      "Do not invent failures, costs, causes, recurrence, downtime, SLA breaches, or trends.",
      "Do not treat a single ticket as recurring or systemic.",
      "NEW_ACTIVITY means recent activity exists but there is insufficient prior-period history to establish worsening or recurrence.",
      "NO_HISTORY means there are no recorded tickets; it does NOT mean the asset is healthy.",
      "When evidence is insufficient, explicitly say so.",
      "Give practical operational advice, not generic AI advice.",
      "",
      "IMPORTANT EVIDENCE RULE:",
      "You must support your answer using the supplied evidence catalog.",
      "Return only evidence IDs that exist exactly in the catalog.",
      "Never create, modify, calculate, or guess an evidence ID.",
      "The server will resolve evidence IDs to the authoritative values.",
      "",
      "Return exactly one JSON object with these keys:",
      JSON.stringify(
        {
          answer: "concise decision-oriented answer",
          evidenceIds: [
            "exact evidence catalog ID supporting the answer",
          ],
        },
        null,
        2,
      ),
      "",
      `Administrator question: ${normalizedQuestion}`,
      "",
      "Evidence catalog:",
      JSON.stringify(evidenceCatalog, null, 2),
      "",
      "Maintenance data:",
      JSON.stringify(context, null, 2),
    ].join("\n");

    const response = await client.messages.create(
      {
        model,
        max_tokens: 700,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      { signal: controller.signal },
    );

    const answer = response.content
      .filter(
        (block): block is Anthropic.TextBlock =>
          block.type === "text",
      )
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!answer) {
      return fallback;
    }

    let parsed: Partial<ClaudeCopilotResponse>;

    try {
      const cleaned = answer
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      parsed = JSON.parse(cleaned) as Partial<ClaudeCopilotResponse>;
    } catch {
      console.warn(
        "Maintenance Copilot returned non-JSON output; using deterministic fallback.",
      );

      return fallback;
    }

    if (
      typeof parsed.answer !== "string" ||
      !Array.isArray(parsed.evidenceIds)
    ) {
      return fallback;
    }

    const evidence = resolveEvidence(
      parsed.evidenceIds.filter(
        (id): id is string => typeof id === "string",
      ),
      evidenceCatalog,
    );

    return {
      answer: parsed.answer.trim() || fallback.answer,
      evidence:
        evidence.length > 0
          ? evidence
          : fallback.evidence,
    };
  } catch (error) {
    console.warn(
      "Maintenance Copilot unavailable; using deterministic fallback:",
      error,
    );

    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}