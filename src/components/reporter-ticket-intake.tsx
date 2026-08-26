"use client";

import type { AiTriageRecommendation } from "@/src/lib/validation/tickets";
import type { Priority, TicketStatus } from "@prisma/client";
import { useState, type FormEvent } from "react";

import { TicketPriorityBadge, TicketStatusBadge } from "@/src/components/ticket-badges";

type AssetOption = {
  id: string;
  name: string;
  type: string;
  location: string;
};

type NewAssetValues = {
  name: string;
  type: string;
  location: string;
};

type IntakeValues = {
  title: string;
  description: string;
  location: string;
  assetId: string;
  newAsset: NewAssetValues | null;
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
  fieldErrors?: Partial<Record<keyof IntakeValues | "newAsset", string>>;
};

const initialValues: IntakeValues = {
  title: "",
  description: "",
  location: "",
  assetId: "",
  newAsset: null,
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
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [showAssetOptions, setShowAssetOptions] = useState(false);
  const [addingNewAsset, setAddingNewAsset] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof IntakeValues | "newAsset", string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(true);

  useState(() => {
    let cancelled = false;

    fetch("/api/reporter-assets")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load assets.");
        }

        return (await response.json()) as { assets: AssetOption[] };
      })
      .then((payload) => {
        if (!cancelled) {
          setAssets(payload.assets);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFormError("Unable to load the asset list. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAssetsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  });

  function updateValue(
    field: keyof IntakeValues,
    value: string,
  ): void {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));

    setFormError(null);
  }

  function selectAsset(asset: AssetOption): void {
    setValues((currentValues) => ({
      ...currentValues,
      assetId: asset.id,
      newAsset: null,
    }));

    setAssetSearch(asset.name);
    setAddingNewAsset(false);
    setShowAssetOptions(false);
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      assetId: undefined,
      newAsset: undefined,
    }));
    setFormError(null);
  }

  function startNewAsset(): void {
    setValues((currentValues) => ({
      ...currentValues,
      assetId: "",
      newAsset: {
        name: assetSearch.trim(),
        type: "",
        location: currentValues.location,
      },
    }));

    setAddingNewAsset(true);
    setShowAssetOptions(false);
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      assetId: undefined,
      newAsset: undefined,
    }));
    setFormError(null);
  }

  function updateNewAsset(
    field: keyof NewAssetValues,
    value: string,
  ): void {
    setValues((currentValues) => ({
      ...currentValues,
      newAsset: {
        ...(currentValues.newAsset ?? {
          name: "",
          type: "",
          location: "",
        }),
        [field]: value,
      },
    }));

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      newAsset: undefined,
    }));

    setFormError(null);
  }

  async function submitTicket(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setResult(null);

    if (!values.assetId && !values.newAsset) {
      setFieldErrors({
        assetId: "Select an asset or add a new asset.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as
        | SubmissionResult
        | ApiFailure;

      if (!response.ok) {
        const failure = payload as ApiFailure;
        setFieldErrors(failure.fieldErrors ?? {});
        setFormError(getErrorMessage(failure));
        return;
      }

      setResult(payload as SubmissionResult);
      setValues(initialValues);
      setAssetSearch("");
      setAddingNewAsset(false);
    } catch {
      setFormError(
        "Your issue could not be submitted because the service is unavailable. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredAssets = assets.filter((asset) =>
    `${asset.name} ${asset.type} ${asset.location}`
      .toLowerCase()
      .includes(assetSearch.trim().toLowerCase()),
  );
  return (
    <section
      aria-labelledby="report-issue-title"
      className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl sm:p-8"
    >
      <div className="max-w-2xl">
        <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
          New Maintenance Request
        </span>
        <h2 id="report-issue-title" className="mt-1 font-display text-2xl font-bold text-white">
          Report an Issue
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Provide issue details and location. MaintainIQ processes these facts server-side to determine priority, classify the issue, and link assets automatically.
        </p>
      </div>

      <form className="mt-6 space-y-6" onSubmit={submitTicket} noValidate>
        <div>
          <label
            htmlFor="ticket-title"
            className="block text-xs font-bold uppercase tracking-wider text-slate-300"
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
            className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="For example, Water leaking near kitchen sink"
          />
          {fieldErrors.title ? (
            <p id="ticket-title-error" className="mt-2 text-xs font-semibold text-rose-400">
              {fieldErrors.title}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="ticket-location"
            className="block text-xs font-bold uppercase tracking-wider text-slate-300"
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
            className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="For example, Building A · 1st Floor Washroom"
          />
          {fieldErrors.location ? (
            <p id="ticket-location-error" className="mt-2 text-xs font-semibold text-rose-400">
              {fieldErrors.location}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="ticket-asset"
            className="block text-xs font-bold uppercase tracking-wider text-slate-300"
          >
            Asset
          </label>

          <div className="relative mt-2">
            <input
              id="ticket-asset"
              name="asset"
              type="text"
              value={assetSearch}
              onChange={(event) => {
                setAssetSearch(event.target.value);
                setValues((currentValues) => ({
                  ...currentValues,
                  assetId: "",
                  newAsset: null,
                }));
                setAddingNewAsset(false);
                setShowAssetOptions(true);
                setFieldErrors((currentErrors) => ({
                  ...currentErrors,
                  assetId: undefined,
                  newAsset: undefined,
                }));
              }}
              onFocus={() => setShowAssetOptions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowAssetOptions(false), 150);
              }}
              disabled={isSubmitting || assetsLoading}
              autoComplete="off"
              placeholder={
                assetsLoading
                  ? "Loading assets..."
                  : "Type to search for an asset"
              }
              className="block w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            />

            {showAssetOptions && !addingNewAsset ? (
              <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-2xl">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectAsset(asset)}
                      className="block w-full rounded-lg px-3 py-2 text-left transition hover:bg-slate-800"
                    >
                      <span className="block text-sm font-semibold text-white">
                        {asset.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {asset.type} · {asset.location}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3">
                    <p className="text-xs text-slate-400">
                      No matching asset found.
                    </p>

                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={startNewAsset}
                      className="mt-2 text-xs font-bold text-sky-400 hover:text-sky-300"
                    >
                      + Add new asset
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {addingNewAsset && values.newAsset ? (
            <div className="mt-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  New Asset
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setAddingNewAsset(false);
                    setValues((currentValues) => ({
                      ...currentValues,
                      assetId: "",
                      newAsset: null,
                    }));
                    setAssetSearch("");
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={values.newAsset.name}
                  onChange={(event) =>
                    updateNewAsset("name", event.target.value)
                  }
                  disabled={isSubmitting}
                  placeholder="Asset name"
                  className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500"
                />

                <input
                  type="text"
                  value={values.newAsset.type}
                  onChange={(event) =>
                    updateNewAsset("type", event.target.value)
                  }
                  disabled={isSubmitting}
                  placeholder="Asset type"
                  className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500"
                />

                <input
                  type="text"
                  value={values.newAsset.location}
                  onChange={(event) =>
                    updateNewAsset("location", event.target.value)
                  }
                  disabled={isSubmitting}
                  placeholder="Asset location"
                  className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500 sm:col-span-2"
                />
              </div>
            </div>
          ) : null}

          {fieldErrors.assetId ? (
            <p className="mt-2 text-xs font-semibold text-rose-400">
              {fieldErrors.assetId}
            </p>
          ) : null}

          {fieldErrors.newAsset ? (
            <p className="mt-2 text-xs font-semibold text-rose-400">
              {fieldErrors.newAsset}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="ticket-description"
            className="block text-xs font-bold uppercase tracking-wider text-slate-300"
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
            rows={5}
            className="mt-2 block w-full resize-y rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Include symptoms, safety concerns, when it started, or steps already taken."
          />
          {fieldErrors.description ? (
            <p id="ticket-description-error" className="mt-2 text-xs font-semibold text-rose-400">
              {fieldErrors.description}
            </p>
          ) : null}
        </div>

        {formError ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300"
          >
            {formError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition duration-300 hover:shadow-sky-500/40 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing and submitting…
            </span>
          ) : (
            "Submit Issue for Triage"
          )}
        </button>
      </form>

      {result ? (
        <div
          aria-live="polite"
          className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 backdrop-blur-md"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-base font-bold text-emerald-300">
                Issue Submitted Successfully!
              </p>
              <p className="mt-1 text-xs text-emerald-200">
                Ticket #{result.ticket.id.slice(0, 8)} is now tracked in your workload below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TicketPriorityBadge priority={result.ticket.priority} />
              <TicketStatusBadge status={result.ticket.status} />
            </div>
          </div>

          <dl className="mt-5 grid gap-4 text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 p-3">
              <dt className="font-bold uppercase text-emerald-400">Suggested Issue Type</dt>
              <dd className="mt-1 font-semibold text-emerald-100">
                {result.analysis.issue_type.replaceAll("_", " ")}
              </dd>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 p-3">
              <dt className="font-bold uppercase text-emerald-400">Asset Linked</dt>
              <dd className="mt-1 font-semibold text-emerald-100">
                {result.assetCreated
                  ? "New relevant asset created for this location."
                  : "Linked to existing location asset."}
              </dd>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 p-3 sm:col-span-2">
              <dt className="font-bold uppercase text-emerald-400">Suggested Next Action</dt>
              <dd className="mt-1 font-semibold text-emerald-100">
                {result.analysis.suggested_action}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
