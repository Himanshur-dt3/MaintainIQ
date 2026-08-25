"use client";

import type { IssueType, Priority, TicketStatus } from "@prisma/client";
import Link from "next/link";
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
  slaDeadline: Date | null;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
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


function getTicketSlaStatus(ticket: AdminTicket, now = new Date()) {
  if (!ticket.slaDeadline) {
    return { label: "No SLA", className: "text-[#929792] border-[#35393c] bg-[#202326]/50" };
  }

  if (ticket.status === "RESOLVED") {
    if (!ticket.resolvedAt) {
      return { label: "Resolved - time unavailable", className: "text-[#929792] border-[#35393c] bg-[#202326]/50" };
    }

    return ticket.resolvedAt.getTime() <= ticket.slaDeadline.getTime()
      ? { label: "Resolved within SLA", className: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" }
      : { label: "Resolved late", className: "text-red-400 border-red-500/30 bg-red-500/10" };
  }

  const remainingMs = ticket.slaDeadline.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return { label: "SLA breached", className: "text-red-400 border-red-500/30 bg-red-500/10" };
  }

  const targetHours = {
    CRITICAL: 4,
    HIGH: 8,
    MEDIUM: 24,
    LOW: 72,
  }[ticket.priority];

  const atRiskWindowMs = targetHours * 60 * 60 * 1000 * 0.25;

  return remainingMs <= atRiskWindowMs
    ? { label: "SLA at risk", className: "text-amber-400 border-amber-500/30 bg-amber-500/10" }
    : { label: "SLA on track", className: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" };
}

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
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#737873]">
            Workload Management
          </p>
          <h2
            id="admin-ticket-management-title"
            className="mt-0.5 font-display text-lg font-bold text-white"
          >
            Ticket Operations
          </h2>
        </div>
        <span className="rounded-lg border border-[#303438] bg-[#181b1d] px-3 py-1.5 text-xs font-bold text-[#929792]">
          {filteredTickets.length} / {tickets.length} tickets
        </span>
      </div>

      <fieldset className="grid gap-4 rounded-lg border border-[#303438] bg-[#181b1d] p-5 md:grid-cols-4">
        <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#737873]">
          Filter Workload
        </legend>
        <label className="grid gap-1.5 text-xs font-semibold text-[#929792]">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-[#35393c] bg-[#111315] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="" className="bg-[#181b1d]">All Statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value} className="bg-[#181b1d]">
                {labelValue(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#929792]">
          Priority
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="rounded-xl border border-[#35393c] bg-[#111315] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="" className="bg-[#181b1d]">All Priorities</option>
            {priorities.map((value) => (
              <option key={value} value={value} className="bg-[#181b1d]">
                {labelValue(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#929792]">
          Issue Type
          <select
            value={issueType}
            onChange={(event) => setIssueType(event.target.value)}
            className="rounded-xl border border-[#35393c] bg-[#111315] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="" className="bg-[#181b1d]">All Issue Types</option>
            {issueTypes.map((value) => (
              <option key={value} value={value} className="bg-[#181b1d]">
                {labelValue(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#929792]">
          Technician
          <select
            value={technicianId}
            onChange={(event) => setTechnicianId(event.target.value)}
            className="rounded-xl border border-[#35393c] bg-[#111315] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="" className="bg-[#181b1d]">All Technicians</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id} className="bg-[#181b1d]">
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
        <div className="rounded-3xl border border-dashed border-[#303438] bg-[#181b1d]/40 px-6 py-12 text-center">
          <h3 className="font-display text-lg font-bold text-[#b8bcb7]">
            No tickets match these filters
          </h3>
          <p className="mt-2 text-xs text-[#737873]">
            Clear or adjust a filter above to view other operational tickets.
          </p>
        </div>
      ) : (
        <div className="ticket-operations-scroll space-y-4">
          {filteredTickets.map((ticket) => {
            const latestWorkNote = ticket.history?.find(
              (entry) => entry.action === "WORK_NOTE_ADDED" && entry.note,
            );

            // AI Smart Dispatch -- only shown for unassigned, non-resolved tickets
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
            const healthIcons = { HEALTHY: "OK", MODERATE: "!", HIGH_RISK: "!!" };

            const sla = getTicketSlaStatus(ticket);

            return (
              <article
                key={ticket.id}
                className="rounded-lg border border-[#303438] bg-[#181b1d]/70 p-6 shadow-xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#929792]">
                      Ticket #{ticket.id.slice(0, 8)}
                    </span>
                    <h3 className="mt-1 font-display text-lg font-bold text-white">
  <Link
    href={`/admin/tickets/${ticket.id}`}
    className="transition-colors hover:text-sky-300"
  >
    {ticket.title}
  </Link>
</h3>
                    <p className="mt-1 text-xs text-[#929792]">
                      <span className="font-semibold text-[#d9dcd7]">{ticket.asset.name}</span> | {ticket.location} | Reported by{" "}
                      <span className="font-semibold text-[#d9dcd7]">{ticket.reporter.name}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TicketPriorityBadge priority={ticket.priority} />
                    <TicketStatusBadge status={ticket.status} />
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${sla.className}`}
                      title="SLA status"
                    >
                      {sla.label}
                    </span>
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
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs">
                    <div>
                      <p className="font-bold text-[10px] uppercase tracking-wider text-sky-300">
                        AI Smart Dispatch Recommendation
                      </p>
                      <p className="mt-0.5 font-semibold text-[#d9dcd7]">
                        {dispatchRec.technicianName}
                        <span className="ml-2 font-mono text-[10px] text-sky-300">
                          {dispatchRec.matchScore}% match
                        </span>
                      </p>
                      <p className="text-[#929792]">{dispatchRec.rationale}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busyTicketId === ticket.id}
                      onClick={() => assign(ticket.id, dispatchRec.technicianId)}
                      className="shrink-0 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3.5 py-2 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
                    >
                      {busyTicketId === ticket.id ? "Assigning..." : "Auto-Assign ->"}
                    </button>
                  </div>
                ) : null}

                {/* Asset Health Warning */}
                {health.riskLevel === "HIGH_RISK" ? (
                  <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <span className="font-bold">!! High Failure Risk: </span>
                    {health.preventativeRecommendation}
                  </div>
                ) : null}

                {latestWorkNote ? (
                  <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-sky-300">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                        <span>Latest Technician Work Note ({latestWorkNote.actor?.name ?? "Technician"})</span>
                      </span>
                      <span className="text-[10px] opacity-75 font-mono">
                        {new Date(latestWorkNote.createdAt).toLocaleString("en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <p className="mt-2 font-medium text-[#d9dcd7] whitespace-pre-wrap">{latestWorkNote.note}</p>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-4 border-t border-[#303438]/80 pt-5 lg:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-xs font-semibold text-[#b8bcb7]">
                      Current Classification: <span className="font-bold text-sky-400">{labelValue(ticket.issueType)}</span>
                    </p>
                    {ticket.aiAnalysis ? (
                      <p className="mt-1 text-xs text-[#929792]">
                        AI Suggested: {labelValue(ticket.aiAnalysis.issueType)} / {labelValue(ticket.aiAnalysis.priority)} at {Math.round(ticket.aiAnalysis.confidence * 100)}% confidence
                        {ticket.aiAnalysis.suggestedAction ? (
                          <span className="block mt-0.5 text-[#737873] italic">&quot;{ticket.aiAnalysis.suggestedAction}&quot;</span>
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
                        className="rounded-xl border border-[#35393c] bg-[#202326]/80 px-3.5 py-1.5 text-xs font-bold text-[#b8bcb7] transition duration-200 hover:border-slate-600 hover:bg-slate-700 hover:text-white"
                      >
                        View Activity History ({ticket.history?.length ?? 0})
                      </button>
                    </div>
                  </div>

                  <label className="grid min-w-60 gap-1.5 text-xs font-bold uppercase tracking-wider text-[#b8bcb7]">
                    Assign Technician
                    <select
                      defaultValue={ticket.technician?.id ?? ""}
                      disabled={
                        ticket.status === "RESOLVED" ||
                        busyTicketId === ticket.id
                      }
                      onChange={(event) => assign(ticket.id, event.target.value)}
                      className="rounded-xl border border-[#35393c] bg-[#111315]/60 px-3.5 py-2 text-sm font-normal text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" className="bg-[#181b1d]">Choose technician</option>
                      {technicians.map((technician) => (
                        <option key={technician.id} value={technician.id} className="bg-[#181b1d]">
                          {technician.name} | {technician._count.assignedTickets} open
                        </option>
                      ))}
                    </select>
                    {ticket.status === "RESOLVED" ? (
                      <span className="text-[10px] font-normal text-[#737873]">
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#111315]/80 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg border border-[#303438] bg-[#181b1d] p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-[#303438] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                  Full Audit History
                </span>
                <h2 className="font-display text-xl font-bold text-white">
                  {selectedHistoryTicket.title}
                </h2>
                <p className="mt-1 text-xs text-[#929792]">
                  Ticket #{selectedHistoryTicket.id.slice(0, 8)} | {selectedHistoryTicket.location}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryTicketId(null)}
                className="rounded-xl border border-[#303438] bg-[#111315] px-3 py-1.5 text-xs font-bold text-[#929792] hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-6">
              {selectedHistoryTicket.history && selectedHistoryTicket.history.length > 0 ? (
                <ol className="space-y-6 border-l border-[#303438] pl-6">
                  {selectedHistoryTicket.history.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[1.95rem] top-1.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-sky-500 ring-4 ring-sky-500/20"
                      />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-display text-sm font-bold text-white">
                          {entry.action.replaceAll("_", " ")}
                        </p>
                        <span className="text-[10px] font-semibold text-[#737873] font-mono">
                          {new Date(entry.createdAt).toLocaleString("en-US", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#929792]">
                        Actor: <span className="font-semibold text-[#d9dcd7]">{entry.actor?.name ?? "System Auto"}</span>
                        {entry.actor?.role ? (
                          <span className="ml-1.5 rounded bg-[#202326] px-1.5 py-0.5 text-[10px] uppercase font-bold text-[#b8bcb7]">
                            {entry.actor.role}
                          </span>
                        ) : null}
                      </p>
                      {entry.note ? (
                        <div className="mt-2 rounded-xl border border-[#303438] bg-[#111315]/70 p-3 text-xs leading-relaxed text-[#b8bcb7] whitespace-pre-wrap">
                          {entry.note}
                        </div>
                      ) : null}
                      {entry.previousValue || entry.newValue ? (
                        <p className="mt-2 text-[11px] font-mono text-[#737873]">
                          {entry.previousValue ?? "--"} {"->"} {entry.newValue ?? "--"}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-[#737873]">No activity history recorded for this ticket.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {reviewTicketId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#111315]/80 p-4">
          <form
            onSubmit={submitReview}
            className="w-full max-w-xl rounded-lg border border-[#303438] bg-[#181b1d] p-6 shadow-2xl sm:p-8"
            aria-labelledby="review-ai-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#303438] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                  Human Oversight
                </span>
                <h2 id="review-ai-title" className="font-display text-xl font-bold text-white">
                  Record AI Review Override
                </h2>
                <p className="mt-1 text-xs text-[#929792]">
                  Any override requires a rationale note and is retained in ticket audit history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewTicketId(null)}
                className="rounded-xl border border-[#303438] bg-[#111315] px-3 py-1.5 text-xs font-bold text-[#929792] hover:text-white"
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
              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-[#b8bcb7]">
                Reviewed Issue Type
                <select
                  value={reviewIssueType}
                  onChange={(event) => setReviewIssueType(event.target.value)}
                  className="rounded-xl border border-[#35393c] bg-[#111315] px-3.5 py-2.5 text-sm font-normal text-white outline-none focus:border-sky-500"
                >
                  <option value="" className="bg-[#181b1d]">Keep Current Issue Type</option>
                  {issueTypes.map((value) => (
                    <option key={value} value={value} className="bg-[#181b1d]">
                      {labelValue(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-[#b8bcb7]">
                Reviewed Priority
                <select
                  value={reviewPriority}
                  onChange={(event) => setReviewPriority(event.target.value)}
                  className="rounded-xl border border-[#35393c] bg-[#111315] px-3.5 py-2.5 text-sm font-normal text-white outline-none focus:border-sky-500"
                >
                  <option value="" className="bg-[#181b1d]">Keep Current Priority</option>
                  {priorities.map((value) => (
                    <option key={value} value={value} className="bg-[#181b1d]">
                      {labelValue(value)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 grid gap-1.5 text-xs font-bold uppercase tracking-wider text-[#b8bcb7]">
              Rationale Note
              <textarea
                required
                minLength={3}
                maxLength={2000}
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                rows={4}
                className="rounded-xl border border-[#35393c] bg-[#111315] px-4 py-3 text-sm font-normal text-white outline-none placeholder:text-[#626762] focus:border-sky-500"
                placeholder="Explain why the reviewed ticket classification differs from the AI recommendation."
              />
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#303438] pt-4">
              <button
                type="button"
                onClick={() => setReviewTicketId(null)}
                className="rounded-xl border border-[#303438] px-4 py-2 text-xs font-bold text-[#929792] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyTicketId === reviewTicketId}
                className="rounded-xl bg-sky-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:brightness-110 disabled:opacity-50"
              >
                {busyTicketId === reviewTicketId
                  ? "Saving Review..."
                  : "Save Reviewed Override"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}











