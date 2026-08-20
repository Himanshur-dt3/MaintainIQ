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

function getClaudeConfiguration(): { apiKey: string; model: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

  if (!apiKey) {
    throw new TriageServiceError(
      "AI triage is unavailable because its server configuration is incomplete.",
    );
  }

  return { apiKey, model };
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

/**
 * Requests and strictly validates a Claude maintenance recommendation.
 *
 * @param intake - Reporter-provided issue facts.
 * @param assets - Current active asset catalog sent as contextual evidence.
 * @returns A validated AI recommendation suitable for server-side asset resolution.
 * @throws {TriageServiceError} When configuration, the upstream request, JSON parsing, or validation fails.
 */
export async function triageTicketWithClaude(
  intake: TicketIntakeInput,
  assets: AssetCatalogEntry[],
): Promise<AiTriageRecommendation> {
  const { apiKey, model } = getClaudeConfiguration();
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

    if (error instanceof SyntaxError) {
      console.error("Claude triage returned malformed JSON.");
      throw new TriageServiceError("AI triage returned an invalid recommendation.");
    }

    if (error instanceof Error && error.name === "AbortError") {
      console.error("Claude triage timed out.");
      throw new TriageServiceError("AI triage timed out. Please try again.");
    }

    if (error instanceof Error && error.name === "ZodError") {
      console.error("Claude triage returned an invalid recommendation shape.");
      throw new TriageServiceError("AI triage returned an invalid recommendation.");
    }

    console.error("Claude triage request failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw new TriageServiceError();
  } finally {
    clearTimeout(timeout);
  }
}
