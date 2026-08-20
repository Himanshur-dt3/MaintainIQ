"use client";

import type { Priority, TicketStatus } from "@prisma/client";
import { useState } from "react";

import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/src/components/ticket-badges";

type TechnicianTicket = {
  id: string;
  title: string;
  description: string;
  location: string;
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

type TechnicianTicketWorkspaceProps = {
  tickets: TechnicianTicket[];
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
}: TechnicianTicketWorkspaceProps) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    tickets[0]?.id ?? null,
  );
  const [workNote, setWorkNote] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);

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
        className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
          Assigned workload
        </p>
        <h2
          id="technician-workload-title"
          className="mt-2 text-xl font-bold text-slate-950"
        >
          No tickets are assigned to you
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Tickets assigned by an administrator will appear here. Your workload
          is always scoped by the server to your own assignments.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="technician-workload-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
            Assigned workload
          </p>
          <h2
            id="technician-workload-title"
            className="mt-2 text-2xl font-bold text-slate-950"
          >
            Your maintenance queue
          </h2>
        </div>
        <p className="text-sm text-slate-600">
          {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} assigned
        </p>
      </div>

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

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const isSelected = ticket.id === selectedTicket?.id;
            const isStarting = busyAction === `${ticket.id}:start`;

            return (
              <article
                key={ticket.id}
                className={`rounded-xl border bg-white p-5 shadow-sm transition ${
                  isSelected
                    ? "border-sky-400 ring-1 ring-sky-200"
                    : "border-slate-200"
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
                  className="w-full text-left focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2"
                  aria-pressed={isSelected}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Ticket #{ticket.id.slice(0, 8)}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-950">
                        {ticket.title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <TicketPriorityBadge priority={ticket.priority} />
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {ticket.asset.name} · {ticket.location}
                  </p>
                </button>

                {ticket.status === "ASSIGNED" ? (
                  <button
                    type="button"
                    onClick={() => startWork(ticket.id)}
                    disabled={isStarting}
                    className="mt-4 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isStarting ? "Starting work…" : "Start work"}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>

        {selectedTicket ? (
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Active ticket
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">
                  {selectedTicket.title}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <TicketPriorityBadge priority={selectedTicket.priority} />
                <TicketStatusBadge status={selectedTicket.status} />
              </div>
            </div>

            <dl className="mt-5 grid gap-4 border-y border-slate-100 py-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium text-slate-500">Asset</dt>
                <dd className="mt-1 text-slate-900">
                  {selectedTicket.asset.name}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Location</dt>
                <dd className="mt-1 text-slate-900">
                  {selectedTicket.location}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Reporter</dt>
                <dd className="mt-1 text-slate-900">
                  {selectedTicket.reporter.name}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Reporter contact</dt>
                <dd className="mt-1 break-all text-slate-900">
                  {selectedTicket.reporter.email}
                </dd>
              </div>
            </dl>

            <section className="mt-5" aria-labelledby="reported-issue-title">
              <h4
                id="reported-issue-title"
                className="text-sm font-semibold text-slate-900"
              >
                Reported issue
              </h4>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {selectedTicket.description}
              </p>
            </section>

            {selectedTicket.status === "ASSIGNED" ? (
              <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                Start work before recording notes or resolving this ticket.
              </div>
            ) : null}

            {selectedTicket.status === "IN_PROGRESS" ? (
              <div className="mt-6 grid gap-6">
                <form
                  onSubmit={submitWorkNote}
                  className="rounded-xl border border-slate-200 p-5"
                  aria-labelledby="work-note-title"
                >
                  <h4
                    id="work-note-title"
                    className="text-base font-semibold text-slate-950"
                  >
                    Add work note
                  </h4>
                  <p className="mt-1 text-sm text-slate-600">
                    Notes are attributed to you and retained in the ticket history.
                  </p>
                  <label className="mt-4 grid gap-1.5 text-sm font-medium text-slate-700">
                    Work completed or findings
                    <textarea
                      required
                      minLength={1}
                      maxLength={2000}
                      rows={4}
                      value={workNote}
                      onChange={(event) => setWorkNote(event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-slate-950"
                      placeholder="Record diagnostics, parts used, or the next planned step."
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busyAction === `${selectedTicket.id}:note`}
                    className="mt-4 rounded-lg border border-sky-700 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                  >
                    {busyAction === `${selectedTicket.id}:note`
                      ? "Saving note…"
                      : "Save work note"}
                  </button>
                </form>

                <form
                  onSubmit={submitResolution}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"
                  aria-labelledby="resolve-ticket-title"
                >
                  <h4
                    id="resolve-ticket-title"
                    className="text-base font-semibold text-slate-950"
                  >
                    Resolve ticket
                  </h4>
                  <p className="mt-1 text-sm text-slate-700">
                    A non-empty resolution note is required and becomes part of
                    the durable audit record.
                  </p>
                  <label className="mt-4 grid gap-1.5 text-sm font-medium text-slate-700">
                    Resolution note
                    <textarea
                      required
                      minLength={1}
                      maxLength={4000}
                      rows={5}
                      value={resolutionNotes}
                      onChange={(event) =>
                        setResolutionNotes(event.target.value)
                      }
                      className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-slate-950"
                      placeholder="Describe the completed repair, verification, and any follow-up."
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busyAction === `${selectedTicket.id}:resolve`}
                    className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {busyAction === `${selectedTicket.id}:resolve`
                      ? "Resolving ticket…"
                      : "Save resolution"}
                  </button>
                </form>
              </div>
            ) : null}

            {selectedTicket.status === "RESOLVED" ? (
              <section
                aria-labelledby="resolution-title"
                className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5"
              >
                <h4
                  id="resolution-title"
                  className="text-base font-semibold text-emerald-950"
                >
                  Resolution recorded
                </h4>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-900">
                  {selectedTicket.resolutionNotes}
                </p>
              </section>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}
