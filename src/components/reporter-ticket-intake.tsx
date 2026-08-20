"use client";

import type { AiTriageRecommendation } from "@/src/lib/validation/tickets";
import type { Priority, TicketStatus } from "@prisma/client";
import { useState, type FormEvent } from "react";

import { TicketPriorityBadge, TicketStatusBadge } from "@/src/components/ticket-badges";

type IntakeValues = {
  title: string;
  description: string;
  location: string;
};

type SubmissionResult = {
  ticket: {
    id: string;
    title: string;
    location: string;
    status: TicketStatus;
    priority: Priority;
  };
  analysis: AiTriageRecommendation;
  assetCreated: boolean;
};

type ApiFailure = {
  error?: string;
  fieldErrors?: Partial<Record<keyof IntakeValues, string>>;
};

const initialValues: IntakeValues = {
  title: "",
  description: "",
  location: "",
};

function getErrorMessage(payload: ApiFailure): string {
  return payload.error ?? "Unable to submit the issue right now. Please try again.";
}

/**
 * Collects reporter-provided issue facts and submits them for server-side AI
 * triage. Classification, priority, and asset choice are never client inputs.
 *
 * @returns An accessible reporter issue submission form and controlled outcome.
 */
export function ReporterTicketIntake() {
  const [values, setValues] = useState<IntakeValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof IntakeValues, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateValue(field: keyof IntakeValues, value: string): void {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
    setFormError(null);
  }

  async function submitTicket(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as SubmissionResult | ApiFailure;

      if (!response.ok) {
        const failure = payload as ApiFailure;
        setFieldErrors(failure.fieldErrors ?? {});
        setFormError(getErrorMessage(failure));
        return;
      }

      setResult(payload as SubmissionResult);
      setValues(initialValues);
    } catch {
      setFormError(
        "Your issue could not be submitted because the service is unavailable. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="report-issue-title"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
          New maintenance request
        </p>
        <h2 id="report-issue-title" className="mt-2 text-2xl font-bold text-slate-950">
          Report an issue
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Tell us what happened and where. MaintainIQ securely sends these facts
          for server-side triage to suggest the issue type, priority, asset, and
          next action.
        </p>
      </div>

      <form className="mt-6 space-y-5" onSubmit={submitTicket} noValidate>
        <div>
          <label
            htmlFor="ticket-title"
            className="block text-sm font-semibold text-slate-800"
          >
            What needs attention?
          </label>
          <input
            id="ticket-title"
            name="title"
            type="text"
            value={values.title}
            onChange={(event) => updateValue("title", event.target.value)}
            aria-describedby={fieldErrors.title ? "ticket-title-error" : undefined}
            aria-invalid={Boolean(fieldErrors.title)}
            disabled={isSubmitting}
            maxLength={160}
            required
            className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 disabled:cursor-not-allowed disabled:bg-slate-100"
            placeholder="For example, water is leaking below the kitchen sink"
          />
          {fieldErrors.title ? (
            <p id="ticket-title-error" className="mt-2 text-sm text-rose-700">
              {fieldErrors.title}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="ticket-location"
            className="block text-sm font-semibold text-slate-800"
          >
            Where is the issue?
          </label>
          <input
            id="ticket-location"
            name="location"
            type="text"
            value={values.location}
            onChange={(event) => updateValue("location", event.target.value)}
            aria-describedby={fieldErrors.location ? "ticket-location-error" : undefined}
            aria-invalid={Boolean(fieldErrors.location)}
            disabled={isSubmitting}
            maxLength={160}
            required
            className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 disabled:cursor-not-allowed disabled:bg-slate-100"
            placeholder="For example, Building A · Kitchen 2"
          />
          {fieldErrors.location ? (
            <p id="ticket-location-error" className="mt-2 text-sm text-rose-700">
              {fieldErrors.location}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="ticket-description"
            className="block text-sm font-semibold text-slate-800"
          >
            Describe what you observed
          </label>
          <textarea
            id="ticket-description"
            name="description"
            value={values.description}
            onChange={(event) => updateValue("description", event.target.value)}
            aria-describedby={
              fieldErrors.description ? "ticket-description-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.description)}
            disabled={isSubmitting}
            maxLength={5000}
            minLength={10}
            required
            rows={6}
            className="mt-2 block w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 disabled:cursor-not-allowed disabled:bg-slate-100"
            placeholder="Include symptoms, when it started, any safety concerns, and what you have already tried."
          />
          {fieldErrors.description ? (
            <p id="ticket-description-error" className="mt-2 text-sm text-rose-700">
              {fieldErrors.description}
            </p>
          ) : null}
        </div>

        {formError ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {formError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 disabled:cursor-wait disabled:bg-sky-400"
        >
          {isSubmitting ? "Submitting for triage…" : "Submit issue"}
        </button>
      </form>

      {result ? (
        <div
          aria-live="polite"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Issue submitted successfully
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                Ticket #{result.ticket.id.slice(0, 8)} is now visible in Your
                tickets below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TicketPriorityBadge priority={result.ticket.priority} />
              <TicketStatusBadge status={result.ticket.status} />
            </div>
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-emerald-900">Suggested issue type</dt>
              <dd className="mt-1 text-emerald-950">
                {result.analysis.issue_type.replaceAll("_", " ")}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-emerald-900">Asset outcome</dt>
              <dd className="mt-1 text-emerald-950">
                {result.assetCreated
                  ? "A relevant asset was added for this report."
                  : "A relevant existing asset was linked."}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-emerald-900">Suggested next action</dt>
              <dd className="mt-1 text-emerald-950">
                {result.analysis.suggested_action}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
