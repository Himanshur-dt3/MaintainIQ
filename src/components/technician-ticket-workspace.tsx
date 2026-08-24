"use client";

import type { IssueType, Priority, TicketStatus } from "@prisma/client";
import { useState } from "react";

import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/src/components/ticket-badges";
import { generateTechnicianDiagnosticGuide } from "@/src/server/services/ai-assistant";

type TechnicianTicket = {
  id: string;
  title: string;
  description: string;
  location: string;
  issueType?: IssueType;
  priority: Priority;
  status: TicketStatus;
  resolutionNotes: string | null;
  asset: {
    name: string;
    location: string;
  };
  reporter: {
    name: string;
    email: string;
  };
};

type ActionState = {
  kind: "error" | "success";
  message: string;
} | null;

type TechnicianMaintenancePlan = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  frequency: string;
  status: string;
  priority: Priority;
  nextDueAt: Date | string;
  lastCompletedAt: Date | string | null;
  asset: {
    id: string;
    name: string;
    type: string;
    location: string;
  };
};

type TechnicianTicketWorkspaceProps = {
  tickets: TechnicianTicket[];
  maintenancePlans: TechnicianMaintenancePlan[];
};

async function getActionError(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return body?.error ?? null;
}

/**
 * Renders the assigned technician workload and sends lifecycle mutations only
 * through the server-authorized ticket action routes.
 *
 * @param tickets - Server-filtered tickets assigned to the authenticated technician.
 * @returns The interactive technician work queue.
 */
