"use client";

import type { IssueType, Priority, TicketStatus } from "@prisma/client";
import { useMemo, useState } from "react";

import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/src/components/ticket-badges";

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
  const [reviewIssueType, setReviewIssueType] = useState("");
  const [reviewPriority, setReviewPriority] = useState("");
  const [reviewNote, setReviewNote] = useState("");

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

    setBusyTicketId(reviewTicketId);
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
        setActionState({
          kind: "error",
          message: error ?? "Unable to save the AI review override.",
        });
        return;
      }

      setActionState({
        kind: "success",
        message: "AI review override recorded in the ticket history.",
      });
      window.location.reload();
    } finally {
      setBusyTicketId(null);
    }
  }

  return (
    <section aria-labelledby="admin-ticket-management-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
            Scoped management
          </p>
          <h2
            id="admin-ticket-management-title"
            className="mt-2 text-2xl font-bold text-slate-950"
          >
            Ticket operations
          </h2>
        </div>
        <p className="text-sm text-slate-600">
          Showing {filteredTickets.length} of {tickets.length} ticket
          {tickets.length === 1 ? "" : "s"}
        </p>
      </div>

      <fieldset className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Filter tickets
        </legend>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
          >
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {labelValue(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Priority
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
          >
            <option value="">All priorities</option>
            {priorities.map((value) => (
              <option key={value} value={value}>
                {labelValue(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Issue type
          <select
            value={issueType}
            onChange={(event) => setIssueType(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
          >
            <option value="">All issue types</option>
            {issueTypes.map((value) => (
              <option key={value} value={value}>
                {labelValue(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Technician
          <select
            value={technicianId}
            onChange={(event) => setTechnicianId(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
          >
            <option value="">All technicians</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name} ({technician._count.assignedTickets} open)
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      {actionState ? (
        <p
          role={actionState.kind === "error" ? "alert" : "status"}
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            actionState.kind === "error"
              ? "bg-red-50 text-red-800"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {actionState.message}
        </p>
      ) : null}

      {filteredTickets.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">
            No tickets match these filters
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Clear or adjust a filter to review another operational workload.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {filteredTickets.map((ticket) => (
            <article
              key={ticket.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Ticket #{ticket.id.slice(0, 8)}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950">
                    {ticket.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {ticket.asset.name} · {ticket.location} · Reported by{" "}
                    {ticket.reporter.name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <TicketPriorityBadge priority={ticket.priority} />
                  <TicketStatusBadge status={ticket.status} />
                </div>
              </div>

              <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 lg:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Current classification: {labelValue(ticket.issueType)}
                  </p>
                  {ticket.aiAnalysis ? (
                    <p className="mt-1 text-sm text-slate-600">
                      AI suggested {labelValue(ticket.aiAnalysis.issueType)} /{" "}
                      {labelValue(ticket.aiAnalysis.priority)} at{" "}
                      {Math.round(ticket.aiAnalysis.confidence * 100)}%
                      confidence.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setReviewTicketId(ticket.id);
                      setReviewIssueType("");
                      setReviewPriority("");
                      setReviewNote("");
                    }}
                    className="mt-3 rounded-lg border border-sky-600 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2"
                  >
                    Review AI classification
                  </button>
                </div>

                <label className="grid min-w-56 gap-1.5 text-sm font-medium text-slate-700">
                  Assign technician
                  <select
                    defaultValue={ticket.technician?.id ?? ""}
                    disabled={
                      ticket.status === "RESOLVED" ||
                      busyTicketId === ticket.id
                    }
                    onChange={(event) => assign(ticket.id, event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">Choose technician</option>
                    {technicians.map((technician) => (
                      <option key={technician.id} value={technician.id}>
                        {technician.name} · {technician._count.assignedTickets}{" "}
                        open
                      </option>
                    ))}
                  </select>
                  {ticket.status === "RESOLVED" ? (
                    <span className="text-xs font-normal text-slate-500">
                      Resolved tickets cannot be reassigned.
                    </span>
                  ) : null}
                </label>
              </div>
            </article>
          ))}
        </div>
      )}

      {reviewTicketId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <form
            onSubmit={submitReview}
            className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl"
            aria-labelledby="review-ai-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="review-ai-title" className="text-xl font-bold text-slate-950">
                  Record AI review
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Any change requires a durable review note and is retained in
                  the ticket history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewTicketId(null)}
                className="rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Reviewed issue type
                <select
                  value={reviewIssueType}
                  onChange={(event) => setReviewIssueType(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
                >
                  <option value="">Keep current issue type</option>
                  {issueTypes.map((value) => (
                    <option key={value} value={value}>
                      {labelValue(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Reviewed priority
                <select
                  value={reviewPriority}
                  onChange={(event) => setReviewPriority(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
                >
                  <option value="">Keep current priority</option>
                  {priorities.map((value) => (
                    <option key={value} value={value}>
                      {labelValue(value)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 grid gap-1.5 text-sm font-medium text-slate-700">
              Review note
              <textarea
                required
                minLength={3}
                maxLength={2000}
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                rows={4}
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-950"
                placeholder="Explain why the reviewed ticket classification differs from the AI recommendation."
              />
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewTicketId(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyTicketId === reviewTicketId}
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {busyTicketId === reviewTicketId
                  ? "Saving review…"
                  : "Save reviewed values"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
