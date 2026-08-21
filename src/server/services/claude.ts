import Anthropic from "@anthropic-ai/sdk";
import { IssueType, Priority } from "@prisma/client";

import {
  aiTriageRecommendationSchema,
  type AiTriageRecommendation,
  type TicketIntakeInput,
} from "@/src/lib/validation/tickets";

const DEFAULT_MODEL = "claude-3-5-haiku-latest";
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 60_000;

type AssetCatalogEntry = {
  id: string;
  name: string;
  type: string;
  location: string;
};

export class TriageServiceError extends Error {
  readonly statusCode = 503;

  constructor(message = "AI triage is temporarily unavailable.") {
    super(message);
    this.name = "TriageServiceError";
  }
}

function getTimeoutMs(): number {
  const configuredTimeout = Number(process.env.ANTHROPIC_TIMEOUT_MS);

  if (
    !Number.isFinite(configuredTimeout) ||
    configuredTimeout <= 0 ||
    configuredTimeout > MAX_TIMEOUT_MS
  ) {
    return DEFAULT_TIMEOUT_MS;
  }

  return configuredTimeout;
}

/**
 * Extracts JSON from a Claude response that may be wrapped in Markdown fences.
 *
 * @param content - The concatenated text response from Claude.
 * @returns A JSON document string ready for parsing.
 * @throws {TriageServiceError} When no JSON object can be found.
 */
export function cleanJsonResponse(content: string): string {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = (fencedMatch?.[1] ?? trimmed).trim();

  const objectStart = candidate.indexOf("{");
  const objectEnd = candidate.lastIndexOf("}");

  if (objectStart === -1 || objectEnd === -1 || objectEnd < objectStart) {
    throw new TriageServiceError("AI triage returned an invalid recommendation.");
  }

  return candidate.slice(objectStart, objectEnd + 1);
}

function extractTextResponse(response: Anthropic.Message): string {
  const text = response.content
    .filter(
      (block): block is Anthropic.TextBlock =>
        block.type === "text",
    )
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new TriageServiceError("AI triage returned no recommendation.");
  }

  return text;
}

function buildPrompt(
  intake: TicketIntakeInput,
  assets: AssetCatalogEntry[],
): string {
  return [
    "You are MaintainIQ's maintenance triage assistant.",
    "Return only one valid JSON object. Do not include Markdown, explanations, or extra keys.",
    "Use only the exact enum values supplied below.",
    "Choose an existing asset only when its location is clearly relevant to the report.",
    "Location relevance is mandatory: never select an unrelated catalog asset merely because it exists.",
    "When no existing asset clearly matches, set create_asset to true and asset_id to null, then provide a concise new asset name, type, and location.",
    "",
    "Required JSON schema:",
    JSON.stringify(
      {
        asset_id: "UUID string for an existing relevant asset, or null",
        asset_name: "string",
        asset_type: "string",
        asset_location: "string",
        create_asset: "boolean",
        issue_type: Object.values(IssueType),
        priority: Object.values(Priority),
        possible_causes: ["one to five short strings"],
        recommended_technician: "string",
        suggested_action: "string",
        confidence: "number from 0 to 1",
      },
      null,
      2,
    ),
    "",
    "Reporter intake:",
    JSON.stringify(intake),
    "",
    "Current asset catalog:",
    JSON.stringify(assets),
  ].join("\n");
}

