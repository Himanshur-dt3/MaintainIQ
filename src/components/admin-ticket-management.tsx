"use client";

import type { IssueType, Priority, TicketStatus } from "@prisma/client";
import { useMemo, useState } from "react";

import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/src/components/ticket-badges";
import {
  calculateAssetHealthScore,
  recommendTechnicianDispatch,
} from "@/src/server/services/ai-assistant";

type Technician = {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  _count: {
    assignedTickets: number;
  };
};

type AdminTicket = {
  id: string;
  title: string;
  location: string;
  issueType: IssueType;
  priority: Priority;
  status: TicketStatus;
  updatedAt: Date;
  asset: {
    id: string;
    name: string;
    location: string;
    _count?: { tickets: number };
  };
  reporter: {
    id: string;
    name: string;
  };
  technician: {
    id: string;
    name: string;
  } | null;
  aiAnalysis: {
    issueType: IssueType;
    priority: Priority;
    confidence: number;
    suggestedAction: string;
  } | null;
  history?: Array<{
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
};

type AdminTicketManagementProps = {
  tickets: AdminTicket[];
  technicians: Technician[];
  issueTypes: IssueType[];
  priorities: Priority[];
  statuses: TicketStatus[];
};

type ActionState = {
  message: string;
  kind: "error" | "success";
} | null;

const labelValue = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

async function readActionResponse(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return body?.error ?? null;
}

/**
 * Provides administrator-only ticket assignment and audited AI-review controls.
 *
 * All mutations are sent to protected API routes; this component only supplies
 * interaction state and never makes authorization decisions in the browser.
 *
 * @param tickets - Server-authorized ticket records matching current filters.
 * @param technicians - Server-authorized technician assignment candidates.
 * @param issueTypes - Controlled issue type choices from the domain model.
 * @param priorities - Controlled priority choices from the domain model.
 * @param statuses - Controlled ticket status choices from the domain model.
 * @returns The interactive administration management panel.
 */
export function AdminTicketManagement({
  tickets,
  technicians,
  issueTypes,
  priorities,
  statuses,
}: AdminTicketManagementProps) {
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [issueType, setIssueType] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [actionState, setActionState] = useState<ActionState>(null);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [reviewTicketId, setReviewTicketId] = useState<string | null>(null);
  const [historyTicketId, setHistoryTicketId] = useState<string | null>(null);
  const [reviewIssueType, setReviewIssueType] = useState("");
  const [reviewPriority, setReviewPriority] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const selectedHistoryTicket = useMemo(
    () => tickets.find((t) => t.id === historyTicketId),
    [historyTicketId, tickets],
  );

  const filteredTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        return (
          (!status || ticket.status === status) &&
          (!priority || ticket.priority === priority) &&
          (!issueType || ticket.issueType === issueType) &&
          (!technicianId || ticket.technician?.id === technicianId)
        );
      }),
    [issueType, priority, status, technicianId, tickets],
  );

  async function assign(ticketId: string, nextTechnicianId: string) {
    if (!nextTechnicianId) {
      setActionState({
        kind: "error",
        message: "Select a technician before assigning the ticket.",
      });
      return;
    }

    setBusyTicketId(ticketId);
    setActionState(null);

    try {
      const response = await fetch(`/api/tickets/${ticketId}/actions/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: nextTechnicianId }),
      });
      const error = await readActionResponse(response);

      if (!response.ok) {
        setActionState({
          kind: "error",
          message: error ?? "Unable to assign this ticket.",
        });
        return;
      }

      setActionState({
        kind: "success",
        message: "Assignment saved. Refreshing the management view.",
      });
      window.location.reload();
    } finally {
      setBusyTicketId(null);
    }
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reviewTicketId) {
      return;
    }

    if (!reviewNote.trim()) {
      setModalError("Provide a rationale note explaining your review decision.");
      return;
    }

    setBusyTicketId(reviewTicketId);
    setModalError(null);
    setActionState(null);

    try {
      const response = await fetch(
        `/api/tickets/${reviewTicketId}/actions/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            issueType: reviewIssueType || undefined,
            priority: reviewPriority || undefined,
            reviewNote,
          }),
        },
      );
      const error = await readActionResponse(response);

      if (!response.ok) {
        setModalError(error ?? "Unable to save the AI review override.");
        return;
      }

      setActionState({
        kind: "success",
        message: "AI review override recorded in the ticket history.",
      });
      setReviewTicketId(null);
      window.location.reload();
    } catch {
      setModalError("A network error occurred while saving the review.");
    } finally {
      setBusyTicketId(null);
    }
  }

  return (
    <section aria-labelledby="admin-ticket-management-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Workload Management
          </p>
          <h2
            id="admin-ticket-management-title"
            className="mt-0.5 font-display text-lg font-bold text-white"
          >
            Ticket Operations
          </h2>
        </div>
        <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-400">
          {filteredTickets.length} / {tickets.length} tickets
        </span>
      </div>

      <fieldset className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-4">
        <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Filter Workload
        </legend>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-400">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="" className="bg-slate-900">All Statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value} className="bg-slate-900">
                {labelValue(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-400">
          Priority
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="" className="bg-slate-900">All Priorities</option>
            {priorities.map((value) => (
              <option key={value} value={value} className="bg-slate-900">
                {labelValue(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-400">
          Issue Type
          <select
            value={issueType}
            onChange={(event) => setIssueType(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="" className="bg-slate-900">All Issue Types</option>
            {issueTypes.map((value) => (
              <option key={value} value={value} className="bg-slate-900">
                {labelValue(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-400">
          Technician
          <select
            value={technicianId}
            onChange={(event) => setTechnicianId(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="" className="bg-slate-900">All Technicians</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id} className="bg-slate-900">
                {technician.name} ({technician._count.assignedTickets} open)
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      {actionState ? (
        <div
          role={actionState.kind === "error" ? "alert" : "status"}
          className={`rounded-2xl border p-4 text-xs font-bold ${
            actionState.kind === "error"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {actionState.message}
        </div>
      ) : null}

      {filteredTickets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
          <h3 className="font-display text-lg font-bold text-slate-300">
            No tickets match these filters
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Clear or adjust a filter above to view other operational tickets.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const latestWorkNote = ticket.history?.find(
              (entry) => entry.action === "WORK_NOTE_ADDED" && entry.note,
            );

            // AI Smart Dispatch — only shown for unassigned, non-resolved tickets
            const dispatchRec =
              !ticket.technician && ticket.status !== "RESOLVED"
                ? recommendTechnicianDispatch(ticket.issueType, ticket.priority, technicians)
                : null;

            // AI Asset Health Score
            const assetTicketCount = ticket.asset._count?.tickets ?? 1;
            const health = calculateAssetHealthScore(assetTicketCount);
            const healthColors = {
              HEALTHY: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
              MODERATE: "text-amber-400 border-amber-500/30 bg-amber-500/10",
              HIGH_RISK: "text-rose-400 border-rose-500/30 bg-rose-500/10",
            };
            const healthIcons = { HEALTHY: "✓", MODERATE: "⚠", HIGH_RISK: "⛔" };

            return (
              <article
                key={ticket.id}
                className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Ticket #{ticket.id.slice(0, 8)}
                    </span>
                    <h3 className="mt-1 font-display text-lg font-bold text-white">
                      {ticket.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      <span className="font-semibold text-slate-200">{ticket.asset.name}</span> · {ticket.location} · Reported by{" "}
                      <span className="font-semibold text-slate-200">{ticket.reporter.name}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TicketPriorityBadge priority={ticket.priority} />
                    <TicketStatusBadge status={ticket.status} />
                    {/* Asset Health Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${healthColors[health.riskLevel]}`}
                      title={health.preventativeRecommendation}
                    >
                      <span>{healthIcons[health.riskLevel]}</span>
                      <span>Asset {health.healthScore}%</span>
                    </span>
                  </div>
                </div>

                {/* AI Smart Dispatch Recommendation Banner */}
                {dispatchRec ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-3 text-xs backdrop-blur-md">
                    <div>
                      <p className="font-bold text-[10px] uppercase tracking-wider text-violet-400">
                        ⚡ AI Smart Dispatch Recommendation
                      </p>
                      <p className="mt-0.5 font-semibold text-slate-200">
                        {dispatchRec.technicianName}
                        <span className="ml-2 font-mono text-[10px] text-violet-300">
                          {dispatchRec.matchScore}% match
                        </span>
                      </p>
                      <p className="text-slate-400">{dispatchRec.rationale}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busyTicketId === ticket.id}
                      onClick={() => assign(ticket.id, dispatchRec.technicianId)}
                      className="shrink-0 rounded-xl border border-violet-500/50 bg-violet-500/20 px-3.5 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-500/30 disabled:opacity-50"
                    >
                      {busyTicketId === ticket.id ? "Assigning…" : "Auto-Assign →"}
                    </button>
                  </div>
                ) : null}

                {/* Asset Health Warning */}
                {health.riskLevel === "HIGH_RISK" ? (
                  <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <span className="font-bold">⛔ High Failure Risk: </span>
                    {health.preventativeRecommendation}
                  </div>
                ) : null}

                {latestWorkNote ? (
                  <div className="mt-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs backdrop-blur-md">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-indigo-300">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                        <span>Latest Technician Work Note ({latestWorkNote.actor?.name ?? "Technician"})</span>
                      </span>
                      <span className="text-[10px] opacity-75 font-mono">
                        {new Date(latestWorkNote.createdAt).toLocaleString("en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <p className="mt-2 font-medium text-slate-200 whitespace-pre-wrap">{latestWorkNote.note}</p>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-4 border-t border-slate-800/80 pt-5 lg:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-xs font-semibold text-slate-300">
                      Current Classification: <span className="font-bold text-sky-400">{labelValue(ticket.issueType)}</span>
                    </p>
                    {ticket.aiAnalysis ? (
                      <p className="mt-1 text-xs text-slate-400">
                        AI Suggested: {labelValue(ticket.aiAnalysis.issueType)} / {labelValue(ticket.aiAnalysis.priority)} at {Math.round(ticket.aiAnalysis.confidence * 100)}% confidence
                        {ticket.aiAnalysis.suggestedAction ? (
                          <span className="block mt-0.5 text-slate-500 italic">"{ticket.aiAnalysis.suggestedAction}"</span>
                        ) : null}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewTicketId(ticket.id);
                          setReviewIssueType("");
                          setReviewPriority("");
                          setReviewNote("");
                          setModalError(null);
                        }}
                        className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3.5 py-1.5 text-xs font-bold text-sky-300 transition duration-200 hover:bg-sky-500/20 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        Review AI Classification
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTicketId(ticket.id)}
                        className="rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-bold text-slate-300 transition duration-200 hover:border-slate-600 hover:bg-slate-700 hover:text-white"
                      >
                        View Activity History ({ticket.history?.length ?? 0})
                      </button>
                    </div>
                  </div>

                  <label className="grid min-w-60 gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    Assign Technician
                    <select
                      defaultValue={ticket.technician?.id ?? ""}
                      disabled={
                        ticket.status === "RESOLVED" ||
                        busyTicketId === ticket.id
                      }
                      onChange={(event) => assign(ticket.id, event.target.value)}
                      className="rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-sm font-normal text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" className="bg-slate-900">Choose technician</option>
                      {technicians.map((technician) => (
                        <option key={technician.id} value={technician.id} className="bg-slate-900">
                          {technician.name} · {technician._count.assignedTickets} open
                        </option>
                      ))}
                    </select>
                    {ticket.status === "RESOLVED" ? (
                      <span className="text-[10px] font-normal text-slate-500">
                        Resolved tickets cannot be reassigned.
                      </span>
                    ) : null}
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedHistoryTicket ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                  Full Audit History
                </span>
                <h2 className="font-display text-xl font-bold text-white">
                  {selectedHistoryTicket.title}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Ticket #{selectedHistoryTicket.id.slice(0, 8)} · {selectedHistoryTicket.location}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryTicketId(null)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-6">
              {selectedHistoryTicket.history && selectedHistoryTicket.history.length > 0 ? (
                <ol className="space-y-6 border-l border-slate-800 pl-6">
                  {selectedHistoryTicket.history.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[1.95rem] top-1.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-indigo-500 ring-4 ring-indigo-500/20"
                      />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-display text-sm font-bold text-white">
                          {entry.action.replaceAll("_", " ")}
                        </p>
                        <span className="text-[10px] font-semibold text-slate-500 font-mono">
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
                        <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                          {entry.note}
                        </div>
                      ) : null}
                      {entry.previousValue || entry.newValue ? (
                        <p className="mt-2 text-[11px] font-mono text-slate-500">
                          {entry.previousValue ?? "—"} → {entry.newValue ?? "—"}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-slate-500">No activity history recorded for this ticket.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {reviewTicketId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-md">
          <form
            onSubmit={submitReview}
            className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8"
            aria-labelledby="review-ai-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                  Human Oversight
                </span>
                <h2 id="review-ai-title" className="font-display text-xl font-bold text-white">
                  Record AI Review Override
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Any override requires a rationale note and is retained in ticket audit history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewTicketId(null)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {modalError ? (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-300"
              >
                {modalError}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                Reviewed Issue Type
                <select
                  value={reviewIssueType}
                  onChange={(event) => setReviewIssueType(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-normal text-white outline-none focus:border-sky-500"
                >
                  <option value="" className="bg-slate-900">Keep Current Issue Type</option>
                  {issueTypes.map((value) => (
                    <option key={value} value={value} className="bg-slate-900">
                      {labelValue(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                Reviewed Priority
                <select
                  value={reviewPriority}
                  onChange={(event) => setReviewPriority(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-normal text-white outline-none focus:border-sky-500"
                >
                  <option value="" className="bg-slate-900">Keep Current Priority</option>
                  {priorities.map((value) => (
                    <option key={value} value={value} className="bg-slate-900">
                      {labelValue(value)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
              Rationale Note
              <textarea
                required
                minLength={3}
                maxLength={2000}
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                rows={4}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-normal text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
                placeholder="Explain why the reviewed ticket classification differs from the AI recommendation."
              />
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setReviewTicketId(null)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyTicketId === reviewTicketId}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:brightness-110 disabled:opacity-50"
              >
                {busyTicketId === reviewTicketId
                  ? "Saving Review…"
                  : "Save Reviewed Override"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
