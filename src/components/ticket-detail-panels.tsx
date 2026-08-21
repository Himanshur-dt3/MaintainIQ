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
  STRUCTURAL_GENERAL: "Structural & General",
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
        className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl"
      >
        <h2 id="ai-analysis-title" className="font-display text-lg font-bold text-white">
          AI Triage Analysis
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          No AI recommendation is recorded for this ticket.
        </p>
      </section>
    );
  }

  const confidencePercent = Math.round(analysis.confidence * 100);

  return (
    <section
      aria-labelledby="ai-analysis-title"
      className="rounded-3xl border border-sky-500/30 bg-gradient-to-b from-sky-950/40 via-slate-900/80 to-slate-900/90 p-6 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
            System Intelligence
          </span>
          <h2 id="ai-analysis-title" className="font-display text-lg font-bold text-white">
            AI Triage Analysis
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-300">
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          <span>{confidencePercent}% Confidence</span>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
          <dt className="font-bold uppercase text-slate-400">Suggested Issue Type</dt>
          <dd className="mt-1 font-bold text-slate-100">{issueTypeLabels[analysis.issueType]}</dd>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
          <dt className="font-bold uppercase text-slate-400">Suggested Priority</dt>
          <dd className="mt-1 font-bold text-slate-100">{analysis.priority}</dd>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:col-span-2">
          <dt className="font-bold uppercase text-slate-400">Recommended Specialist</dt>
          <dd className="mt-1 font-bold text-sky-300">{analysis.recommendedTechnician}</dd>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:col-span-2">
          <dt className="font-bold uppercase text-slate-400">Suggested Action</dt>
          <dd className="mt-1 whitespace-pre-wrap font-medium text-slate-200">
            {analysis.suggestedAction}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:col-span-2">
          <dt className="font-bold uppercase text-slate-400">Possible Causes</dt>
          <dd className="mt-2">
            <ul className="list-disc space-y-1.5 pl-4 text-slate-300">
              {analysis.possibleCauses.map((cause) => (
                <li key={cause}>{cause}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
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
      className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl"
    >
      <div className="border-b border-slate-800 pb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
          Audit Trail
        </span>
        <h2 id="ticket-history-title" className="font-display text-lg font-bold text-white">
          Ticket Activity History
        </h2>
      </div>

      {history.length === 0 ? (
        <p className="mt-4 text-xs text-slate-500">
          No recorded events for this ticket yet.
        </p>
      ) : (
        <ol className="dashboard-history-scroll mt-6 space-y-6 border-l border-slate-800 pl-6">
          {history.map((entry) => (
            <li key={entry.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[1.95rem] top-1.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-sky-500 ring-4 ring-sky-500/20"
              />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display text-sm font-bold text-white">
                  {formatHistoryAction(entry.action)}
                </p>
                <span className="text-[10px] font-semibold text-slate-500">
                  {new Date(entry.createdAt).toLocaleString("en-US", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Actor: <span className="font-semibold text-slate-200">{entry.actor?.name ?? "System Auto"}</span>
                {entry.actor?.role ? (
                  <span className="ml-1.5 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase font-bold text-slate-300">
                    {entry.actor.role}
                  </span>
                ) : null}
              </p>
              {entry.note ? (
                <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-300">
                  {entry.note}
                </div>
              ) : null}
              {entry.previousValue || entry.newValue ? (
                <p className="mt-2 text-[11px] font-mono text-slate-500">
                  {entry.previousValue ?? "--"} {"->"} {entry.newValue ?? "--"}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}