export function TechnicianTicketWorkspace({
  tickets,
  maintenancePlans,
}: TechnicianTicketWorkspaceProps) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    tickets[0]?.id ?? null,
  );
  const [workNote, setWorkNote] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [completingPlanId, setCompletingPlanId] = useState<string | null>(null);

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;

  async function postAction(
    ticketId: string,
    action: "start" | "note" | "resolve",
    payload?: Record<string, string>,
  ): Promise<boolean> {
    setBusyAction(`${ticketId}:${action}`);
    setActionState(null);

    try {
      const response = await fetch(`/api/tickets/${ticketId}/actions/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {}),
      });
      const error = await getActionError(response);

      if (!response.ok) {
        setActionState({
          kind: "error",
          message: error ?? "The ticket action could not be completed.",
        });
        return false;
      }

      return true;
    } finally {
      setBusyAction(null);
    }
  }

  async function completeMaintenancePlan(planId: string) {
    if (!window.confirm("Mark this maintenance plan as completed?")) {
      return;
    }

    setCompletingPlanId(planId);
    setActionState(null);

    try {
      const response = await fetch(
        `/api/maintenance-plans/${planId}/technician-complete`,
        {
          method: "POST",
        },
      );

      const error = await getActionError(response);

      if (!response.ok) {
        setActionState({
          kind: "error",
          message:
            error ?? "The maintenance plan could not be completed.",
        });
        return;
      }

      setActionState({
        kind: "success",
        message: "Maintenance plan completed. Refreshing your workload.",
      });

      window.location.reload();
    } finally {
      setCompletingPlanId(null);
    }
  }

  async function startWork(ticketId: string) {
    if (await postAction(ticketId, "start")) {
      setActionState({
        kind: "success",
        message: "Work started. Refreshing your assigned workload.",
      });
      window.location.reload();
    }
  }

  async function submitWorkNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTicket) {
      return;
    }

    if (
      await postAction(selectedTicket.id, "note", {
        note: workNote,
      })
    ) {
      setWorkNote("");
      setActionState({
        kind: "success",
        message: "Work note recorded in the ticket history.",
      });
      window.location.reload();
    }
  }

  async function submitResolution(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTicket) {
      return;
    }

    if (
      await postAction(selectedTicket.id, "resolve", {
        resolutionNotes,
      })
    ) {
      setResolutionNotes("");
      setActionState({
        kind: "success",
        message: "Resolution recorded. Refreshing your assigned workload.",
      });
      window.location.reload();
    }
  }

  if (tickets.length === 0) {
    return (
      <section
        aria-labelledby="technician-workload-title"
        className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-16 text-center"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
          Assigned Workload
        </span>
        <h2
          id="technician-workload-title"
          className="mt-2 font-display text-2xl font-bold text-white"
        >
          No Tickets Assigned To You
        </h2>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
          Newly assigned tickets from administrators will appear here automatically.
        </p>
      </section>
    );
  }

  return (
    <>
      <section aria-labelledby="technician-workload-title" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
            Active Workload
          </span>
          <h2
            id="technician-workload-title"
            className="mt-1 font-display text-2xl font-bold text-white"
          >
            Your Maintenance Queue
          </h2>
        </div>
        <span className="rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-xs font-bold text-slate-400">
          {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} assigned
        </span>
      </div>

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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const isSelected = ticket.id === selectedTicket?.id;
            const isStarting = busyAction === `${ticket.id}:start`;

            return (
              <article
                key={ticket.id}
                className={`rounded-3xl border bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl transition duration-300 ${
                  isSelected
                    ? "border-sky-500/60 ring-1 ring-sky-500/30"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTicketId(ticket.id);
                    setWorkNote("");
                    setResolutionNotes("");
                    setActionState(null);
                  }}
                  className="w-full text-left focus:outline-none"
                  aria-pressed={isSelected}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Ticket #{ticket.id.slice(0, 8)}
                      </span>
                      <h3 className="mt-1 font-display text-base font-bold text-white">
                        {ticket.title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <TicketPriorityBadge priority={ticket.priority} />
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">{ticket.asset.name}</span> | {ticket.location}
                  </p>
                </button>

                {ticket.status === "ASSIGNED" ? (
                  <button
                    type="button"
                    onClick={() => startWork(ticket.id)}
                    disabled={isStarting}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:brightness-110 disabled:opacity-50"
                  >
                    {isStarting ? "Starting Work..." : "Start Work"}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>

        {selectedTicket ? (
          <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                  Active Ticket Workspace
                </span>
                <h3 className="mt-1 font-display text-xl font-bold text-white">
                  {selectedTicket.title}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <TicketPriorityBadge priority={selectedTicket.priority} />
                <TicketStatusBadge status={selectedTicket.status} />
              </div>
            </div>

            <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <dt className="font-semibold text-slate-400">Asset</dt>
                <dd className="mt-1 font-bold text-slate-100">{selectedTicket.asset.name}</dd>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <dt className="font-semibold text-slate-400">Location</dt>
                <dd className="mt-1 font-bold text-slate-100">{selectedTicket.location}</dd>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <dt className="font-semibold text-slate-400">Reporter</dt>
                <dd className="mt-1 font-bold text-slate-100">{selectedTicket.reporter.name}</dd>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <dt className="font-semibold text-slate-400">Contact Email</dt>
                <dd className="mt-1 break-all font-mono font-semibold text-sky-400">
                  {selectedTicket.reporter.email}
                </dd>
              </div>
            </dl>

            <section className="mt-6" aria-labelledby="reported-issue-title">
              <h4
                id="reported-issue-title"
                className="text-xs font-bold uppercase tracking-wider text-slate-300"
              >
                Reported Symptom Description
              </h4>
              <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs leading-relaxed text-slate-300">
                {selectedTicket.description}
              </div>
            </section>

            {/* AI Diagnostic Assistant & Troubleshooting Guide */}
            {(() => {
              const guide = generateTechnicianDiagnosticGuide(
                selectedTicket.issueType ?? "STRUCTURAL_GENERAL",
                selectedTicket.title,
                selectedTicket.location,
              );

              return (
                <section
                  aria-labelledby="ai-guide-title"
                  className="mt-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-slate-900/90 to-slate-900/90 p-5 shadow-xl backdrop-blur-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-xs text-indigo-400">
                        ⚠
                      </span>
                      <h4 id="ai-guide-title" className="font-display text-sm font-bold text-white">
                        AI Diagnostic & Troubleshooting Guide
                      </h4>
                    </div>
                    <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
                      Est. ~{guide.estimatedTimeMinutes} min repair
                    </span>
                  </div>

                  <div className="mt-4 space-y-4 text-xs">
                    {/* Safety Warnings */}
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
                      <p className="font-bold uppercase tracking-wider text-[10px] text-amber-400">
                        ! ï¸ Required Safety Protocol
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-200">
                        {guide.safetyWarnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Required Tools & Parts Checklist */}
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                        Recommended Tools & Parts
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {guide.requiredTools.map((tool, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-slate-200"
                          >
                            <span className="text-sky-400">OK</span> {tool}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Step-by-Step Troubleshooting Procedure */}
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                        Recommended Diagnostic Steps
                      </p>
                      <ol className="mt-2 space-y-2 text-slate-300">
                        {guide.diagnosticSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5 rounded-lg bg-slate-950/40 p-2 border border-slate-800/60">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-mono text-[10px] font-bold text-indigo-400">
                              {i + 1}
                            </span>
                            <span className="mt-0.5 leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </section>
              );
            })()}

            {selectedTicket.status === "ASSIGNED" ? (
              <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-semibold text-amber-300">
                Click &quot;Start Work&quot; above to begin recording notes or resolving this ticket.
              </div>
            ) : null}

            {selectedTicket.status === "IN_PROGRESS" ? (
              <div className="mt-6 space-y-6">
                <form
                  onSubmit={submitWorkNote}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
                  aria-labelledby="work-note-title"
                >
                  <h4
                    id="work-note-title"
                    className="font-display text-sm font-bold text-white"
                  >
                    Add Progress Note
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Log diagnostics or parts used. Attributed to your account.
                  </p>
                  <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Work completed or findings
                    <textarea
                      required
                      minLength={1}
                      maxLength={2000}
                      rows={3}
                      value={workNote}
                      onChange={(event) => setWorkNote(event.target.value)}
                      className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-sky-500 outline-none"
                      placeholder="Record diagnostics, parts used, or next steps."
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busyAction === `${selectedTicket.id}:note`}
                    className="mt-4 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
                  >
                    {busyAction === `${selectedTicket.id}:note`
                      ? "Saving Note..."
                      : "Save Work Note"}
                  </button>
                </form>

                <form
                  onSubmit={submitResolution}
                  className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"
                  aria-labelledby="resolve-ticket-title"
                >
                  <h4
                    id="resolve-ticket-title"
                    className="font-display text-sm font-bold text-emerald-300"
                  >
                    Resolve Maintenance Ticket
                  </h4>
                  <p className="mt-1 text-xs text-emerald-200/80">
                    A non-empty resolution note is required for audit history.
                  </p>
                  <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Resolution Note
                    <textarea
                      required
                      minLength={1}
                      maxLength={4000}
                      rows={4}
                      value={resolutionNotes}
                      onChange={(event) =>
                        setResolutionNotes(event.target.value)
                      }
                      className="mt-2 block w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-emerald-700 focus:border-emerald-400 outline-none"
                      placeholder="Describe the completed repair, verification, and follow-up."
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busyAction === `${selectedTicket.id}:resolve`}
                    className="mt-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 disabled:opacity-50"
                  >
                    {busyAction === `${selectedTicket.id}:resolve`
                      ? "Resolving Ticket..."
                      : "Save & Complete Resolution"}
                  </button>
                </form>
              </div>
            ) : null}

            {selectedTicket.status === "RESOLVED" ? (
              <section
                aria-labelledby="resolution-title"
                className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"
              >
                <h4
                  id="resolution-title"
                  className="font-display text-sm font-bold text-emerald-300"
                >
                  Resolution Recorded
                </h4>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-emerald-200">
                  {selectedTicket.resolutionNotes}
                </p>
              </section>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>

    <section
      aria-labelledby="technician-maintenance-plans-title"
      className="mt-10 space-y-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
            Preventive Maintenance
          </span>
          <h2
            id="technician-maintenance-plans-title"
            className="mt-1 font-display text-2xl font-bold text-white"
          >
            Your Maintenance Plans
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Review the maintenance activities assigned to your assets.
          </p>
        </div>

        <span className="rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-xs font-bold text-slate-400">
          {maintenancePlans.length}{" "}
          {maintenancePlans.length === 1 ? "plan" : "plans"} assigned
        </span>
      </div>

      {maintenancePlans.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
          <h3 className="font-display text-lg font-bold text-white">
            No Maintenance Plans Assigned
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            Maintenance plans assigned to you by an administrator will appear
            here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {maintenancePlans.map((plan) => {
            const isOverdue =
              plan.status === "ACTIVE" &&
              new Date(plan.nextDueAt).getTime() < Date.now();

            const displayStatus = isOverdue ? "OVERDUE" : plan.status;

            const statusClass =
              displayStatus === "OVERDUE"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                : displayStatus === "CANCELLED"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : displayStatus === "PAUSED"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

            const nextDue = new Date(plan.nextDueAt).toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              },
            );

            const formatEnum = (value: string) =>
              value
                .replaceAll("_", " ")
                .toLowerCase()
                .replace(/\b\w/g, (letter) => letter.toUpperCase());

            return (
              <article
                key={plan.id}
                className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Maintenance Plan
                    </span>

                    <h3 className="mt-1 font-display text-base font-bold text-white">
                      {plan.title}
                    </h3>

                    <p className="mt-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-200">
                        {plan.asset.name}
                      </span>
                      {" · "}
                      {plan.asset.location}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-lg border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${statusClass}`}
                  >
                    {displayStatus}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                      Type
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-300">
                      {formatEnum(plan.type)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                      Frequency
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-300">
                      {formatEnum(plan.frequency)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                      Priority
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-300">
                      {formatEnum(plan.priority)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                      Next Due
                    </p>
                    <p
                      className={`mt-1 text-xs font-semibold ${
                        isOverdue ? "text-rose-300" : "text-slate-300"
                      }`}
                    >
                      {nextDue}
                    </p>
                  </div>
                </div>

                {plan.description ? (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                      Description
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {plan.description}
                    </p>
                  </div>
                ) : null}

                {plan.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() => completeMaintenancePlan(plan.id)}
                    disabled={completingPlanId === plan.id}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {completingPlanId === plan.id
                      ? "Completing Maintenance..."
                      : "Complete Maintenance"}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      </section>
    </>
  );
}