function deriveRuleBasedCauses(
  intake: TicketIntakeInput,
  issueType: IssueType,
): string[] {
  const text = (intake.title + " " + intake.description).toLowerCase();
  const causes: string[] = [];

  if (issueType === IssueType.HVAC) {
    if (
      text.includes("weak airflow") ||
      text.includes("low airflow") ||
      text.includes("airflow")
    ) {
      causes.push(
        "Restricted airflow from a blocked filter, obstructed return path, or blower problem is plausible because the report mentions airflow symptoms.",
      );
    }

    if (
      text.includes("not cooling") ||
      text.includes("warm") ||
      text.includes("hot") ||
      text.includes("temperature")
    ) {
      causes.push(
        "Cooling-system performance failure is plausible because the reported temperature symptom indicates that the unit may be operating without providing sufficient cooling.",
      );
    }

    if (
      text.includes("thermostat") ||
      text.includes("sensor") ||
      text.includes("setpoint") ||
      text.includes("temperature")
    ) {
      causes.push(
        "A thermostat or temperature-sensor problem is possible because the reported temperature behavior can result from incorrect sensing or control.",
      );
    }
  }

  if (issueType === IssueType.PLUMBING) {
    if (
      text.includes("leak") ||
      text.includes("water") ||
      text.includes("drip")
    ) {
      causes.push(
        "A leaking or failed connection is plausible because the report contains water or leakage symptoms.",
      );
    }

    if (
      text.includes("drain") ||
      text.includes("slow") ||
      text.includes("overflow")
    ) {
      causes.push(
        "A blocked or restricted drain is plausible because the reported drainage behavior is consistent with reduced flow.",
      );
    }

    if (text.includes("pressure") || text.includes("flow")) {
      causes.push(
        "A supply-pressure or flow restriction is possible because the report describes abnormal water flow.",
      );
    }
  }

  if (issueType === IssueType.ELECTRICAL) {
    if (
      text.includes("power") ||
      text.includes("outlet") ||
      text.includes("socket") ||
      text.includes("switch")
    ) {
      causes.push(
        "A failed electrical connection, outlet, switch, or circuit component is plausible because the report describes a power-related symptom.",
      );
    }

    if (text.includes("flicker") || text.includes("intermittent")) {
      causes.push(
        "A loose connection or unstable circuit is possible because the reported symptom is intermittent or flickering.",
      );
    }

    if (text.includes("trip") || text.includes("breaker")) {
      causes.push(
        "An overloaded circuit, short circuit, or protective-breaker trip is possible because the report mentions breaker behavior.",
      );
    }
  }

  if (issueType === IssueType.INTERNET_IT) {
    if (
      text.includes("wifi") ||
      text.includes("internet") ||
      text.includes("network") ||
      text.includes("connection")
    ) {
      causes.push(
        "A network connectivity or access-point issue is plausible because the report describes loss or degradation of network access.",
      );
    }

    if (text.includes("slow") || text.includes("speed")) {
      causes.push(
        "Network congestion, signal degradation, or an upstream connectivity problem is possible because the report describes reduced performance.",
      );
    }
  }

  if (issueType === IssueType.APPLIANCE) {
    if (
      text.includes("not working") ||
      text.includes("stopped") ||
      text.includes("broken")
    ) {
      causes.push(
        "A failed electrical, mechanical, or control component is plausible because the appliance is reported as non-functional.",
      );
    }

    if (
      text.includes("noise") ||
      text.includes("sound") ||
      text.includes("vibration")
    ) {
      causes.push(
        "A worn, loose, or misaligned mechanical component is possible because the report describes abnormal noise or vibration.",
      );
    }
  }

  if (issueType === IssueType.STRUCTURAL_GENERAL) {
    if (
      text.includes("crack") ||
      text.includes("damage") ||
      text.includes("broken")
    ) {
      causes.push(
        "Material damage or structural deterioration is plausible because the report explicitly describes physical damage.",
      );
    }

    if (text.includes("door") || text.includes("window")) {
      causes.push(
        "A damaged, misaligned, or worn door/window component is possible because the reported symptom involves its operation.",
      );
    }
  }

  if (causes.length === 0) {
    causes.push(
      "The available ticket information does not identify a specific root cause. An on-site diagnostic inspection is required before assigning a definitive cause.",
    );
  }

  return causes.slice(0, 3);
}
function getRuleBasedFallbackTriage(
  intake: TicketIntakeInput,
  assets: AssetCatalogEntry[],
): AiTriageRecommendation {
  const text = `${intake.title} ${intake.description} ${intake.location}`.toLowerCase();

  let issue_type: IssueType = IssueType.STRUCTURAL_GENERAL;
  if (
    text.includes("water") ||
    text.includes("leak") ||
    text.includes("pipe") ||
    text.includes("tap") ||
    text.includes("sink") ||
    text.includes("toilet") ||
    text.includes("drain") ||
    text.includes("washroom")
  ) {
    issue_type = IssueType.PLUMBING;
  } else if (
    text.includes("light") ||
    text.includes("wire") ||
    text.includes("power") ||
    text.includes("outlet") ||
    text.includes("switch") ||
    text.includes("electric")
  ) {
    issue_type = IssueType.ELECTRICAL;
  } else if (
    text.includes("ac") ||
    text.includes("air") ||
    text.includes("hvac") ||
    text.includes("heat") ||
    text.includes("cold") ||
    text.includes("vent")
  ) {
    issue_type = IssueType.HVAC;
  } else if (
    text.includes("wifi") ||
    text.includes("internet") ||
    text.includes("network") ||
    text.includes("router") ||
    text.includes("computer")
  ) {
    issue_type = IssueType.INTERNET_IT;
  } else if (
    text.includes("washing") ||
    text.includes("machine") ||
    text.includes("washer") ||
    text.includes("dryer") ||
    text.includes("fridge") ||
    text.includes("refrigerator") ||
    text.includes("oven") ||
    text.includes("stove") ||
    text.includes("microwave")
  ) {
    issue_type = IssueType.APPLIANCE;
  }

  let priority: Priority = Priority.MEDIUM;
  if (
    text.includes("urgent") ||
    text.includes("broken") ||
    text.includes("overflow") ||
    text.includes("fire") ||
    text.includes("danger") ||
    text.includes("critical")
  ) {
    priority = Priority.HIGH;
  }

  const matchedAsset = assets.find(
    (a) =>
      a.location.toLowerCase().includes(intake.location.toLowerCase()) ||
      intake.location.toLowerCase().includes(a.location.toLowerCase()) ||
      a.name.toLowerCase().includes(intake.title.toLowerCase()),
  );

  if (matchedAsset) {
    return {
      asset_id: matchedAsset.id,
      asset_name: matchedAsset.name,
      asset_type: matchedAsset.type,
      asset_location: matchedAsset.location,
      create_asset: false,
      issue_type,
      priority,
      possible_causes: deriveRuleBasedCauses(intake, issue_type),
      recommended_technician: `${issue_type} technician`,
      suggested_action: `Investigate the symptoms described in the ticket: ${intake.title.toLowerCase()}. Start with the highest-probability cause and verify the relevant component before replacing parts.`,
      confidence: 0.75,
    };
  }

  const rawTitle = intake.title.trim();
  const formattedAssetName =
    rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

  return {
    asset_id: null,
    asset_name: formattedAssetName,
    asset_type: `${issue_type} Equipment`,
    asset_location: intake.location,
    create_asset: true,
    issue_type,
    priority,
    possible_causes: deriveRuleBasedCauses(intake, issue_type),
    recommended_technician: `${issue_type} technician`,
    suggested_action: `Investigate the symptoms described in the ticket: ${intake.title.toLowerCase()}. Start with the highest-probability cause and verify the relevant component before replacing parts.`,
    confidence: 0.7,
  };
}

