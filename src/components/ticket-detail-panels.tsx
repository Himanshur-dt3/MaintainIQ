import type { IssueType } from "@prisma/client";

interface AiAnalysisPanelProps {
  analysis: {
    issueType: IssueType;
    priority: string;
    possibleCauses: string[];
    recommendedTechnician: string;
    suggestedAction: string;
    confidence: number;
  } | null;
}

interface TicketHistoryTimelineProps {
  history: Array<{
    id: string;
    action: string;
    note: string | null;
    previousValue: string | null;
    newValue: string | null;
    createdAt: Date;
    actor: {
      name: string;
      role: string;
    } | null;
  }>;
}

const issueTypeLabels: Record<IssueType, string> = {
  ELECTRICAL: "Electrical",
  PLUMBING: "Plumbing",
  HVAC: "HVAC",
  INTERNET_IT: "Internet & IT",
  APPLIANCE: "Appliance",
  STRUCTURAL_GENERAL: "Structural & general",
};

function formatHistoryAction(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

/**
 * Displays a validated AI recommendation without giving it mutation authority.
 *
 * @param analysis - Persisted AI analysis associated with a ticket, when present.
 * @returns An accessible summary panel or a controlled empty state.
 */
export function AiAnalysisPanel({ analysis }: AiAnalysisPanelProps) {
  if (!analysis) {
    return (
      <section
        aria-labelledby="ai-analysis-title"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 id="ai-analysis-title" className="text-lg font-semibold text-slate-950">
          AI triage
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          No validated AI recommendation is available for this ticket.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="ai-analysis-title"
      className="rounded-xl border border-sky-100 bg-sky-50 p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="ai-analysis-title" className="text-lg font-semibold text-slate-950">
          AI triage
        </h2>
        <p className="text-sm font-medium text-sky-800">
          {Math.round(analysis.confidence * 100)}% confidence
        </p>
      </div>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-600">Suggested issue type</dt>
          <dd className="mt-1 text-slate-950">{issueTypeLabels[analysis.issueType]}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-600">Suggested priority</dt>
          <dd className="mt-1 text-slate-950">{analysis.priority}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-slate-600">Suggested action</dt>
          <dd className="mt-1 whitespace-pre-wrap text-slate-950">
            {analysis.suggestedAction}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-slate-600">Possible causes</dt>
          <dd className="mt-2">
            <ul className="list-disc space-y-1 pl-5 text-slate-950">
              {analysis.possibleCauses.map((cause) => (
                <li key={cause}>{cause}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-sky-200 pt-4 text-sm text-slate-700">
        Recommended specialist:{" "}
        <span className="font-semibold text-slate-950">
          {analysis.recommendedTechnician}
        </span>
      </p>
    </section>
  );
}

/**
 * Renders chronological, actor-attributed ticket history.
 *
 * @param history - Ticket audit history ordered from oldest to newest.
 * @returns A timeline that preserves the underlying historical record.
 */
export function TicketHistoryTimeline({ history }: TicketHistoryTimelineProps) {
  return (
    <section
      aria-labelledby="ticket-history-title"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 id="ticket-history-title" className="text-lg font-semibold text-slate-950">
        Ticket history
      </h2>
      {history.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          There are no recorded ticket events yet.
        </p>
      ) : (
        <ol className="mt-5 space-y-5 border-l border-slate-200 pl-5">
          {history.map((entry) => (
            <li key={entry.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[1.72rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-sky-600"
              />
              <p className="font-medium text-slate-950">
                {formatHistoryAction(entry.action)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {entry.actor?.name ?? "System"} ·{" "}
                {entry.createdAt.toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              {entry.note ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                  {entry.note}
                </p>
              ) : null}
              {entry.previousValue || entry.newValue ? (
                <p className="mt-2 text-xs text-slate-500">
                  {entry.previousValue ?? "—"} → {entry.newValue ?? "—"}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