/**
 * Requests and strictly validates a Claude maintenance recommendation.
 * Falls back gracefully to rule-based triage if ANTHROPIC_API_KEY is not set or API fails.
 *
 * @param intake - Reporter-provided issue facts.
 * @param assets - Current active asset catalog sent as contextual evidence.
 * @returns A validated AI recommendation suitable for server-side asset resolution.
 */
export async function triageTicketWithClaude(
  intake: TicketIntakeInput,
  assets: AssetCatalogEntry[],
): Promise<AiTriageRecommendation> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

  if (!apiKey) {
    return getRuleBasedFallbackTriage(intake, assets);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create(
      {
        model,
        max_tokens: 900,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: buildPrompt(intake, assets),
          },
        ],
      },
      { signal: controller.signal },
    );

    const cleanedResponse = cleanJsonResponse(extractTextResponse(response));
    const parsedResponse: unknown = JSON.parse(cleanedResponse);
    return aiTriageRecommendationSchema.parse(parsedResponse);
  } catch (error) {
    if (error instanceof TriageServiceError) {
      throw error;
    }

    console.warn("Claude triage unavailable or failed, falling back to rule-based triage:", error);
    return getRuleBasedFallbackTriage(intake, assets);
  } finally {
    clearTimeout(timeout);
  }
}


